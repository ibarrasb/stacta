package com.stacta.api.fragrance;

import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaClient;
import com.stacta.api.integrations.fragella.FragellaDtos;

@Service
public class FragellaSearchCacheService {

  private final FragellaClient client;
  private final FragellaMapper mapper;
  private final ObjectMapper objectMapper;

  public FragellaSearchCacheService(FragellaClient client, FragellaMapper mapper, ObjectMapper objectMapper) {
    this.client = client;
    this.mapper = mapper;
    this.objectMapper = objectMapper;
  }

  @Cacheable(
    cacheNames = "fragellaSearchV2",
    key = "'v2:' + (#q == null ? '' : #q.trim().toLowerCase()) + '|' + #limit"
  )
  public String searchJson(String q, int limit) {
    try {
      List<FragellaDtos.Fragrance> raw = client.search(q, limit);
      List<FragranceSearchResult> results = mapper.mapRaw(raw);
      return objectMapper.writeValueAsString(results);
    } catch (Exception e) {
      throw new RuntimeException("Failed to build Fragella search JSON", e);
    }
  }
}
