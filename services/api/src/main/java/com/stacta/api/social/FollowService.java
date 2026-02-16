package com.stacta.api.social;

import com.stacta.api.config.ApiException;
import com.stacta.api.social.dto.FollowActionResponse;
import com.stacta.api.social.dto.NotificationItem;
import com.stacta.api.social.dto.NotificationsResponse;
import com.stacta.api.social.dto.PendingFollowRequestItem;
import com.stacta.api.social.dto.PendingFollowRequestsResponse;
import com.stacta.api.social.dto.UnreadNotificationsResponse;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Base64;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowService {

  private static final String PENDING = "PENDING";
  private static final String ACCEPTED = "ACCEPTED";
  private static final String FOLLOWED_YOU = "FOLLOWED_YOU";
  private static final String FOLLOWED_YOU_BACK = "FOLLOWED_YOU_BACK";

  private final FollowRepository follows;
  private final NotificationEventRepository notifications;
  private final UserRepository users;

  public FollowService(FollowRepository follows, NotificationEventRepository notifications, UserRepository users) {
    this.follows = follows;
    this.notifications = notifications;
    this.users = users;
  }

  @Transactional
  public FollowActionResponse followByUsername(String viewerSub, String username) {
    User me = getViewer(viewerSub);
    User target = users.findByUsernameIgnoreCase(normalizeUsername(username))
      .orElseThrow(() -> new ApiException("USER_NOT_FOUND"));

    if (me.getId().equals(target.getId())) {
      throw new ApiException("INVALID_FOLLOW_TARGET");
    }

    var existing = follows.findByFollowerUserIdAndFollowingUserId(me.getId(), target.getId()).orElse(null);
    if (existing != null) {
      return new FollowActionResponse(existing.getStatus());
    }

    FollowRelationship fr = new FollowRelationship();
    fr.setFollowerUserId(me.getId());
    fr.setFollowingUserId(target.getId());
    fr.setStatus(target.isPrivate() ? PENDING : ACCEPTED);
    if (ACCEPTED.equals(fr.getStatus())) {
      fr.setRespondedAt(Instant.now());
    }
    follows.save(fr);
    if (ACCEPTED.equals(fr.getStatus())) {
      users.bumpFollowingCount(me.getId(), 1);
      users.bumpFollowersCount(target.getId(), 1);
      appendFollowNotification(fr);
    }
    return new FollowActionResponse(fr.getStatus());
  }

  @Transactional
  public void unfollowByUsername(String viewerSub, String username) {
    User me = getViewer(viewerSub);
    User target = users.findByUsernameIgnoreCase(normalizeUsername(username))
      .orElseThrow(() -> new ApiException("USER_NOT_FOUND"));

    follows.findByFollowerUserIdAndFollowingUserId(me.getId(), target.getId())
      .ifPresent(rel -> {
        follows.delete(rel);
        if (ACCEPTED.equals(rel.getStatus())) {
          users.bumpFollowingCount(me.getId(), -1);
          users.bumpFollowersCount(target.getId(), -1);
        }
      });
  }

  @Transactional(readOnly = true)
  public PendingFollowRequestsResponse pendingRequests(String viewerSub, int limit, String cursor) {
    User me = getViewer(viewerSub);
    int safeLimit = Math.max(1, Math.min(limit, 50));
    CursorToken token = parseCursor(cursor);

    var rows = follows.listPendingRequestViews(
      me.getId(),
      token == null ? null : token.at(),
      token == null ? null : token.id(),
      PageRequest.of(0, safeLimit + 1)
    );

    boolean hasMore = rows.size() > safeLimit;
    var pageRows = hasMore ? rows.subList(0, safeLimit) : rows;
    var items = pageRows.stream()
      .map(v -> new PendingFollowRequestItem(v.getId(), v.getUsername(), v.getDisplayName(), v.getAvatarUrl(), v.getRequestedAt()))
      .toList();

    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      var last = pageRows.get(pageRows.size() - 1);
      nextCursor = encodeCursor(last.getRequestedAt(), last.getId());
    }
    return new PendingFollowRequestsResponse(items, nextCursor);
  }

  @Transactional
  public void acceptRequest(String viewerSub, UUID requestId) {
    User me = getViewer(viewerSub);
    FollowRelationship request = follows.findById(requestId)
      .orElseThrow(() -> new ApiException("FOLLOW_REQUEST_NOT_FOUND"));

    if (!request.getFollowingUserId().equals(me.getId()) || !PENDING.equals(request.getStatus())) {
      throw new ApiException("FOLLOW_REQUEST_NOT_FOUND");
    }

    request.setStatus(ACCEPTED);
    request.setRespondedAt(Instant.now());
    follows.save(request);
    users.bumpFollowingCount(request.getFollowerUserId(), 1);
    users.bumpFollowersCount(request.getFollowingUserId(), 1);
    appendFollowNotification(request);
  }

  @Transactional
  public void declineRequest(String viewerSub, UUID requestId) {
    User me = getViewer(viewerSub);
    FollowRelationship request = follows.findById(requestId)
      .orElseThrow(() -> new ApiException("FOLLOW_REQUEST_NOT_FOUND"));

    if (!request.getFollowingUserId().equals(me.getId()) || !PENDING.equals(request.getStatus())) {
      throw new ApiException("FOLLOW_REQUEST_NOT_FOUND");
    }

    follows.delete(request);
  }

  @Transactional(readOnly = true)
  public NotificationsResponse notifications(String viewerSub, int limit, String cursor) {
    User me = getViewer(viewerSub);
    int safeLimit = Math.max(1, Math.min(limit, 50));
    CursorToken token = parseCursor(cursor);

    var rows = notifications.listNotificationEvents(
      me.getId(),
      token == null ? null : token.at(),
      token == null ? null : token.id(),
      PageRequest.of(0, safeLimit + 1)
    );

    boolean hasMore = rows.size() > safeLimit;
    var pageRows = hasMore ? rows.subList(0, safeLimit) : rows;
    var items = pageRows.stream()
      .map(v -> new NotificationItem(
        v.getId(),
        v.getType(),
        v.getActorUsername(),
        v.getActorDisplayName(),
        v.getActorAvatarUrl(),
        v.getCreatedAt(),
        FOLLOWED_YOU_BACK.equals(v.getType())
      ))
      .toList();

    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      var last = pageRows.get(pageRows.size() - 1);
      nextCursor = encodeCursor(last.getCreatedAt(), last.getId());
    }
    return new NotificationsResponse(items, nextCursor);
  }

  @Transactional
  public void markNotificationsSeen(String viewerSub) {
    User me = getViewer(viewerSub);
    me.setNotificationsSeenAt(Instant.now());
    users.save(me);
  }

  @Transactional(readOnly = true)
  public UnreadNotificationsResponse unreadCount(String viewerSub) {
    User me = getViewer(viewerSub);
    long unread = notifications.countAfter(me.getId(), me.getNotificationsSeenAt());
    return new UnreadNotificationsResponse(unread);
  }

  @Transactional(readOnly = true)
  public boolean isFollowing(UUID followerUserId, UUID followingUserId) {
    return follows.existsByFollowerUserIdAndFollowingUserIdAndStatus(followerUserId, followingUserId, ACCEPTED);
  }

  @Transactional(readOnly = true)
  public boolean hasPendingRequest(UUID followerUserId, UUID followingUserId) {
    return follows.existsByFollowerUserIdAndFollowingUserIdAndStatus(followerUserId, followingUserId, PENDING);
  }

  private User getViewer(String viewerSub) {
    return users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
  }

  private String normalizeUsername(String raw) {
    String cleaned = raw == null ? "" : raw
      .trim()
      .toLowerCase()
      .replaceAll("^@+", "")
      .replaceAll("[^a-z0-9_]", "");
    return cleaned.length() > 20 ? cleaned.substring(0, 20) : cleaned;
  }

  private record CursorToken(Instant at, UUID id) {}

  private CursorToken parseCursor(String cursor) {
    if (cursor == null || cursor.isBlank()) return null;
    try {
      String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      String[] parts = decoded.split("\\|", 2);
      if (parts.length != 2) throw new IllegalArgumentException("invalid cursor");
      Instant at = Instant.parse(parts[0]);
      UUID id = UUID.fromString(parts[1]);
      return new CursorToken(at, id);
    } catch (Exception e) {
      throw new ApiException("INVALID_CURSOR");
    }
  }

  private String encodeCursor(Instant at, UUID id) {
    String raw = at.toString() + "|" + id;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  private void appendFollowNotification(FollowRelationship follow) {
    NotificationEvent event = new NotificationEvent();
    event.setRecipientUserId(follow.getFollowingUserId());
    event.setActorUserId(follow.getFollowerUserId());
    event.setSourceFollowId(follow.getId());
    boolean followedBack = follows.existsByFollowerUserIdAndFollowingUserIdAndStatus(
      follow.getFollowingUserId(),
      follow.getFollowerUserId(),
      ACCEPTED
    );
    event.setType(followedBack ? FOLLOWED_YOU_BACK : FOLLOWED_YOU);
    event.setCreatedAt(follow.getRespondedAt() != null ? follow.getRespondedAt() : follow.getCreatedAt());
    notifications.save(event);
  }
}
