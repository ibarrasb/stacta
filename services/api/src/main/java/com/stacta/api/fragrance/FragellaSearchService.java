package com.stacta.api.fragrance;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaClient;
import com.stacta.api.integrations.fragella.FragellaDtos;

@Service
public class FragellaSearchService {

  private final FragellaClient client;
  private final FragellaMapper mapper;
  private final FragellaSearchCacheService cacheService;
  private final ObjectMapper objectMapper;

  public FragellaSearchService(
    FragellaClient client,
    FragellaMapper mapper,
    FragellaSearchCacheService cacheService,
    ObjectMapper objectMapper
  ) {
    this.client = client;
    this.mapper = mapper;
    this.cacheService = cacheService;
    this.objectMapper = objectMapper;
  }

  public List<FragranceSearchResult> searchCached(String q, int limit) {
    try {
      String json = cacheService.searchJson(q, limit);
      return objectMapper.readValue(json, new TypeReference<List<FragranceSearchResult>>() {});
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse cached Fragella search JSON", e);
    }
  }

  public List<FragellaDtos.Fragrance> searchRaw(String q, int limit) {
    return client.search(q, limit);
  }

  public List<FragranceSearchResult> mapRaw(List<FragellaDtos.Fragrance> raw) {
    return mapper.mapRaw(raw);
  }
}
