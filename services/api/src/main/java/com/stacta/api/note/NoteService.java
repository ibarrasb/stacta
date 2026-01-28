package com.stacta.api.note;

import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.note.dto.NoteDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NoteService {

  private final NoteRepository notes;

  public NoteService(NoteRepository notes) {
    this.notes = notes;
  }

  public List<NoteDto> search(String q, int limit) {
    int safe = Math.min(Math.max(limit, 1), 50);
    String needle = q == null ? "" : q.trim();
    if (needle.isBlank()) return List.of();

    return notes.findByNameContainingIgnoreCaseOrderByUsageCountDescNameAsc(
        needle, PageRequest.of(0, safe)
      )
      .stream()
      .map(this::toDto)
      .toList();
  }

  public List<NoteDto> popular(int limit) {
    int safe = Math.min(Math.max(limit, 1), 200);
    return notes.findAll(PageRequest.of(0, safe)).stream()
      .sorted(Comparator.comparing(NoteEntity::getUsageCount, Comparator.nullsLast(Comparator.reverseOrder()))
        .thenComparing(NoteEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
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

  public Map<UUID, NoteEntity> getByIds(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) return Map.of();
    var unique = ids.stream().filter(Objects::nonNull).distinct().toList();
    return notes.findAllById(unique).stream().collect(Collectors.toMap(NoteEntity::getId, x -> x));
  }
}
