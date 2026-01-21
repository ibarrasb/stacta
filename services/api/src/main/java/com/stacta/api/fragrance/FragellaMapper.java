package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaDtos;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

import tools.jackson.databind.ObjectMapper;

@Component
public class FragellaMapper {

  private final ObjectMapper objectMapper;

  public FragellaMapper(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public List<FragranceSearchResult> mapRaw(List<FragellaDtos.Fragrance> raw) {
    if (raw == null || raw.isEmpty()) return List.of();

    try {
      List<FragranceSearchResult> out = new ArrayList<>(raw.size());
      for (var item : raw) {
        // convert raw DTO -> JSON tree -> FragranceSearchResult (no fragile manual mapping)
        var node = objectMapper.valueToTree(item);
        out.add(objectMapper.treeToValue(node, FragranceSearchResult.class));
      }
      return out;
    } catch (Exception e) {
      throw new RuntimeException("Failed to map FragellaDtos.Fragrance -> FragranceSearchResult", e);
    }
  }
}
