package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaDtos;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/fragrances")
public class FragranceController {

  private final FragellaSearchService searchService;
  private final FragranceIngestService ingest;

  public FragranceController(FragellaSearchService searchService, FragranceIngestService ingest) {
    this.searchService = searchService;
    this.ingest = ingest;
  }

  @Operation(summary = "Search fragrances via Fragella (optionally persist to DB). Cached when persist=false.")
  @GetMapping("/search")
  public List<FragranceSearchResult> search(
    @RequestParam("q") String q,
    @RequestParam(value = "limit", defaultValue = "10") int limit,
    @RequestParam(value = "persist", defaultValue = "true") boolean persist
  ) {
    if (q == null || q.trim().length() < 3) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q must be at least 3 characters");
    }

    if (limit < 1) limit = 1;
    if (limit > 20) limit = 20;

    // ✅ cached mode (persist=false)
    if (!persist) {
      return searchService.searchCached(q, limit);
    }

    // ✅ ingest mode (persist=true): NO cache
    List<FragellaDtos.Fragrance> raw = searchService.searchRaw(q, limit);

    if (!raw.isEmpty()) {
      ingest.upsertAll(raw);
    }

    return searchService.mapRaw(raw);
  }
}
