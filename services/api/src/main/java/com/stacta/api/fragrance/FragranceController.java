package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.note.NoteService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fragrances")
public class FragranceController {

  private final FragellaSearchService searchService;
  private final NoteService noteService;

  public FragranceController(FragellaSearchService searchService, NoteService noteService) {
    this.searchService = searchService;
    this.noteService = noteService;
  }

  @Operation(summary = "Search fragrances via Fragella. Cached when persist=false. When persist=true, does NOT cache and persists NOTES only.")
  @GetMapping("/search")
  public List<FragranceSearchResult> search(
    @RequestParam("q") String q,
    @RequestParam(value = "limit", defaultValue = "10") int limit,
    @RequestParam(value = "persist", defaultValue = "false") boolean persist
  ) {
    if (q == null || q.trim().length() < 3) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q must be at least 3 characters");
    }

    if (limit < 1) limit = 1;
    if (limit > 20) limit = 20;

    // cached mode (persist=false)
    if (!persist) {
      return searchService.searchCached(q, limit);
    }

    // non-cached mode (persist=true): fetch raw, persist NOTES only, then map
    List<FragellaDtos.Fragrance> raw = searchService.searchRaw(q, limit);

    if (raw != null && !raw.isEmpty()) {
      noteService.ingestNotesFromFragella(raw);
    }

    return searchService.mapRaw(raw);
  }

  @GetMapping("/{externalId}")
  public FragranceSearchResult getByExternalId(
    @PathVariable("externalId") String externalId,
    @RequestParam(value = "source", defaultValue = "FRAGELLA") String source
  ) {
    if (externalId == null || externalId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalId is required");
    }
    return searchService.getPersistedDetail(source, externalId.trim());
  }
}
