package com.stacta.api.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stacta.api.collection.UserCollectionService;
import com.stacta.api.collection.dto.CollectionItemDto;
import com.stacta.api.config.ApiException;
import com.stacta.api.fragrance.FragranceRepository;
import com.stacta.api.social.ActivityEventRepository;
import com.stacta.api.social.FollowService;
import com.stacta.api.upload.UploadImageUrlResolver;
import com.stacta.api.user.dto.MeResponse;
import com.stacta.api.user.dto.OnboardingRequest;
import com.stacta.api.user.dto.UpdateMeRequest;
import com.stacta.api.user.dto.UserProfileResponse;
import com.stacta.api.user.dto.UserSearchItem;
import com.stacta.api.user.dto.CreatorRatingSummary;

@Service
public class UserService {

  private final UserRepository repo;
  private final FollowService followService;
  private final UserCollectionService collectionService;
  private final ActivityEventRepository activityEvents;
  private final FragranceRepository fragrances;
  private final CreatorRatingService creatorRatings;
  private final UploadImageUrlResolver imageUrlResolver;

  public UserService(
    UserRepository repo,
    FollowService followService,
    UserCollectionService collectionService,
    ActivityEventRepository activityEvents,
    FragranceRepository fragrances,
    CreatorRatingService creatorRatings,
    UploadImageUrlResolver imageUrlResolver
  ) {
    this.repo = repo;
    this.followService = followService;
    this.collectionService = collectionService;
    this.activityEvents = activityEvents;
    this.fragrances = fragrances;
    this.creatorRatings = creatorRatings;
    this.imageUrlResolver = imageUrlResolver;
  }

  @Transactional(readOnly = true)
  public Optional<MeResponse> getMe(String sub) {
    return repo.findByCognitoSub(sub).map(this::toMe);
  }

  @Transactional
  public MeResponse upsertOnboarding(String sub, OnboardingRequest req) {
    User u = repo.findByCognitoSub(sub).orElseGet(User::new);
    u.setCognitoSub(sub);
    u.setDisplayName(req.displayName().trim());

    //username optional, but if provided enforce normalization + validation + uniqueness
    if (req.username() != null && !req.username().trim().isEmpty()) {
      String username = normalizeUsername(req.username());

      // 3–20 chars, starts with letter/number, only letters/numbers/underscore
      if (!username.matches("^[a-z0-9][a-z0-9_]{2,19}$")) {
        throw new ApiException("INVALID_USERNAME");
      }

      // If another user already has this username (case-insensitive), reject
      repo.findByUsernameIgnoreCase(username).ifPresent(existing -> {
        if (!existing.getCognitoSub().equals(sub)) {
          throw new ApiException("USERNAME_TAKEN");
        }
      });

      u.setUsername(username);
    }

    User saved = repo.save(u);
    return toMe(saved);
  }

  @Transactional
  public MeResponse updateMe(String sub, UpdateMeRequest req) {
    User user = repo.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String displayName = req.displayName().trim();
    if (displayName.isEmpty()) {
      throw new ApiException("INVALID_DISPLAY_NAME");
    }

    String bio = req.bio() == null ? null : req.bio().trim();
    if (bio != null && bio.isEmpty()) {
      bio = null;
    }

    user.setDisplayName(displayName);
    user.setBio(bio);
    if (req.avatarObjectKey() != null) {
      String avatarObjectKey = req.avatarObjectKey().trim();
      if (avatarObjectKey.isEmpty()) {
        user.setAvatarObjectKey(null);
      } else {
        user.setAvatarObjectKey(avatarObjectKey);
      }
      user.setAvatarUrl(imageUrlResolver.resolveFromObjectKey(user.getAvatarObjectKey()));
    }
    if (req.isPrivate() != null) {
      user.setPrivate(req.isPrivate());
    }

    User saved = repo.save(user);
    return toMe(saved);
  }

  @Transactional(readOnly = true)
  public List<UserSearchItem> searchUsers(String q, String viewerSub, int limit) {
    String query = q == null ? "" : q.trim().toLowerCase();
    if (query.isEmpty()) return List.of();

    int safeLimit = Math.max(1, Math.min(limit, 20));
    var users = repo.searchUsers(query, viewerSub, PageRequest.of(0, safeLimit));
    return users.stream()
      .map(u -> new UserSearchItem(
        u.getUsername(),
        u.getDisplayName(),
        imageUrlResolver.resolveWithFallback(u.getAvatarObjectKey(), u.getAvatarUrl()),
        u.isPrivate()
      ))
      .toList();
  }

