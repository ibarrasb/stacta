package com.stacta.api.note.dto;

import java.util.List;

public record NoteReportListResponse(
  List<NoteReportItemDto> items
) {}
