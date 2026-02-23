package com.stacta.api.note;

import com.stacta.api.note.dto.NoteReportListResponse;
import com.stacta.api.note.dto.NoteReportOffenderItemDto;
import com.stacta.api.note.dto.IssueUserStrikeRequest;
import com.stacta.api.note.dto.ResolveNoteReportRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/note-reports")
public class NoteModerationAdminController {

  private final NoteModerationService moderationService;

  public NoteModerationAdminController(NoteModerationService moderationService) {
    this.moderationService = moderationService;
  }

  @GetMapping
  public NoteReportListResponse list(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam(value = "status", defaultValue = "OPEN") String status,
    @RequestParam(value = "limit", defaultValue = "100") int limit
  ) {
    return new NoteReportListResponse(moderationService.list(status, limit, jwt.getSubject()));
  }

  @PostMapping("/{reportId}/resolve")
  public void resolve(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reportId") UUID reportId,
    @Valid @RequestBody ResolveNoteReportRequest req
  ) {
    moderationService.resolve(reportId, req, jwt.getSubject());
  }

  @GetMapping("/{reportId}/offenders")
  public List<NoteReportOffenderItemDto> offenders(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reportId") UUID reportId
  ) {
    return moderationService.offenders(reportId, jwt.getSubject());
  }

  @PostMapping("/strikes")
  public void issueStrike(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody IssueUserStrikeRequest req
  ) {
    moderationService.issueStrike(jwt.getSubject(), req.userId(), req.noteReportId(), req.reason(), req.points());
  }
}