  @Transactional(readOnly = true)
  public UserProfileResponse getProfile(String viewerSub, String username) {
    String normalized = normalizeUsername(username);
    if (normalized.isEmpty()) {
      throw new ApiException("USER_NOT_FOUND");
    }

    User target = repo.findByUsernameIgnoreCase(normalized)
      .orElseThrow(() -> new ApiException("USER_NOT_FOUND"));

    User viewer = viewerSub == null ? null : repo.findByCognitoSub(viewerSub).orElse(null);
    boolean isOwner = viewer != null && viewer.getId().equals(target.getId());
    boolean isFollowing = viewer != null && followService.isFollowing(viewer.getId(), target.getId());
    boolean followsYou = viewer != null && followService.isFollowing(target.getId(), viewer.getId());
    boolean followRequested = viewer != null && followService.hasPendingRequest(viewer.getId(), target.getId());
    boolean isVisible = !target.isPrivate() || isOwner || isFollowing;
    long followersCount = target.getFollowersCount();
    long followingCount = target.getFollowingCount();
    CreatorRatingSummary creatorSummary = creatorRatings.getSummaryByCreatorId(viewerSub, target.getId());
    long collectionCount = isVisible ? collectionService.countForUser(target.getId()) : 0;
    long wishlistCount = isVisible ? collectionService.countWishlistForUser(target.getId()) : 0;
    long reviewCount = isVisible ? activityEvents.countByActorUserIdAndType(target.getId(), "REVIEW_POSTED") : 0;
    List<CollectionItemDto> communityFragrances = isVisible
      ? listCommunityFragrances(target.getId(), isOwner)
      : List.of();
    long communityFragranceCount = communityFragrances.size();
    List<CollectionItemDto> collectionItems = isVisible
      ? collectionService.listForUser(target.getId())
      : List.of();
    List<CollectionItemDto> wishlistItems = isVisible
      ? collectionService.listWishlistForUser(target.getId())
      : List.of();
    List<CollectionItemDto> topFragrances = isVisible
      ? collectionService.listTopForUser(target.getId())
      : List.of();

    return new UserProfileResponse(
      target.getUsername(),
      target.getDisplayName(),
      imageUrlResolver.resolveWithFallback(target.getAvatarObjectKey(), target.getAvatarUrl()),
      target.getAvatarObjectKey(),
      isVisible ? target.getBio() : null,
      target.isVerified(),
      target.isPrivate(),
      isOwner,
      isVisible,
      followersCount,
      followingCount,
      creatorSummary.average(),
      creatorSummary.count(),
      creatorSummary.userRating(),
      collectionCount,
      wishlistCount,
      reviewCount,
      communityFragranceCount,
      collectionItems,
      wishlistItems,
      topFragrances,
      communityFragrances,
      followsYou,
      isFollowing,
      followRequested
    );
  }

  private String normalizeUsername(String raw) {
    String cleaned = raw
      .trim()
      .toLowerCase()
      .replaceAll("^@+", "")
      .replaceAll("[^a-z0-9_]", "");

    return cleaned.length() > 20 ? cleaned.substring(0, 20) : cleaned;
  }

  private MeResponse toMe(User u) {
    CreatorRatingSummary creatorSummary = creatorRatings.getSummaryByCreatorId(u.getCognitoSub(), u.getId());
    return new MeResponse(
      u.getId(),
      u.getCognitoSub(),
      u.getUsername(),
      u.getDisplayName(),
      u.getBio(),
      imageUrlResolver.resolveWithFallback(u.getAvatarObjectKey(), u.getAvatarUrl()),
      u.getAvatarObjectKey(),
      u.isVerified(),
      u.isAdmin(),
      u.isPrivate(),
      u.getFollowersCount(),
      u.getFollowingCount(),
      creatorSummary.average(),
      creatorSummary.count(),
      collectionService.countForUser(u.getId()),
      collectionService.countWishlistForUser(u.getId()),
      activityEvents.countByActorUserIdAndType(u.getId(), "REVIEW_POSTED"),
      fragrances.countByExternalSourceAndCreatedByUserId("COMMUNITY", u.getId()),
      collectionService.listForUser(u.getId()),
      collectionService.listWishlistForUser(u.getId()),
      collectionService.listTopForUser(u.getId()),
      listCommunityFragrances(u.getId(), true),
      u.getCreatedAt(),
      u.getUpdatedAt()
    );
  }

  private List<CollectionItemDto> listCommunityFragrances(java.util.UUID userId, boolean includePrivate) {
    return fragrances.listCommunityByCreator(userId, includePrivate, PageRequest.of(0, 100))
      .stream()
      .map(f -> new CollectionItemDto(
        "COMMUNITY",
        f.getExternalId(),
        f.getName(),
        f.getBrand(),
        f.getImageUrl(),
        null,
        null,
        f.getCreatedAt() == null ? null : f.getCreatedAt().toInstant()
      ))
      .toList();
  }
}
