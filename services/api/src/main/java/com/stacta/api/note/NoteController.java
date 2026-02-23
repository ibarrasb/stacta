package com.stacta.api.note;

import com.stacta.api.note.dto.NoteDto;
import com.stacta.api.note.dto.ReportNoteRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {

  private final NoteService noteService;
  private final NoteModerationService moderationService;

  public NoteController(NoteService noteService, NoteModerationService moderationService) {
    this.noteService = noteService;
    this.moderationService = moderationService;
  }

  @GetMapping
  public List<NoteDto> search(
    @RequestParam("search") String search,
    @RequestParam(value = "limit", defaultValue = "30") int limit
  ) {
    return noteService.search(search, limit);
  }

  @GetMapping("/popular")
  public List<NoteDto> popular(@RequestParam(value = "limit", defaultValue = "100") int limit) {
    return noteService.popular(limit);
  }

  @PostMapping("/{noteId}/report")
  public void reportNote(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("noteId") UUID noteId,
    @Valid @RequestBody ReportNoteRequest req
  ) {
    moderationService.reportNote(noteId, req.reason(), req.details(), jwt.getSubject());
  }
}
