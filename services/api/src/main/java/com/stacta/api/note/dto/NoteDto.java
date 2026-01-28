package com.stacta.api.note.dto;

import java.util.UUID;

public record NoteDto(
  UUID id,
  String name,
  String imageUrl,
  Integer usageCount
) {}
