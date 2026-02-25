package com.stacta.api.social;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.config.ApiException;
import com.stacta.api.social.dto.CreateReviewRequest;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

  private final ActivityEventRepository activities;
  private final UserRepository users;
  private final ObjectMapper objectMapper;

  public ReviewService(
    ActivityEventRepository activities,
    UserRepository users,
    ObjectMapper objectMapper
  ) {
    this.activities = activities;
    this.users = users;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public void submit(String viewerSub, CreateReviewRequest req) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String source = normalizeSource(req.source());
    String externalId = safeTrim(req.externalId());
    String fragranceName = safeTrim(req.fragranceName());
    String excerpt = safeTrim(req.excerpt());
    if (externalId.isEmpty() || fragranceName.isEmpty() || excerpt.isEmpty()) {
      throw new ApiException("INVALID_REVIEW");
    }

    Map<String, Integer> performance = normalizeRatingMap(req.performance(), 8);
    Map<String, Integer> season = normalizeRatingMap(req.season(), 16);
    Map<String, Integer> occasion = normalizeRatingMap(req.occasion(), 24);

    ActivityEvent event = new ActivityEvent();
    event.setActorUserId(me.getId());
    event.setType("REVIEW_POSTED");
    event.setFragranceName(fragranceName);
    event.setFragranceSource(source);
    event.setFragranceExternalId(externalId);
    event.setFragranceImageUrl(nullIfBlank(req.fragranceImageUrl()));
    event.setReviewRating(req.rating());
    event.setReviewExcerpt(excerpt.length() > 1200 ? excerpt.substring(0, 1200) : excerpt);
    event.setReviewPerformance(toJsonOrNull(performance));
    event.setReviewSeason(toJsonOrNull(season));
    event.setReviewOccasion(toJsonOrNull(occasion));
    activities.save(event);
  }

  @Transactional
  public void delete(String viewerSub, UUID reviewId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent event = activities.findById(reviewId).orElseThrow(() -> new ApiException("REVIEW_NOT_FOUND"));
    if (!"REVIEW_POSTED".equalsIgnoreCase(String.valueOf(event.getType()))) {
      throw new ApiException("REVIEW_NOT_FOUND");
    }
    if (!me.getId().equals(event.getActorUserId())) {
      throw new ApiException("REVIEW_FORBIDDEN");
    }
    activities.delete(event);
  }

  private Map<String, Integer> normalizeRatingMap(Map<String, Integer> input, int maxEntries) {
    if (input == null || input.isEmpty()) return Map.of();
    Map<String, Integer> out = new LinkedHashMap<>();
    for (var entry : input.entrySet()) {
      if (out.size() >= maxEntries) break;
      String key = safeTrim(entry.getKey()).toLowerCase(Locale.ROOT);
      Integer value = entry.getValue();
      if (key.isEmpty() || key.length() > 64 || value == null) continue;
      if (value < 1 || value > 5) continue;
      out.put(key, value);
    }
    return out;
  }

  private String normalizeSource(String raw) {
    String s = safeTrim(raw).toUpperCase(Locale.ROOT);
    return switch (s) {
      case "FRAGELLA", "COMMUNITY" -> s;
      default -> throw new ApiException("INVALID_REVIEW");
    };
  }

  private String toJsonOrNull(Map<String, Integer> map) {
    if (map == null || map.isEmpty()) return null;
    try {
      return objectMapper.writeValueAsString(map);
    } catch (JsonProcessingException e) {
      throw new ApiException("INVALID_REVIEW");
    }
  }

  private String safeTrim(String raw) {
    return raw == null ? "" : raw.trim();
  }

  private String nullIfBlank(String raw) {
    String trimmed = safeTrim(raw);
    return trimmed.isEmpty() ? null : trimmed;
  }
}
