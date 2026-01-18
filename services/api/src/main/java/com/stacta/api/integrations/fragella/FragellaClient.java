package com.stacta.api.integrations.fragella;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class FragellaClient {

  private final RestClient rest;
  private final ObjectMapper om;

  public FragellaClient(
    RestClient.Builder builder,
    ObjectMapper om,
    @Value("${fragella.base-url:https://api.fragella.com/api/v1}") String baseUrl,
    @Value("${fragella.api-key:}") String apiKey
  ) {
    this.om = om;

    if (apiKey == null || apiKey.isBlank()) {
      throw new IllegalStateException("FRAGELLA API key missing. Set fragella.api-key / FRAGELLA_API_KEY.");
    }

    this.rest = builder
      .baseUrl(baseUrl)
      .defaultHeader("x-api-key", apiKey)
      .build();
  }

  public List<FragellaDtos.Fragrance> search(String q, int limit) {
    int safeLimit = Math.min(Math.max(limit, 1), 20);
    System.out.println("Calling Fragella API @ " + java.time.Instant.now() + " q=" + q + " limit=" + safeLimit);


    try {
      String raw = rest.get()
        .uri(uriBuilder -> uriBuilder
          .path("/fragrances")
          .queryParam("search", q)
          .queryParam("limit", safeLimit)
          .build()
        )
        .retrieve()
        .body(String.class);

      if (raw == null || raw.isBlank()) return List.of();
      return om.readerForListOf(FragellaDtos.Fragrance.class).readValue(raw);
        
    } catch (HttpClientErrorException.NotFound e) {
      return List.of();
    } catch (Exception e) {
      throw new RuntimeException("Fragella search failed", e);
    }
    
  }
}
