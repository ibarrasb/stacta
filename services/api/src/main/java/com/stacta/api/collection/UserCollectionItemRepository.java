package com.stacta.api.collection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserCollectionItemRepository extends JpaRepository<UserCollectionItem, UUID> {
  Optional<UserCollectionItem> findByUserIdAndFragranceSourceAndFragranceExternalId(UUID userId, String fragranceSource, String fragranceExternalId);
  Optional<UserCollectionItem> findByIdAndUserId(UUID id, UUID userId);
  List<UserCollectionItem> findByUserIdOrderByAddedAtDesc(UUID userId);
  long deleteByUserIdAndFragranceSourceAndFragranceExternalId(UUID userId, String fragranceSource, String fragranceExternalId);
  long countByUserId(UUID userId);
}
