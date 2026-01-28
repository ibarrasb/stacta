package com.stacta.api.fragrance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.CreateCommunityFragranceRequest;
import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.fragrance.dto.NoteDto;   // IMPORTANT: fragrance.dto.NoteDto
import com.stacta.api.fragrance.dto.NotesDto;  // IMPORTANT: fragrance.dto.NotesDto
import com.stacta.api.note.NoteEntity;
import com.stacta.api.note.NoteRepository;
import com.stacta.api.user.UserRepository;
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
  private final JdbcTemplate jdbc;
  private final ObjectMapper om;

  public CommunityFragranceService(
    FragranceRepository fragrances,
    UserRepository users,
    NoteRepository notes,
    JdbcTemplate jdbc,
    ObjectMapper om
  ) {
    this.fragrances = fragrances;
    this.users = users;
    this.notes = notes;
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

    // stable COMMUNITY externalId (so duplicates collide)
    String externalId = normalizeKey(brand) + "|" + normalizeKey(name) + "|" + year +
      (concentration == null ? "" : "|" + normalizeKey(concentration));

    // Fetch note entities (preserve order)
    List<NoteEntity> top    = fetchNotesInOrder(req.topNoteIds());
    List<NoteEntity> middle = fetchNotesInOrder(req.middleNoteIds());
    List<NoteEntity> base   = fetchNotesInOrder(req.baseNoteIds());

    // Build response snapshot (this is what frontend uses today)
    FragranceSearchResult snapshot = new FragranceSearchResult(
      "community",
      externalId,
      name,
      brand,
      year.equals("0") ? null : year,
      null, // imageUrl
      null, // gender
      null, // rating
      null, // price
      null, // priceValue
      concentration, // oilType slot (FE shows as chip)
      null, // longevity label
      null, // sillage label
      null, // confidence
      null, // popularity
      null, // mainAccordsPercentage
      List.of(), // seasonRanking
      List.of(), // occasionRanking
      List.of(), // mainAccords
      List.of(), // generalNotes
      new NotesDto(toNoteDtos(top), toNoteDtos(middle), toNoteDtos(base)),
      null // purchaseUrl
    );

    // Persist fragrance row
    Fragrance f = new Fragrance();
    f.setExternalSource("COMMUNITY");
    f.setExternalId(externalId);
    f.setName(name);
    f.setBrand(brand);
    f.setYear(year.equals("0") ? null : year);

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

    Fragrance saved = fragrances.save(f);

    // Insert junction rows + bump usage_count
    insertFragranceNotes(saved.getId(), top, "TOP");
    insertFragranceNotes(saved.getId(), middle, "MIDDLE");
    insertFragranceNotes(saved.getId(), base, "BASE");

    return snapshot;
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

  private static List<NoteDto> toNoteDtos(List<NoteEntity> list) {
    if (list == null) return List.of();
    return list.stream()
      .map(n -> new NoteDto(n.getName(), n.getImageUrl()))
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
}
