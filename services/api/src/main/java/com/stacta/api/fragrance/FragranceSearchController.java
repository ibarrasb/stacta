package com.stacta.api.fragrance;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FragranceSearchController {

  @Operation(summary = "Search fragrances (stubbed, cached)")
  @GetMapping("/api/v1/fragrances/search")
  @Cacheable(cacheNames = "fragranceSearch", key = "#q")
  public List<FragranceSearchResult> search(@RequestParam String q) {
  
    return List.of(
      new FragranceSearchResult("fragella", "demo-1", "Dior Sauvage", "Dior", "https://example.com/sauvage.png"),
      new FragranceSearchResult("fragella", "demo-2", "Bleu de Chanel", "Chanel", "https://example.com/bleu.png")
    );
  }

  public record FragranceSearchResult(
    String source,
    String externalId,
    String name,
    String brand,
    String imageUrl
  ) {}
}
