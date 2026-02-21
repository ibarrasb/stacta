package com.stacta.api.fragrance;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.stacta.api.fragrance.dto.CreateCommunityFragranceRequest;
import com.stacta.api.fragrance.dto.FragranceSearchResult;

@RestController
@RequestMapping("/api/v1/community-fragrances")
public class CommunityFragranceController {

  private final CommunityFragranceService community;

  public CommunityFragranceController(CommunityFragranceService community) {
    this.community = community;
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

}
