package com.stacta.api.fragrance;

import com.stacta.api.integrations.fragella.FragellaClient;
import com.stacta.api.integrations.fragella.FragellaDtos;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fragrances")
public class FragranceController {

  private static final String SOURCE = "fragella";

  private final FragellaClient fragella;
  private final FragranceIngestService ingest;

  public FragranceController(FragellaClient fragella, FragranceIngestService ingest) {
    this.fragella = fragella;
    this.ingest = ingest;
  }

  @Operation(summary = "Search fragrances via Fragella (optionally persist to DB). Cached when persist=false.")
  @Cacheable(
    cacheNames = "fragellaSearch",
    key = "T(String).format('%s|%d', #q == null ? '' : #q.trim().toLowerCase(), #limit)",
    condition = "#persist == false"
  )
  @GetMapping("/search")
  public List<FragranceSearchResult> search(
    @RequestParam("q") String q,
    @RequestParam(value = "limit", defaultValue = "10") int limit,
    @RequestParam(value = "persist", defaultValue = "true") boolean persist
  ) {
    if (q == null || q.trim().length() < 3) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q must be at least 3 characters");
    }

    // docs: max 20
    if (limit < 1) limit = 1;
    if (limit > 20) limit = 20;

    var raw = fragella.search(q.trim(), limit);

    if (persist && !raw.isEmpty()) {
      ingest.upsertAll(raw);
    }

    return raw.stream().map(this::toResult).toList();
  }

  private FragranceSearchResult toResult(FragellaDtos.Fragrance f) {
    var extId = externalId(f);

    // prefer Image URL, else first fallback
    var image = firstNonBlank(f.imageUrl());
    if (isBlank(image) && f.imageFallbacks() != null && !f.imageFallbacks().isEmpty()) {
      image = firstNonBlank(f.imageFallbacks().get(0));
    }

    return new FragranceSearchResult(
      SOURCE,
      extId,
      safeTrim(f.name()),
      safeTrim(f.brand()),
      safeTrim(f.year()),
      image,
      safeTrim(f.gender()),
      safeTrim(f.rating()),
      safeTrim(f.price()),
      safeTrim(f.priceValue()),
      f.mainAccords() == null ? List.of() : f.mainAccords(),
      f.generalNotes() == null ? List.of() : f.generalNotes(),
      mapNotes(f.notes()),
      f.purchaseUrl()
    );
  }

  private NotesDto mapNotes(FragellaDtos.Notes notes) {
    if (notes == null) return new NotesDto(List.of(), List.of(), List.of());
    return new NotesDto(
      mapNoteList(notes.top()),
      mapNoteList(notes.middle()),
      mapNoteList(notes.base())
    );
  }

  private List<NoteDto> mapNoteList(List<FragellaDtos.Note> list) {
    if (list == null) return List.of();
    return list.stream()
      .filter(n -> n != null && !isBlank(n.name()))
      .map(n -> new NoteDto(safeTrim(n.name()), safeTrim(n.imageUrl())))
      .toList();
  }

  // stable "external id" because Fragella doesn't provide one
  private String externalId(FragellaDtos.Fragrance f) {
    var brand = safeTrim(f.brand());
    var name  = safeTrim(f.name());
    var year  = safeTrim(f.year());

    var raw = (brand + "|" + name + "|" + year).toLowerCase();
    raw = raw.replaceAll("\\s+", " ").trim();
    return raw;
  }

  private static String safeTrim(String s) {
    return s == null ? null : s.trim();
  }

  private static boolean isBlank(String s) {
    return s == null || s.trim().isEmpty();
  }

  private static String firstNonBlank(String s) {
    return isBlank(s) ? null : s.trim();
  }

  // ---- Your API DTOs (clean JSON) ----

  public record FragranceSearchResult(
    String source,
    String externalId,
    String name,
    String brand,
    String year,
    String imageUrl,
    String gender,
    String rating,
    String price,
    String priceValue,
    List<String> mainAccords,
    List<String> generalNotes,
    NotesDto notes,
    String purchaseUrl
  ) {}

  public record NotesDto(
    List<NoteDto> top,
    List<NoteDto> middle,
    List<NoteDto> base
  ) {}

  public record NoteDto(
    String name,
    String imageUrl
  ) {}
}
