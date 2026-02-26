package com.stacta.api.fragrance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.CreateCommunityFragranceRequest;
import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.fragrance.dto.NoteDto;   // IMPORTANT: fragrance.dto.NoteDto
import com.stacta.api.fragrance.dto.NotesDto;  // IMPORTANT: fragrance.dto.NotesDto
import com.stacta.api.note.NoteEntity;
import com.stacta.api.note.NoteRepository;
import com.stacta.api.note.NoteService;
import com.stacta.api.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CommunityFragranceService {

  private final FragranceRepository fragrances;
  private final UserRepository users;
  private final NoteRepository notes;
  private final NoteService noteService;
  private final JdbcTemplate jdbc;
  private final ObjectMapper om;

  private static String scoreLabel(Integer s) {
    return s == null ? null : (s + "/5");
  }

  public CommunityFragranceService(
    FragranceRepository fragrances,
    UserRepository users,
    NoteRepository notes,
    NoteService noteService,
    JdbcTemplate jdbc,
    ObjectMapper om
  ) {
    this.fragrances = fragrances;
    this.users = users;
    this.notes = notes;
    this.noteService = noteService;
    this.jdbc = jdbc;
    this.om = om;
  }

  @Transactional
  public FragranceSearchResult create(CreateCommunityFragranceRequest req, String cognitoSub) {
    var user = users.findByCognitoSub(cognitoSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));

    String brand = safe(req.brand());
    String name  = safe(req.name());
    if (brand.isBlank() || name.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "brand and name are required");
    }

    String year = (req.year() == null || req.year().isBlank()) ? "0" : req.year().trim();
    String visibility = normalizeVisibility(req.visibility());
    String concentration = (req.concentration() == null || req.concentration().isBlank())
      ? null
      : req.concentration().trim();
    String imageUrl = normalizeImageUrl(req.imageUrl());
    String purchaseUrl = normalizePurchaseUrl(req.purchaseUrl());
    String confidence = normalizeOptional(req.confidence());
    String popularity = normalizeOptional(req.popularity());
    List<String> mainAccords = normalizeAccords(req.mainAccords());
    Map<String, String> mainAccordsPercentage = normalizeAccordStrengths(req.mainAccordsPercentage(), mainAccords);

    // stable COMMUNITY externalId (so duplicates collide)
    String externalId = normalizeKey(brand) + "|" + normalizeKey(name) + "|" + year +
      (concentration == null ? "" : "|" + normalizeKey(concentration));

    // Fetch note entities (preserve order)
    List<NoteEntity> top    = resolveNotes(req.topNoteIds(), req.topNoteNames(), user.getId());
    List<NoteEntity> middle = resolveNotes(req.middleNoteIds(), req.middleNoteNames(), user.getId());
    List<NoteEntity> base   = resolveNotes(req.baseNoteIds(), req.baseNoteNames(), user.getId());

    // Build response snapshot
    FragranceSearchResult snapshot = buildSnapshot(
      externalId,
      name,
      brand,
      year,
      imageUrl,
      purchaseUrl,
      concentration,
      req.longevityScore(),
      req.sillageScore(),
      confidence,
      popularity,
      mainAccords,
      mainAccordsPercentage,
      visibility,
      toNoteDtos(top),
      toNoteDtos(middle),
      toNoteDtos(base),
      user.getId(),
      user.getUsername()
    );

    // Persist fragrance row
    Fragrance f = new Fragrance();
    f.setExternalSource("COMMUNITY");
    f.setExternalId(externalId);
    f.setName(name);
    f.setBrand(brand);
    f.setYear(year.equals("0") ? null : year);
    f.setImageUrl(imageUrl);

    f.setCreatedByUserId(user.getId());
    f.setVisibility(visibility);

    // optional community metrics (only if your entity has these fields)
    f.setConcentration(concentration);
    f.setLongevityScore(req.longevityScore());
    f.setSillageScore(req.sillageScore());

    f.setCreatedAt(OffsetDateTime.now());
    f.setUpdatedAt(OffsetDateTime.now());

    try {
      f.setSnapshot(om.writeValueAsString(snapshot));
    } catch (Exception e) {
      f.setSnapshot("{}");
    }

    Fragrance saved;
    try {
      saved = fragrances.saveAndFlush(f);
    } catch (DataIntegrityViolationException e) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "A community fragrance with the same brand/name/year/concentration already exists."
      );
    }

    // Insert junction rows + bump usage_count
    insertFragranceNotes(saved.getId(), top, "TOP");
    insertFragranceNotes(saved.getId(), middle, "MIDDLE");
    insertFragranceNotes(saved.getId(), base, "BASE");

    return snapshot;
  }

  @Transactional
  public FragranceSearchResult update(String externalId, CreateCommunityFragranceRequest req, String cognitoSub) {
    var user = users.findByCognitoSub(cognitoSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));

    String ext = normalizeKey(externalId);
    var fragrance = fragrances.findByExternalSourceAndExternalId("COMMUNITY", ext)
      .orElseGet(() -> fragrances.findByExternalSourceAndExternalId("community", ext)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Community fragrance not found")));

    if (fragrance.getCreatedByUserId() == null || !fragrance.getCreatedByUserId().equals(user.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the creator can edit this fragrance");
    }

    String brand = safe(req.brand());
    String name = safe(req.name());
    if (brand.isBlank() || name.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "brand and name are required");
    }

    String year = (req.year() == null || req.year().isBlank()) ? "0" : req.year().trim();
    String visibility = normalizeVisibility(req.visibility());
    String concentration = normalizeOptional(req.concentration());
    String imageUrl = normalizeImageUrl(req.imageUrl());
    String purchaseUrl = normalizePurchaseUrl(req.purchaseUrl());
    String confidence = normalizeOptional(req.confidence());
    String popularity = normalizeOptional(req.popularity());
    List<String> mainAccords = normalizeAccords(req.mainAccords());
    Map<String, String> mainAccordsPercentage = normalizeAccordStrengths(req.mainAccordsPercentage(), mainAccords);

    boolean topProvided = req.topNoteIds() != null || req.topNoteNames() != null;
    boolean middleProvided = req.middleNoteIds() != null || req.middleNoteNames() != null;
    boolean baseProvided = req.baseNoteIds() != null || req.baseNoteNames() != null;
    boolean anyNotesProvided = topProvided || middleProvided || baseProvided;

    List<NoteEntity> top = topProvided ? resolveNotes(req.topNoteIds(), req.topNoteNames(), user.getId()) : List.of();
    List<NoteEntity> middle = middleProvided ? resolveNotes(req.middleNoteIds(), req.middleNoteNames(), user.getId()) : List.of();
    List<NoteEntity> base = baseProvided ? resolveNotes(req.baseNoteIds(), req.baseNoteNames(), user.getId()) : List.of();
    NotesDto existingNotes = readNotesFromSnapshot(fragrance.getSnapshot());

    List<NoteDto> topDtos = topProvided ? toNoteDtos(top) : (existingNotes == null || existingNotes.top() == null ? List.of() : existingNotes.top());
    List<NoteDto> middleDtos = middleProvided ? toNoteDtos(middle) : (existingNotes == null || existingNotes.middle() == null ? List.of() : existingNotes.middle());
    List<NoteDto> baseDtos = baseProvided ? toNoteDtos(base) : (existingNotes == null || existingNotes.base() == null ? List.of() : existingNotes.base());

    FragranceSearchResult snapshot = buildSnapshot(
      fragrance.getExternalId(),
      name,
      brand,
      year,
      imageUrl,
      purchaseUrl,
      concentration,
      req.longevityScore(),
      req.sillageScore(),
      confidence,
      popularity,
      mainAccords,
      mainAccordsPercentage,
      visibility,
      topDtos,
      middleDtos,
      baseDtos,
      user.getId(),
      user.getUsername()
    );

    fragrance.setName(name);
    fragrance.setBrand(brand);
    fragrance.setYear(year.equals("0") ? null : year);
    fragrance.setImageUrl(imageUrl);
    fragrance.setVisibility(visibility);
    fragrance.setConcentration(concentration);
    fragrance.setLongevityScore(req.longevityScore());
    fragrance.setSillageScore(req.sillageScore());
    fragrance.setUpdatedAt(OffsetDateTime.now());

    try {
      fragrance.setSnapshot(om.writeValueAsString(snapshot));
    } catch (Exception e) {
      fragrance.setSnapshot("{}");
    }

    Fragrance saved = fragrances.saveAndFlush(fragrance);
    if (anyNotesProvided) {
      if (topProvided) {
        jdbc.update("DELETE FROM fragrance_note WHERE fragrance_id = ? AND note_category = 'TOP'", saved.getId());
        insertFragranceNotes(saved.getId(), top, "TOP");
      }
      if (middleProvided) {
        jdbc.update("DELETE FROM fragrance_note WHERE fragrance_id = ? AND note_category = 'MIDDLE'", saved.getId());
        insertFragranceNotes(saved.getId(), middle, "MIDDLE");
      }
      if (baseProvided) {
        jdbc.update("DELETE FROM fragrance_note WHERE fragrance_id = ? AND note_category = 'BASE'", saved.getId());
        insertFragranceNotes(saved.getId(), base, "BASE");
      }
    }

    return snapshot;
  }

  @Transactional
  public void delete(String externalId, String cognitoSub) {
    var user = users.findByCognitoSub(cognitoSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));

    String ext = normalizeKey(externalId);
    var fragrance = fragrances.findByExternalSourceAndExternalId("COMMUNITY", ext)
      .orElseGet(() -> fragrances.findByExternalSourceAndExternalId("community", ext)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Community fragrance not found")));

    if (fragrance.getCreatedByUserId() == null || !fragrance.getCreatedByUserId().equals(user.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the creator can delete this fragrance");
    }

    deleteCommunityFragranceAndDependencies(fragrance);
  }

  @Transactional
  public void forceDeleteByAdmin(String externalId, String adminSub) {
    var admin = users.findByCognitoSub(adminSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));
    if (!admin.isAdmin()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required.");
    }

    String ext = normalizeKey(externalId);
    var fragrance = fragrances.findByExternalSourceAndExternalId("COMMUNITY", ext)
      .orElseGet(() -> fragrances.findByExternalSourceAndExternalId("community", ext)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Community fragrance not found")));

    deleteCommunityFragranceAndDependencies(fragrance);
  }

  private void deleteCommunityFragranceAndDependencies(Fragrance fragrance) {
    List<UUID> noteIds = jdbc.query(
      "SELECT note_id FROM fragrance_note WHERE fragrance_id = ?",
      (rs, rowNum) -> rs.getObject(1, UUID.class),
      fragrance.getId()
    );

    // Remove denormalized dependencies keyed by (source, external_id) to prevent orphaned records.
    jdbc.update(
      "DELETE FROM fragrance_rating WHERE LOWER(external_source) = LOWER(?) AND external_id = ?",
      fragrance.getExternalSource(),
      fragrance.getExternalId()
    );
    jdbc.update(
      "DELETE FROM user_collection_item WHERE LOWER(fragrance_source) = LOWER(?) AND fragrance_external_id = ?",
      fragrance.getExternalSource(),
      fragrance.getExternalId()
    );

    fragrances.delete(fragrance);

    if (noteIds != null && !noteIds.isEmpty()) {
      for (UUID noteId : noteIds) {
        if (noteId == null) continue;
        jdbc.update(
          """
          DELETE FROM note_dictionary n
          WHERE n.id = ?
            AND NOT EXISTS (
              SELECT 1 FROM fragrance_note fn WHERE fn.note_id = n.id
            )
          """,
          noteId
        );
      }
    }
  }

  // ✅ NEW: community search from DB (respects visibility via repository query)
  @Transactional(readOnly = true)
  public List<FragranceSearchResult> search(String q, String cognitoSub, int limit) {
    var user = users.findByCognitoSub(cognitoSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));

    String query = safe(q);
    if (query.isBlank()) return List.of();

    int capped = Math.min(20, Math.max(1, limit));
    var pageable = PageRequest.of(0, capped);

    var rows = fragrances.searchCommunity(query, user.getId(), pageable);

    return rows.stream().map(f -> {
      String snapshot = f.getSnapshot();
      if (snapshot == null || snapshot.isBlank()) snapshot = "{}";

      try {
        FragranceSearchResult parsed = om.readValue(snapshot, FragranceSearchResult.class);

        // Force consistent ids/source even if snapshot is stale
        return new FragranceSearchResult(
          "community",
          f.getExternalId(),

          parsed.name(),
          parsed.brand(),
          parsed.year(),
          parsed.imageUrl(),
          parsed.gender(),

          parsed.rating(),
          parsed.price(),
          parsed.priceValue(),

          parsed.oilType(),
          parsed.longevity(),
          parsed.sillage(),
          parsed.confidence(),
          parsed.popularity(),

          parsed.mainAccordsPercentage(),
          parsed.seasonRanking(),
          parsed.occasionRanking(),

          parsed.mainAccords(),
          parsed.generalNotes(),
          parsed.notes(),
          parsed.purchaseUrl(),

          parsed.concentration(),
          parsed.longevityScore(),
          parsed.sillageScore(),
          parsed.visibility(),
          parsed.createdByUserId(),
          resolveUsername(parsed.createdByUserId(), parsed.createdByUsername()),
          parsed.ratingCount(),
          parsed.userRating()
        );
      } catch (Exception e) {
        // Fallback minimal row (still shows up in Search)
        return new FragranceSearchResult(
          "community",
          f.getExternalId(),

          f.getName(),
          f.getBrand(),
          f.getYear(),
          null,
          null,

          null,
          null,
          null,

          f.getConcentration(),
          scoreLabel(f.getLongevityScore()),
          scoreLabel(f.getSillageScore()),
          null,
          null,

          null,
          List.of(),
          List.of(),

          List.of(),
          List.of(),
          null,
          null,

          f.getConcentration(),
          f.getLongevityScore(),
          f.getSillageScore(),
          f.getVisibility(),
          f.getCreatedByUserId(),
          resolveUsername(f.getCreatedByUserId(), null),
          null,
          null
        );
      }
    }).toList();
  }

  private String resolveUsername(UUID createdByUserId, String snapshotUsername) {
    String normalized = snapshotUsername == null ? "" : snapshotUsername.trim();
    if (!normalized.isBlank()) return normalized;
    if (createdByUserId == null) return null;
    return users.findById(createdByUserId)
      .map(u -> u.getUsername())
      .orElse(null);
  }

  private void insertFragranceNotes(UUID fragranceId, List<NoteEntity> list, String category) {
    if (list == null || list.isEmpty()) return;

    for (int i = 0; i < list.size(); i++) {
      var n = list.get(i);

      jdbc.update(
        "INSERT INTO fragrance_note (fragrance_id, note_id, note_category, display_order) " +
          "VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        fragranceId, n.getId(), category, i
      );

      jdbc.update("UPDATE note_dictionary SET usage_count = usage_count + 1 WHERE id = ?", n.getId());
    }
  }

  private List<NoteEntity> fetchNotesInOrder(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) return List.of();

    var found = notes.findAllById(ids);
    Map<UUID, NoteEntity> map = found.stream()
      .collect(Collectors.toMap(NoteEntity::getId, x -> x));

    List<NoteEntity> out = new ArrayList<>();
    for (var id : ids) {
      var e = map.get(id);
      if (e != null) out.add(e);
    }
    return out;
  }

  private List<NoteEntity> resolveNotes(List<UUID> ids, List<String> names, UUID userId) {
    LinkedHashMap<UUID, NoteEntity> ordered = new LinkedHashMap<>();

    for (NoteEntity note : fetchNotesInOrder(ids)) {
      ordered.putIfAbsent(note.getId(), note);
    }

    Set<String> seenNormalized = ordered.values().stream()
      .map(NoteEntity::getNormalizedName)
      .filter(Objects::nonNull)
      .collect(Collectors.toCollection(LinkedHashSet::new));

    if (names != null) {
      for (String raw : names) {
        String cleaned = normalizeOptional(raw);
        if (cleaned == null) continue;

        String normalized = NoteService.normalize(cleaned);
        if (normalized.isBlank() || seenNormalized.contains(normalized)) continue;

        NoteEntity saved = noteService.upsertFromUserInput(cleaned, userId);
        if (saved == null || saved.getId() == null) continue;

        ordered.putIfAbsent(saved.getId(), saved);
        seenNormalized.add(normalized);
        if (ordered.size() >= 20) break;
      }
    }

    return new ArrayList<>(ordered.values());
  }

  private static List<NoteDto> toNoteDtos(List<NoteEntity> list) {
    if (list == null) return List.of();
    return list.stream()
      .map(n -> new NoteDto(n.getId(), n.getName(), n.getImageUrl()))
      .toList();
  }

  private static String normalizeVisibility(String v) {
    String s = (v == null ? "" : v.trim()).toUpperCase(Locale.ROOT);
    return "PUBLIC".equals(s) ? "PUBLIC" : "PRIVATE";
  }

  private static String safe(String s) {
    return s == null ? "" : s.trim();
  }

  private static String normalizeKey(String s) {
    return safe(s).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }

  private NotesDto readNotesFromSnapshot(String snapshotJson) {
    if (snapshotJson == null || snapshotJson.isBlank()) return null;
    try {
      FragranceSearchResult parsed = om.readValue(snapshotJson, FragranceSearchResult.class);
      return parsed.notes();
    } catch (Exception ignore) {
      return null;
    }
  }

  private static String normalizeOptional(String s) {
    String cleaned = safe(s);
    return cleaned.isBlank() ? null : cleaned;
  }

  private static String normalizeImageUrl(String v) {
    String cleaned = normalizeOptional(v);
    if (cleaned == null) return null;
    return cleaned;
  }

  private static String normalizePurchaseUrl(String v) {
    String cleaned = normalizeOptional(v);
    if (cleaned == null) return null;
    if (cleaned.matches("(?i)^https?://.*")) return cleaned;
    if (cleaned.matches("(?i)^www\\..*")) return "https://" + cleaned;
    return cleaned;
  }

  private static List<String> normalizeAccords(List<String> accords) {
    if (accords == null || accords.isEmpty()) return List.of();
    return accords.stream()
      .map(CommunityFragranceService::normalizeOptional)
      .filter(Objects::nonNull)
      .distinct()
      .limit(20)
      .toList();
  }

  private static Map<String, String> normalizeAccordStrengths(Map<String, String> strengths, List<String> accords) {
    Map<String, String> out = new LinkedHashMap<>();
    if (strengths != null) {
      strengths.forEach((k, v) -> {
        String key = normalizeOptional(k);
        String value = normalizeOptional(v);
        if (key != null && value != null) out.put(key, value);
      });
    }
    if (accords != null) {
      for (String accord : accords) {
        out.putIfAbsent(accord, "Moderate");
      }
    }
    return out.isEmpty() ? null : out;
  }

  private FragranceSearchResult buildSnapshot(
    String externalId,
    String name,
    String brand,
    String year,
    String imageUrl,
    String purchaseUrl,
    String concentration,
    Integer longevityScore,
    Integer sillageScore,
    String confidence,
    String popularity,
    List<String> mainAccords,
    Map<String, String> mainAccordsPercentage,
    String visibility,
    List<NoteDto> top,
    List<NoteDto> middle,
    List<NoteDto> base,
    UUID createdByUserId,
    String createdByUsername
  ) {
    return new FragranceSearchResult(
      "community",
      externalId,
      name,
      brand,
      year.equals("0") ? null : year,
      imageUrl,
      null,
      null,
      null,
      null,
      concentration,
      scoreLabel(longevityScore),
      scoreLabel(sillageScore),
      confidence,
      popularity,
      mainAccordsPercentage,
      List.of(),
      List.of(),
      mainAccords == null ? List.of() : mainAccords,
      List.of(),
      new NotesDto(top, middle, base),
      purchaseUrl,
      concentration,
      longevityScore,
      sillageScore,
      visibility,
      createdByUserId,
      createdByUsername,
      null,
      null
    );
  }
}
