package com.stacta.api.fragrance.dto;

import java.util.List;

public record NotesDto(
  List<NoteDto> top,
  List<NoteDto> middle,
  List<NoteDto> base
) {}
