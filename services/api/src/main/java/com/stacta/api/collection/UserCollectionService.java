package com.stacta.api.collection;

import com.stacta.api.collection.dto.AddCollectionItemRequest;
import com.stacta.api.collection.dto.AddCollectionItemResponse;
import com.stacta.api.collection.dto.CollectionItemDto;
import com.stacta.api.config.ApiException;
import com.stacta.api.social.ActivityEvent;
import com.stacta.api.social.ActivityEventRepository;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class UserCollectionService {
  private static final Set<String> ALLOWED_COLLECTION_TAGS = Set.of(
    "BLIND_BUY",
    "SAMPLED_FIRST",
    "RECOMMENDED",
    "HYPE_TREND",
    "DEAL_DISCOUNT",
    "GIFT"
  );

  private final UserCollectionItemRepository items;
  private final UserWishlistItemRepository wishlistItems;
  private final UserTopFragranceRepository topFragrances;
  private final ActivityEventRepository activities;
  private final UserRepository users;

  public UserCollectionService(
    UserCollectionItemRepository items,
    UserWishlistItemRepository wishlistItems,
    UserTopFragranceRepository topFragrances,
    ActivityEventRepository activities,
    UserRepository users
  ) {
    this.items = items;
    this.wishlistItems = wishlistItems;
    this.topFragrances = topFragrances;
    this.activities = activities;
    this.users = users;
  }

  @Transactional
  public AddCollectionItemResponse add(String sub, AddCollectionItemRequest req) {
    User me = users.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String source = normalizeSource(req.source());
    String externalId = normalizeExternalId(req.externalId());
    String name = safeTrim(req.name());
    if (externalId.isEmpty() || isSyntheticRouteId(externalId) || name.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }

    boolean isNew = false;
    UserCollectionItem entity = items.findByUserIdAndFragranceSourceAndFragranceExternalId(me.getId(), source, externalId)
      .orElseGet(() -> {
        UserCollectionItem created = new UserCollectionItem();
        created.setUserId(me.getId());
        created.setFragranceSource(source);
        created.setFragranceExternalId(externalId);
        return created;
      });
    if (entity.getId() == null) {
      isNew = true;
    }

    entity.setFragranceName(name);
    entity.setFragranceBrand(nullIfBlank(req.brand()));
    entity.setFragranceImageUrl(nullIfBlank(req.imageUrl()));
    entity.setCollectionTag(normalizeCollectionTag(req.collectionTag()));

    var saved = items.save(entity);
    if (isNew) {
      appendCollectionActivity(saved);
    }
    return new AddCollectionItemResponse(toDto(saved), isNew ? "ADDED" : "ALREADY_EXISTS");
  }

  @Transactional(readOnly = true)
  public List<CollectionItemDto> listForUser(UUID userId) {
    return items.findByUserIdOrderByAddedAtDesc(userId).stream().map(this::toDto).toList();
  }

  @Transactional
  public void remove(String sub, String source, String externalId) {
    User me = users.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    String normalizedSource = normalizeSource(source);
    String normalizedExternalId = normalizeExternalId(externalId);
    if (normalizedExternalId.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }
    items.deleteByUserIdAndFragranceSourceAndFragranceExternalId(me.getId(), normalizedSource, normalizedExternalId);
  }

  @Transactional(readOnly = true)
  public long countForUser(UUID userId) {
    return items.countByUserId(userId);
  }

  @Transactional
  public CollectionItemDto addToWishlist(String sub, AddCollectionItemRequest req) {
    User me = users.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String source = normalizeSource(req.source());
    String externalId = normalizeExternalId(req.externalId());
    String name = safeTrim(req.name());
    if (externalId.isEmpty() || isSyntheticRouteId(externalId) || name.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }

    boolean isNew = false;
    UserWishlistItem entity = wishlistItems.findByUserIdAndFragranceSourceAndFragranceExternalId(me.getId(), source, externalId)
      .orElseGet(() -> {
        UserWishlistItem created = new UserWishlistItem();
        created.setUserId(me.getId());
        created.setFragranceSource(source);
        created.setFragranceExternalId(externalId);
        return created;
      });
    if (entity.getId() == null) {
      isNew = true;
    }

    entity.setFragranceName(name);
    entity.setFragranceBrand(nullIfBlank(req.brand()));
    entity.setFragranceImageUrl(nullIfBlank(req.imageUrl()));
    var saved = wishlistItems.save(entity);
    if (isNew) {
      appendWishlistActivity(saved);
    }
    return toDto(saved);
  }

  @Transactional
  public void removeFromWishlist(String sub, String source, String externalId) {
    User me = users.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    String normalizedSource = normalizeSource(source);
    String normalizedExternalId = normalizeExternalId(externalId);
    if (normalizedExternalId.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }
    wishlistItems.deleteByUserIdAndFragranceSourceAndFragranceExternalId(me.getId(), normalizedSource, normalizedExternalId);
  }

  @Transactional(readOnly = true)
  public List<CollectionItemDto> listWishlistForUser(UUID userId) {
    return wishlistItems.findByUserIdOrderByAddedAtDesc(userId).stream().map(this::toDto).toList();
  }

  @Transactional(readOnly = true)
  public long countWishlistForUser(UUID userId) {
    return wishlistItems.countByUserId(userId);
  }

  @Transactional
  public void addTopFragrance(String sub, String source, String externalId) {
    User me = users.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    String normalizedSource = normalizeSource(source);
    String normalizedExternalId = normalizeExternalId(externalId);
    if (normalizedExternalId.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }

    UserCollectionItem collectionItem = items
      .findByUserIdAndFragranceSourceAndFragranceExternalId(me.getId(), normalizedSource, normalizedExternalId)
      .orElseThrow(() -> new ApiException("COLLECTION_ITEM_NOT_FOUND"));

    if (topFragrances.existsByUserIdAndUserCollectionItemId(me.getId(), collectionItem.getId())) {
      return;
    }

    if (topFragrances.countByUserId(me.getId()) >= 3) {
      throw new ApiException("TOP_FRAGRANCES_LIMIT_REACHED");
    }

    UserTopFragrance row = new UserTopFragrance();
    row.setUserId(me.getId());
    row.setUserCollectionItemId(collectionItem.getId());
    topFragrances.save(row);
  }

  @Transactional
  public void removeTopFragrance(String sub, String source, String externalId) {
    User me = users.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    String normalizedSource = normalizeSource(source);
    String normalizedExternalId = normalizeExternalId(externalId);
    if (normalizedExternalId.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }

    UserCollectionItem collectionItem = items
      .findByUserIdAndFragranceSourceAndFragranceExternalId(me.getId(), normalizedSource, normalizedExternalId)
      .orElse(null);
    if (collectionItem == null) return;

    topFragrances.findByUserIdAndUserCollectionItemId(me.getId(), collectionItem.getId())
      .ifPresent(topFragrances::delete);
  }

  @Transactional(readOnly = true)
  public List<CollectionItemDto> listTopForUser(UUID userId) {
    return topFragrances.findByUserIdOrderByCreatedAtAsc(userId).stream()
      .map(row -> items.findByIdAndUserId(row.getUserCollectionItemId(), userId).orElse(null))
      .filter(java.util.Objects::nonNull)
      .map(this::toDto)
      .toList();
  }

  private CollectionItemDto toDto(UserCollectionItem row) {
    return new CollectionItemDto(
      row.getFragranceSource(),
      row.getFragranceExternalId(),
      row.getFragranceName(),
      row.getFragranceBrand(),
      row.getFragranceImageUrl(),
      row.getCollectionTag(),
      row.getAddedAt()
    );
  }

  private CollectionItemDto toDto(UserWishlistItem row) {
    return new CollectionItemDto(
      row.getFragranceSource(),
      row.getFragranceExternalId(),
      row.getFragranceName(),
      row.getFragranceBrand(),
      row.getFragranceImageUrl(),
      null,
      row.getAddedAt()
    );
  }

  private String normalizeSource(String raw) {
    String s = safeTrim(raw).toUpperCase(Locale.ROOT);
    return switch (s) {
      case "FRAGELLA", "COMMUNITY" -> s;
      default -> throw new ApiException("INVALID_COLLECTION_ITEM");
    };
  }

  private String normalizeExternalId(String raw) {
    return safeTrim(raw).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }

  private String normalizeCollectionTag(String raw) {
    String normalized = safeTrim(raw).toUpperCase(Locale.ROOT);
    if (normalized.isEmpty()) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }
    if (!ALLOWED_COLLECTION_TAGS.contains(normalized)) {
      throw new ApiException("INVALID_COLLECTION_ITEM");
    }
    return normalized;
  }

  private boolean isSyntheticRouteId(String externalId) {
    return externalId.matches("^f_[0-9a-f-]+_[0-9]+$");
  }

  private String safeTrim(String raw) {
    return raw == null ? "" : raw.trim();
  }

  private String nullIfBlank(String raw) {
    String trimmed = safeTrim(raw);
    return trimmed.isEmpty() ? null : trimmed;
  }

  private void appendCollectionActivity(UserCollectionItem item) {
    ActivityEvent event = new ActivityEvent();
    event.setActorUserId(item.getUserId());
    event.setType("COLLECTION_ITEM_ADDED");
    event.setFragranceName(item.getFragranceName());
    event.setFragranceSource(item.getFragranceSource());
    event.setFragranceExternalId(item.getFragranceExternalId());
    event.setFragranceImageUrl(item.getFragranceImageUrl());
    event.setCollectionTag(item.getCollectionTag());
    activities.save(event);
  }

  private void appendWishlistActivity(UserWishlistItem item) {
    ActivityEvent event = new ActivityEvent();
    event.setActorUserId(item.getUserId());
    event.setType("WISHLIST_ITEM_ADDED");
    event.setFragranceName(item.getFragranceName());
    event.setFragranceSource(item.getFragranceSource());
    event.setFragranceExternalId(item.getFragranceExternalId());
    event.setFragranceImageUrl(item.getFragranceImageUrl());
    activities.save(event);
  }
}
