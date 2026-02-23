package com.stacta.api.fragrance;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.stacta.api.fragrance.dto.CreateCommunityFragranceRequest;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteRequest;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteSummaryResponse;
import com.stacta.api.fragrance.dto.ReportFragranceRequest;
import com.stacta.api.fragrance.dto.FragranceSearchResult;

@RestController
@RequestMapping("/api/v1/community-fragrances")
public class CommunityFragranceController {

  private final CommunityFragranceService community;
  private final CommunityFragranceVoteService votes;
  private final FragranceModerationService moderation;

  public CommunityFragranceController(
    CommunityFragranceService community,
    CommunityFragranceVoteService votes,
    FragranceModerationService moderation
  ) {
    this.community = community;
    this.votes = votes;
    this.moderation = moderation;
  }

  @PostMapping
  public FragranceSearchResult create(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody CreateCommunityFragranceRequest req
  ) {
    String sub = jwt.getSubject();
    return community.create(req, sub);
  }

  @PutMapping("/{externalId}")
  public FragranceSearchResult update(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("externalId") String externalId,
    @Valid @RequestBody CreateCommunityFragranceRequest req
  ) {
    String sub = jwt.getSubject();
    return community.update(externalId, req, sub);
  }

  @DeleteMapping("/{externalId}")
  public void delete(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("externalId") String externalId
  ) {
    String sub = jwt.getSubject();
    community.delete(externalId, sub);
  }

  /**
   * TEMP: keep endpoint shape but return empty for now so FE compiles.
   * We'll implement real community search next.
   */
  @GetMapping("/search")
public List<FragranceSearchResult> search(
  @RequestParam("q") String q,
  @RequestParam(value = "limit", defaultValue = "20") int limit,
  @AuthenticationPrincipal Jwt jwt
) {
  String sub = jwt.getSubject();
  return community.search(q, sub, limit);
}

  @GetMapping("/{externalId}/votes")
  public CommunityFragranceVoteSummaryResponse voteSummary(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("externalId") String externalId
  ) {
    return votes.summary(externalId, jwt.getSubject());
  }

  @PutMapping("/{externalId}/votes")
  public CommunityFragranceVoteSummaryResponse vote(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("externalId") String externalId,
    @Valid @RequestBody CommunityFragranceVoteRequest req
  ) {
    return votes.upsert(externalId, jwt.getSubject(), req);
  }

  @PostMapping("/{externalId}/report")
  public void report(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("externalId") String externalId,
    @Valid @RequestBody ReportFragranceRequest req
  ) {
    moderation.reportCommunityFragrance(externalId, req.reason(), req.details(), jwt.getSubject());
  }

}
