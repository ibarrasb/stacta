package com.stacta.api.note;

import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.note.dto.NoteDto;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class NoteService {

  private final NoteRepository notes;
  private final JdbcTemplate jdbc;
  private static final Pattern ALLOWED_NOTE_PATTERN =
    Pattern.compile("^[A-Za-z0-9][A-Za-z0-9 '&/().,\\-]{1,79}$");
  private static final int MAX_NEW_CUSTOM_NOTES_PER_MINUTE = 3;
  private static final int MAX_NEW_CUSTOM_NOTES_PER_DAY = 25;
  private static final Set<String> BLOCKED_TERMS = Set.of(
    "penis", "dick", "cock", "tit", "tits", "boob", "boobs",
    "pussy", "cum", "semen", "fuck", "fucking", "shit", "bitch", "asshole"
  );

  public NoteService(NoteRepository notes, JdbcTemplate jdbc) {
    this.notes = notes;
    this.jdbc = jdbc;
  }

  public List<NoteDto> search(String q, int limit) {
    int safe = Math.min(Math.max(limit, 1), 50);
    String needle = q == null ? "" : q.trim();
    if (needle.isBlank()) return List.of();

    return notes.searchByNameContains(
        needle, PageRequest.of(0, safe)
      )
      .stream()
      .map(this::toDto)
      .toList();
  }

  public List<NoteDto> popular(int limit) {
    int safe = Math.min(Math.max(limit, 1), 200);
    return notes.findAllByOrderByUsageCountDescNameAsc(PageRequest.of(0, safe)).stream()
      .map(this::toDto)
      .toList();
  }

  @Transactional
  public void incrementUsage(UUID noteId) {
    notes.findById(noteId).ifPresent(n -> {
      int next = (n.getUsageCount() == null ? 0 : n.getUsageCount()) + 1;
      n.setUsageCount(next);
      notes.save(n);
    });
  }

  @Transactional
  public NoteEntity upsertFromFragella(String name, String imageUrl) {
    String normalized = normalize(name);
    if (normalized.isBlank()) return null;

    var existing = notes.findByNormalizedName(normalized).orElse(null);
    if (existing != null) {
      // Keep freshest imageUrl if we get one
      if ((existing.getImageUrl() == null || existing.getImageUrl().isBlank()) && imageUrl != null) {
        existing.setImageUrl(imageUrl);
      }
      if (existing.getName() == null || existing.getName().isBlank()) {
        existing.setName(name);
      }
      return notes.save(existing);
    }

    var n = new NoteEntity();
    n.setName(name);
    n.setNormalizedName(normalized);
    n.setImageUrl(imageUrl);
    n.setUsageCount(0);
    return notes.save(n);
  }

  @Transactional
  public NoteEntity upsertFromUserInput(String name, UUID userId) {
    if (userId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is required to create custom notes.");
    }
    String cleaned = sanitizeUserNoteName(name);
    String normalized = normalize(cleaned);

    var exact = notes.findByNormalizedName(normalized).orElse(null);
    if (exact != null) return exact;

    var near = findNearDuplicate(normalized, cleaned);
    if (near != null) return near;

    enforceCreateRateLimit(userId);

    var n = new NoteEntity();
    n.setName(cleaned);
    n.setNormalizedName(normalized);
    n.setImageUrl(null);
    n.setUsageCount(0);
    NoteEntity saved;
    try {
      // We insert into a JDBC audit table immediately after; flush guarantees FK visibility.
      saved = notes.saveAndFlush(n);
    } catch (DataIntegrityViolationException e) {
      // Concurrent create can hit unique(normalized_name). Re-read and reuse.
      var existing = notes.findByNormalizedName(normalized).orElse(null);
      if (existing != null) return existing;
      throw e;
    }
    jdbc.update(
      "INSERT INTO user_custom_note_creation_event (user_id, note_id, normalized_name) VALUES (?, ?, ?)",
      userId,
      saved.getId(),
      normalized
    );
    return saved;
  }

  @Transactional
  public void ingestNotesFromFragella(List<FragellaDtos.Fragrance> items) {
    if (items == null || items.isEmpty()) return;

    for (var f : items) {
      var notesObj = f.notes();
      if (notesObj == null) continue;

      ingestList(notesObj.top());
      ingestList(notesObj.middle());
      ingestList(notesObj.base());
    }
  }

  private void ingestList(List<FragellaDtos.Note> list) {
    if (list == null) return;
    for (var n : list) {
      if (n == null) continue;
      if (n.name() == null || n.name().isBlank()) continue;
      upsertFromFragella(n.name().trim(), n.imageUrl());
    }
  }

  private NoteDto toDto(NoteEntity e) {
    return new NoteDto(e.getId(), e.getName(), e.getImageUrl(), e.getUsageCount());
  }

  public static String normalize(String s) {
    if (s == null) return "";
    String t = s.trim().toLowerCase(Locale.ROOT);
    t = Normalizer.normalize(t, Normalizer.Form.NFKD).replaceAll("\\p{M}", "");
    t = t.replaceAll("[^a-z0-9\\s-]", " ");
    t = t.replaceAll("\\s+", " ").trim();
    return t;
  }

  private String sanitizeUserNoteName(String raw) {
    String cleaned = raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
    if (cleaned.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note name cannot be blank.");
    }
    if (!ALLOWED_NOTE_PATTERN.matcher(cleaned).matches()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note name contains unsupported characters.");
    }

    String normalized = normalize(cleaned);
    if (normalized.length() < 2) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note name is too short.");
    }
    if (normalized.split(" ").length > 5) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note name is too long.");
    }
    if (normalized.matches(".*(.)\\1{3,}.*")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note name looks invalid.");
    }

    for (String token : normalized.split(" ")) {
      if (BLOCKED_TERMS.contains(token)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note name is not allowed.");
      }
    }
    return cleaned;
  }

  private NoteEntity findNearDuplicate(String normalized, String cleaned) {
    Set<UUID> seen = new HashSet<>();
    List<NoteEntity> candidates = new ArrayList<>();

    String prefix = normalized.substring(0, Math.min(4, normalized.length()));
    if (prefix.length() >= 2) {
      candidates.addAll(notes.findTop40ByNormalizedNameStartingWithOrderByUsageCountDescNameAsc(prefix));
    }

    String firstToken = normalized.contains(" ")
      ? normalized.substring(0, normalized.indexOf(' '))
      : normalized;
    if (firstToken.length() >= 2) {
      candidates.addAll(notes.searchByNameContains(firstToken, PageRequest.of(0, 40)));
    }
    candidates.addAll(notes.searchByNameContains(cleaned, PageRequest.of(0, 20)));

    NoteEntity best = null;
    int bestDistance = Integer.MAX_VALUE;
    int bestUsage = -1;
    for (NoteEntity candidate : candidates) {
      if (candidate == null || candidate.getId() == null || !seen.add(candidate.getId())) continue;
      String candidateNormalized = normalize(candidate.getName());
      if (candidateNormalized.isBlank()) continue;

      int maxLen = Math.max(normalized.length(), candidateNormalized.length());
      int distance = levenshtein(normalized, candidateNormalized);
      double similarity = maxLen == 0 ? 1d : 1d - (distance / (double) maxLen);

      boolean near = (maxLen <= 8 && distance <= 1)
        || (maxLen > 8 && distance <= 2)
        || similarity >= 0.88d;
      if (!near) continue;

      int usage = candidate.getUsageCount() == null ? 0 : candidate.getUsageCount();
      if (distance < bestDistance || (distance == bestDistance && usage > bestUsage)) {
        best = candidate;
        bestDistance = distance;
        bestUsage = usage;
      }
    }
    return best;
  }

  private void enforceCreateRateLimit(UUID userId) {
    Integer minuteCount = jdbc.queryForObject(
      """
      SELECT COUNT(*)
      FROM user_custom_note_creation_event
      WHERE user_id = ?
        AND created_at >= now() - interval '1 minute'
      """,
      Integer.class,
      userId
    );
    if ((minuteCount == null ? 0 : minuteCount) >= MAX_NEW_CUSTOM_NOTES_PER_MINUTE) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many custom notes. Try again in a minute.");
    }

    Integer dayCount = jdbc.queryForObject(
      """
      SELECT COUNT(*)
      FROM user_custom_note_creation_event
      WHERE user_id = ?
        AND created_at >= now() - interval '1 day'
      """,
      Integer.class,
      userId
    );
    if ((dayCount == null ? 0 : dayCount) >= MAX_NEW_CUSTOM_NOTES_PER_DAY) {
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Custom note limit reached for today.");
    }
  }

  private static int levenshtein(String a, String b) {
    int[] prev = new int[b.length() + 1];
    int[] curr = new int[b.length() + 1];
    for (int j = 0; j <= b.length(); j++) prev[j] = j;

    for (int i = 1; i <= a.length(); i++) {
      curr[0] = i;
      for (int j = 1; j <= b.length(); j++) {
        int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          Math.min(curr[j - 1] + 1, prev[j] + 1),
          prev[j - 1] + cost
        );
      }
      int[] tmp = prev;
      prev = curr;
      curr = tmp;
    }
    return prev[b.length()];
  }

  public Map<UUID, NoteEntity> getByIds(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) return Map.of();
    var unique = ids.stream().filter(Objects::nonNull).distinct().toList();
    return notes.findAllById(unique).stream().collect(Collectors.toMap(NoteEntity::getId, x -> x));
  }
}
