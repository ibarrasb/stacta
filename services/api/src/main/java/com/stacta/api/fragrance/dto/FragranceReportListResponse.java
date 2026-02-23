package com.stacta.api.fragrance.dto;

import java.util.List;

public record FragranceReportListResponse(
  List<FragranceReportItemDto> items
) {}
