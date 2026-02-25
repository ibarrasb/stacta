package com.stacta.api.collection;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWishlistItemRepository extends JpaRepository<UserWishlistItem, UUID> {
  Optional<UserWishlistItem> findByUserIdAndFragranceSourceAndFragranceExternalId(UUID userId, String fragranceSource, String fragranceExternalId);
  List<UserWishlistItem> findByUserIdOrderByAddedAtDesc(UUID userId);
  long deleteByUserIdAndFragranceSourceAndFragranceExternalId(UUID userId, String fragranceSource, String fragranceExternalId);
  long countByUserId(UUID userId);
}
