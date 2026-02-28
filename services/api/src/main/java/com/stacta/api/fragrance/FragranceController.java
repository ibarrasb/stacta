package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.fragrance.dto.FragranceRatingSummary;
import com.stacta.api.fragrance.dto.RateFragranceRequest;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteRequest;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteSummaryResponse;
import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.note.NoteIngestAsyncService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/fragrances")
public class FragranceController {

  private final FragellaSearchService searchService;
  private final NoteIngestAsyncService noteIngestAsyncService;
  private final FragranceRatingService ratingService;
  private final FragranceVoteService voteService;

  public FragranceController(
    FragellaSearchService searchService,
    NoteIngestAsyncService noteIngestAsyncService,
    FragranceRatingService ratingService,
    FragranceVoteService voteService
  ) {
    this.searchService = searchService;
    this.noteIngestAsyncService = noteIngestAsyncService;
    this.ratingService = ratingService;
    this.voteService = voteService;
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
    @RequestParam(value = "source", defaultValue = "FRAGELLA") String source,
    @AuthenticationPrincipal Jwt jwt
  ) {
    if (externalId == null || externalId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalId is required");
    }
    String viewerSub = jwt == null ? null : jwt.getSubject();
    return searchService.attachRatings(searchService.getPersistedDetail(source, externalId.trim()), viewerSub);
  }

  @PostMapping("/{externalId}/rating")
  public FragranceRatingSummary rateFragrance(
    @PathVariable("externalId") String externalId,
    @RequestParam(value = "source", defaultValue = "FRAGELLA") String source,
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody RateFragranceRequest req
  ) {
    if (externalId == null || externalId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalId is required");
    }
    if (req == null || req.rating() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating is required");
    }
    String normalizedSource = source == null ? "FRAGELLA" : source.trim().toUpperCase(Locale.ROOT);
    ratingService.upsertRating(jwt.getSubject(), normalizedSource, externalId.trim(), req.rating());
    return resolveRatingSummary(jwt.getSubject(), normalizedSource, externalId.trim());
  }

  @GetMapping("/{externalId}/rating")
  public FragranceRatingSummary getFragranceRating(
    @PathVariable("externalId") String externalId,
    @RequestParam(value = "source", defaultValue = "FRAGELLA") String source,
    @AuthenticationPrincipal Jwt jwt
  ) {
    if (externalId == null || externalId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalId is required");
    }
    String viewerSub = jwt == null ? null : jwt.getSubject();
    String normalizedSource = source == null ? "FRAGELLA" : source.trim().toUpperCase(Locale.ROOT);
    return resolveRatingSummary(viewerSub, normalizedSource, externalId.trim());
  }

  @GetMapping("/{externalId}/votes")
  public CommunityFragranceVoteSummaryResponse voteSummary(
    @PathVariable("externalId") String externalId,
    @RequestParam(value = "source", defaultValue = "FRAGELLA") String source,
    @AuthenticationPrincipal Jwt jwt
  ) {
    return voteService.summary(source, externalId, jwt.getSubject());
  }

  @PutMapping("/{externalId}/votes")
  public CommunityFragranceVoteSummaryResponse vote(
    @PathVariable("externalId") String externalId,
    @RequestParam(value = "source", defaultValue = "FRAGELLA") String source,
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody CommunityFragranceVoteRequest req
  ) {
    return voteService.upsert(source, externalId, jwt.getSubject(), req);
  }

  private FragranceRatingSummary resolveRatingSummary(String viewerSub, String source, String externalId) {
    if ("FRAGELLA".equalsIgnoreCase(source)) {
      FragranceSearchResult detail = searchService.getPersistedDetail(source, externalId);
      FragranceSearchResult enriched = searchService.attachRatings(detail, viewerSub);
      double avg = 0.0;
      try {
        avg = enriched.rating() == null ? 0.0 : Double.parseDouble(enriched.rating());
      } catch (Exception ignore) {}
      long count = enriched.ratingCount() == null ? 0L : Math.max(0L, enriched.ratingCount());
      Double userRating = enriched.userRating();
      return new FragranceRatingSummary(avg, count, userRating);
    }
    return ratingService.getSummary(viewerSub, source, externalId);
  }
}
