package com.stacta.api.social;

import com.stacta.api.config.ApiException;
import com.stacta.api.social.dto.FeedItem;
import com.stacta.api.social.dto.FeedResponse;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeedService {

  private static final String TAB_FOLLOWING = "FOLLOWING";
  private static final String TAB_POPULAR = "POPULAR";

  private final ActivityEventRepository activities;
  private final UserRepository users;
  private final FollowService follows;

  public FeedService(ActivityEventRepository activities, UserRepository users, FollowService follows) {
    this.activities = activities;
    this.users = users;
    this.follows = follows;
  }

  @Transactional(readOnly = true)
  public FeedResponse list(String viewerSub, String tab, String filter, int limit, String cursor) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String normalizedTab = normalizeTab(tab);
    String normalizedType = normalizeType(filter);
    int safeLimit = Math.max(1, Math.min(limit, 50));

    if (TAB_POPULAR.equals(normalizedTab)) {
      var token = parsePopularCursor(cursor);
      var rows = activities.listPopularFeed(
        me.getId(),
        normalizedType,
        token == null ? null : token.score(),
        token == null ? null : token.createdAt(),
        token == null ? null : token.id(),
        PageRequest.of(0, safeLimit + 1)
      );

      boolean hasMore = rows.size() > safeLimit;
      var pageRows = hasMore ? rows.subList(0, safeLimit) : rows;
      var items = pageRows.stream().map(this::mapView).toList();

      String nextCursor = null;
      if (hasMore && !pageRows.isEmpty()) {
        var last = pageRows.get(pageRows.size() - 1);
        nextCursor = encodePopularCursor(last.getScore(), last.getCreatedAt(), last.getId());
      }
      return new FeedResponse(items, nextCursor);
    }

    var token = parseFollowingCursor(cursor);
    var rows = activities.listFollowingFeed(
      me.getId(),
      normalizedType,
      token == null ? null : token.createdAt(),
      token == null ? null : token.id(),
      PageRequest.of(0, safeLimit + 1)
    );

    boolean hasMore = rows.size() > safeLimit;
    var pageRows = hasMore ? rows.subList(0, safeLimit) : rows;
    var items = pageRows.stream().map(this::mapView).toList();

    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      var last = pageRows.get(pageRows.size() - 1);
      nextCursor = encodeFollowingCursor(last.getCreatedAt(), last.getId());
    }
    return new FeedResponse(items, nextCursor);
  }

  @Transactional(readOnly = true)
  public FeedResponse listMineReviews(String viewerSub, int limit, String cursor) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    int safeLimit = Math.max(1, Math.min(limit, 50));
    var token = parseFollowingCursor(cursor);
    var rows = activities.listMyReviewFeed(
      me.getId(),
      me.getId(),
      token == null ? null : token.createdAt(),
      token == null ? null : token.id(),
      PageRequest.of(0, safeLimit + 1)
    );

    boolean hasMore = rows.size() > safeLimit;
    var pageRows = hasMore ? rows.subList(0, safeLimit) : rows;
    var items = pageRows.stream().map(this::mapView).toList();

    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      var last = pageRows.get(pageRows.size() - 1);
      nextCursor = encodeFollowingCursor(last.getCreatedAt(), last.getId());
    }
    return new FeedResponse(items, nextCursor);
  }

  @Transactional(readOnly = true)
  public FeedResponse listUserReviews(String viewerSub, String username, int limit, String cursor) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    String normalizedUsername = normalizeUsername(username);
    User target = users.findByUsernameIgnoreCase(normalizedUsername)
      .orElseThrow(() -> new ApiException("USER_NOT_FOUND"));

    boolean isOwner = me.getId().equals(target.getId());
    boolean isFollowing = follows.isFollowing(me.getId(), target.getId());
    boolean isVisible = !target.isPrivate() || isOwner || isFollowing;
    if (!isVisible) {
      return new FeedResponse(List.of(), null);
    }

    int safeLimit = Math.max(1, Math.min(limit, 50));
    var token = parseFollowingCursor(cursor);
    var rows = activities.listMyReviewFeed(
      target.getId(),
      me.getId(),
      token == null ? null : token.createdAt(),
      token == null ? null : token.id(),
      PageRequest.of(0, safeLimit + 1)
    );

    boolean hasMore = rows.size() > safeLimit;
    var pageRows = hasMore ? rows.subList(0, safeLimit) : rows;
    var items = pageRows.stream().map(this::mapView).toList();

    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      var last = pageRows.get(pageRows.size() - 1);
      nextCursor = encodeFollowingCursor(last.getCreatedAt(), last.getId());
    }
    return new FeedResponse(items, nextCursor);
  }

  private FeedItem mapView(ActivityEventRepository.ActivityFeedView row) {
    return new FeedItem(
      row.getId(),
      row.getType(),
      row.getActorUsername(),
      row.getActorDisplayName(),
      row.getActorAvatarUrl(),
      row.getTargetUsername(),
      row.getTargetDisplayName(),
      row.getFragranceName(),
      row.getFragranceSource(),
      row.getFragranceExternalId(),
      row.getFragranceImageUrl(),
      row.getCollectionTag(),
      row.getReviewRating(),
      row.getReviewExcerpt(),
      row.getReviewPerformance(),
      row.getReviewSeason(),
      row.getReviewOccasion(),
      row.getLikesCount(),
      row.getCommentsCount(),
      row.getRepostsCount(),
      row.getViewerHasLiked(),
      row.getCreatedAt()
    );
  }

  private String normalizeTab(String raw) {
    if (raw == null || raw.isBlank()) return TAB_FOLLOWING;
    String normalized = raw.trim().toUpperCase();
    if (TAB_FOLLOWING.equals(normalized) || TAB_POPULAR.equals(normalized)) return normalized;
    throw new ApiException("INVALID_FEED_TAB");
  }

  private String normalizeType(String raw) {
    if (raw == null || raw.isBlank() || "ALL".equalsIgnoreCase(raw.trim())) return null;
    String normalized = raw.trim().toUpperCase();
    return switch (normalized) {
      case "REVIEW_POSTED", "COLLECTION_ITEM_ADDED", "WISHLIST_ITEM_ADDED", "USER_FOLLOWED_USER", "REVIEW_REPOSTED" -> normalized;
      default -> throw new ApiException("INVALID_FEED_FILTER");
    };
  }

  private String normalizeUsername(String raw) {
    String cleaned = raw == null ? "" : raw
      .trim()
      .toLowerCase()
      .replaceAll("^@+", "")
      .replaceAll("[^a-z0-9_]", "");
    return cleaned.length() > 20 ? cleaned.substring(0, 20) : cleaned;
  }

  private record FollowingCursor(Instant createdAt, UUID id) {}

  private FollowingCursor parseFollowingCursor(String cursor) {
    if (cursor == null || cursor.isBlank()) return null;
    try {
      String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      String[] parts = decoded.split("\\|", 2);
      if (parts.length != 2) throw new IllegalArgumentException("invalid cursor");
      return new FollowingCursor(Instant.parse(parts[0]), UUID.fromString(parts[1]));
    } catch (Exception e) {
      throw new ApiException("INVALID_CURSOR");
    }
  }

  private String encodeFollowingCursor(Instant createdAt, UUID id) {
    String raw = createdAt + "|" + id;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  private record PopularCursor(int score, Instant createdAt, UUID id) {}

  private PopularCursor parsePopularCursor(String cursor) {
    if (cursor == null || cursor.isBlank()) return null;
    try {
      String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      String[] parts = decoded.split("\\|", 3);
      if (parts.length != 3) throw new IllegalArgumentException("invalid cursor");
      return new PopularCursor(Integer.parseInt(parts[0]), Instant.parse(parts[1]), UUID.fromString(parts[2]));
    } catch (Exception e) {
      throw new ApiException("INVALID_CURSOR");
    }
  }

  private String encodePopularCursor(int score, Instant createdAt, UUID id) {
    String raw = score + "|" + createdAt + "|" + id;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }
}
