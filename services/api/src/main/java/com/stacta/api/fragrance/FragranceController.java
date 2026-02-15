package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.note.NoteIngestAsyncService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fragrances")
public class FragranceController {

  private final FragellaSearchService searchService;
  private final NoteIngestAsyncService noteIngestAsyncService;

  public FragranceController(
    FragellaSearchService searchService,
    NoteIngestAsyncService noteIngestAsyncService
  ) {
    this.searchService = searchService;
    this.noteIngestAsyncService = noteIngestAsyncService;
  }

  @Operation(summary = "Search fragrances via Fragella. Cached when persist=false. When persist=true, does NOT cache and persists NOTES only (async).")
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
    if (limit > 50) limit = 50;

    // cached mode (persist=false)
    if (!persist) {
      return searchService.searchCached(q, limit);
    }

    // non-cached mode (persist=true): fetch raw, kick off NOTE ingestion async, then map + return immediately
    List<FragellaDtos.Fragrance> raw = searchService.searchRaw(q, limit);

    if (raw != null && !raw.isEmpty()) {
      // copy to avoid any surprises if the underlying list is mutable
      noteIngestAsyncService.ingestNotesFromFragellaAsync(List.copyOf(raw));
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
