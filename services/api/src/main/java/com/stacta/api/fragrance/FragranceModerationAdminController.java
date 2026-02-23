package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceReportListResponse;
import com.stacta.api.fragrance.dto.ResolveFragranceReportRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/fragrance-reports")
public class FragranceModerationAdminController {

  private final FragranceModerationService moderation;

  public FragranceModerationAdminController(FragranceModerationService moderation) {
    this.moderation = moderation;
  }

  @GetMapping
  public FragranceReportListResponse list(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam(value = "status", defaultValue = "OPEN") String status,
    @RequestParam(value = "limit", defaultValue = "100") int limit
  ) {
    return new FragranceReportListResponse(moderation.list(status, limit, jwt.getSubject()));
  }

  @PostMapping("/{reportId}/resolve")
  public void resolve(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reportId") UUID reportId,
    @Valid @RequestBody ResolveFragranceReportRequest req
  ) {
    moderation.resolve(reportId, req, jwt.getSubject());
  }
}
