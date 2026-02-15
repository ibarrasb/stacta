package com.stacta.api.integrations.fragella;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;

@Component
public class FragellaClient {

  private static final Logger log = LoggerFactory.getLogger(FragellaClient.class);

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
    int safeLimit = Math.min(Math.max(limit, 1), 50);
    String needle = (q == null) ? "" : q.trim();
    if (needle.isBlank()) return List.of();

    if (log.isDebugEnabled()) {
      log.debug("Fragella search start ts={} q='{}' limit={}", Instant.now(), needle, safeLimit);
    }

    try {
      String raw = rest.get()
        .uri(uriBuilder -> uriBuilder
          .path("/fragrances")
          .queryParam("search", needle)
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
