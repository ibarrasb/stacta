package com.stacta.api.fragrance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.note.NoteService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class FragranceIngestService {

  public static final String SOURCE = "FRAGELLA";

  private final FragranceRepository repo;
  private final ObjectMapper om;
  private final NoteService noteService;

  public FragranceIngestService(FragranceRepository repo, ObjectMapper om, NoteService noteService) {
    this.repo = repo;
    this.om = om;
    this.noteService = noteService;
  }

  @Transactional
  public void upsertAll(List<FragellaDtos.Fragrance> items) {
    // 1) ingest notes first (fills note_dictionary)
    noteService.ingestNotesFromFragella(items);

    // 2) upsert fragrances + snapshot
    for (var item : items) {
      var extId = externalId(item);

      var entity = repo.findByExternalSourceAndExternalId(SOURCE, extId)
        .orElseGet(() -> {
          var f = new Fragrance();
          f.setExternalSource(SOURCE);
          f.setExternalId(extId);
          return f;
        });

      entity.setName(nullSafe(item.name()));
      entity.setBrand(nullSafe(item.brand()));
      entity.setYear(nullSafe(item.year()));
      entity.setImageUrl(nullSafe(item.imageUrl()));
      entity.setGender(nullSafe(item.gender()));
      entity.setRating(nullSafe(item.rating()));
      entity.setPrice(nullSafe(item.price()));

      try {
        entity.setSnapshot(om.writeValueAsString(item));
      } catch (Exception e) {
        entity.setSnapshot("{}");
      }

      repo.save(entity);
    }
  }

  private static String nullSafe(String s) {
    return s == null ? "" : s.trim();
  }

  private static String externalId(FragellaDtos.Fragrance f) {
    var brand = nullSafe(f.brand());
    var name  = nullSafe(f.name());
    var year  = nullSafe(f.year());

    if (year.isBlank()) year = "0";

    return (brand + "|" + name + "|" + year)
      .toLowerCase(Locale.ROOT)
      .replaceAll("\\s+", " ")
      .trim();
  }
}
