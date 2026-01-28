package com.stacta.api.note;

import com.stacta.api.note.dto.NoteDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {

  private final NoteService noteService;

  public NoteController(NoteService noteService) {
    this.noteService = noteService;
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
}
