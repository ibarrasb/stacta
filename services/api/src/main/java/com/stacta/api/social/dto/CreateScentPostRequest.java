package com.stacta.api.social.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateScentPostRequest(
  @Size(max = 1200) String text,
  @NotEmpty @Size(max = 3) List<@Valid ScentSelection> scents
) {
  public record ScentSelection(
    @Size(min = 1, max = 32) String source,
    @Size(min = 1, max = 200) String externalId
  ) {}
}
