package com.stacta.api.social;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import com.stacta.api.config.ApiException;
import com.stacta.api.social.dto.FollowActionResponse;
import com.stacta.api.social.dto.UnreadNotificationsResponse;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

  @Mock private FollowRepository follows;
  @Mock private NotificationEventRepository notifications;
  @Mock private ActivityEventRepository activities;
  @Mock private UserRepository users;

  @InjectMocks private FollowService service;

  private static final String VIEWER_SUB = "viewer-sub";

  private User viewer;
  private User targetPublic;
  private User targetPrivate;

  @BeforeEach
  void setUp() {
    viewer = user(UUID.randomUUID(), VIEWER_SUB, "viewer", false, Instant.now().minusSeconds(600));
    targetPublic = user(UUID.randomUUID(), "public-sub", "public_user", false, Instant.now().minusSeconds(600));
    targetPrivate = user(UUID.randomUUID(), "private-sub", "private_user", true, Instant.now().minusSeconds(600));

    lenient().when(users.findByCognitoSub(VIEWER_SUB)).thenReturn(Optional.of(viewer));
    lenient().when(users.findByUsernameIgnoreCase("public_user")).thenReturn(Optional.of(targetPublic));
    lenient().when(users.findByUsernameIgnoreCase("private_user")).thenReturn(Optional.of(targetPrivate));
  }

  @Test
  void followPublicUserShouldCreateAcceptedAndBumpCounters() {
    when(follows.findByFollowerUserIdAndFollowingUserId(viewer.getId(), targetPublic.getId()))
      .thenReturn(Optional.empty());
    when(follows.existsByFollowerUserIdAndFollowingUserIdAndStatus(targetPublic.getId(), viewer.getId(), "ACCEPTED"))
      .thenReturn(false);

    FollowActionResponse response = service.followByUsername(VIEWER_SUB, "public_user");

    assertEquals("ACCEPTED", response.status());
    ArgumentCaptor<FollowRelationship> rel = ArgumentCaptor.forClass(FollowRelationship.class);
    verify(follows).save(rel.capture());
    assertEquals("ACCEPTED", rel.getValue().getStatus());
    verify(users).bumpFollowingCount(viewer.getId(), 1);
    verify(users).bumpFollowersCount(targetPublic.getId(), 1);
    verify(notifications).save(any(NotificationEvent.class));
    verify(activities).save(any(ActivityEvent.class));
  }

  @Test
  void followPrivateUserShouldCreatePendingAndNotBumpCounters() {
    when(follows.findByFollowerUserIdAndFollowingUserId(viewer.getId(), targetPrivate.getId()))
      .thenReturn(Optional.empty());

    FollowActionResponse response = service.followByUsername(VIEWER_SUB, "private_user");

    assertEquals("PENDING", response.status());
    ArgumentCaptor<FollowRelationship> rel = ArgumentCaptor.forClass(FollowRelationship.class);
    verify(follows).save(rel.capture());
    assertEquals("PENDING", rel.getValue().getStatus());
    verify(users, never()).bumpFollowingCount(any(), anyLong());
    verify(users, never()).bumpFollowersCount(any(), anyLong());
    verify(notifications, never()).save(any(NotificationEvent.class));
    verify(activities, never()).save(any(ActivityEvent.class));
  }

  @Test
  void acceptPendingRequestShouldBumpCounters() {
    FollowRelationship rel = relationship(UUID.randomUUID(), targetPrivate.getId(), viewer.getId(), "PENDING");
    when(follows.findById(rel.getId())).thenReturn(Optional.of(rel));

    service.acceptRequest(VIEWER_SUB, rel.getId());

    verify(follows).save(rel);
    assertEquals("ACCEPTED", rel.getStatus());
    verify(users).bumpFollowingCount(targetPrivate.getId(), 1);
    verify(users).bumpFollowersCount(viewer.getId(), 1);
    verify(notifications).save(any(NotificationEvent.class));
    verify(activities).save(any(ActivityEvent.class));
  }

  @Test
  void unfollowAcceptedShouldDecrementCounters() {
    FollowRelationship rel = relationship(UUID.randomUUID(), viewer.getId(), targetPublic.getId(), "ACCEPTED");
    when(follows.findByFollowerUserIdAndFollowingUserId(viewer.getId(), targetPublic.getId()))
      .thenReturn(Optional.of(rel));

    service.unfollowByUsername(VIEWER_SUB, "public_user");

    verify(activities).deleteBySourceFollowId(rel.getId());
    verify(follows).delete(rel);
    verify(users).bumpFollowingCount(viewer.getId(), -1);
    verify(users).bumpFollowersCount(targetPublic.getId(), -1);
  }

  @Test
  void unfollowPendingShouldNotDecrementCounters() {
    FollowRelationship rel = relationship(UUID.randomUUID(), viewer.getId(), targetPrivate.getId(), "PENDING");
    when(follows.findByFollowerUserIdAndFollowingUserId(viewer.getId(), targetPrivate.getId()))
      .thenReturn(Optional.of(rel));

    service.unfollowByUsername(VIEWER_SUB, "private_user");

    verify(activities, never()).deleteBySourceFollowId(any());
    verify(follows).delete(rel);
    verify(users, never()).bumpFollowingCount(any(), anyLong());
    verify(users, never()).bumpFollowersCount(any(), anyLong());
  }

  @Test
  void followSelfShouldThrow() {
    when(users.findByUsernameIgnoreCase("viewer")).thenReturn(Optional.of(viewer));

    assertThrows(ApiException.class, () -> service.followByUsername(VIEWER_SUB, "viewer"));
  }

  @Test
  void unreadCountShouldUseNotificationEventsSinceSeen() {
    when(notifications.countAfter(eq(viewer.getId()), any())).thenReturn(3L);

    UnreadNotificationsResponse response = service.unreadCount(VIEWER_SUB);

    assertEquals(3L, response.count());
    verify(notifications, times(1)).countAfter(eq(viewer.getId()), any());
  }

  @Test
  void deleteNotificationShouldSoftDeleteForRecipient() {
    UUID notificationId = UUID.randomUUID();
    when(notifications.softDeleteByIdForRecipient(eq(viewer.getId()), eq(notificationId), any())).thenReturn(1);

    boolean deleted = service.deleteNotification(VIEWER_SUB, notificationId);

    assertTrue(deleted);
    verify(notifications, times(1)).softDeleteByIdForRecipient(eq(viewer.getId()), eq(notificationId), any());
  }

  @Test
  void clearReadNotificationsShouldSoftDeleteReadRows() {
    when(notifications.softDeleteAllReadForRecipient(eq(viewer.getId()), eq(viewer.getNotificationsSeenAt()), any()))
      .thenReturn(4);

    int cleared = service.clearReadNotifications(VIEWER_SUB);

    assertEquals(4, cleared);
    verify(notifications, times(1))
      .softDeleteAllReadForRecipient(eq(viewer.getId()), eq(viewer.getNotificationsSeenAt()), any());
  }

  private static User user(UUID id, String sub, String username, boolean isPrivate, Instant seenAt) {
    User u = new User();
    setField(u, "id", id);
    u.setCognitoSub(sub);
    u.setUsername(username);
    u.setDisplayName(username);
    u.setPrivate(isPrivate);
    u.setNotificationsSeenAt(seenAt);
    return u;
  }

  private static FollowRelationship relationship(UUID id, UUID followerId, UUID followingId, String status) {
    FollowRelationship fr = new FollowRelationship();
    setField(fr, "id", id);
    fr.setFollowerUserId(followerId);
    fr.setFollowingUserId(followingId);
    fr.setStatus(status);
    return fr;
  }

  private static void setField(Object target, String name, Object value) {
    try {
      var field = target.getClass().getDeclaredField(name);
      field.setAccessible(true);
      field.set(target, value);
    } catch (Exception e) {
      throw new RuntimeException("Failed setting test field: " + name, e);
    }
  }
}
