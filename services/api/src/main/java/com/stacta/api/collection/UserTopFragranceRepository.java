package com.stacta.api.collection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserTopFragranceRepository extends JpaRepository<UserTopFragrance, UUID> {
  long countByUserId(UUID userId);
  boolean existsByUserIdAndUserCollectionItemId(UUID userId, UUID userCollectionItemId);
  Optional<UserTopFragrance> findByUserIdAndUserCollectionItemId(UUID userId, UUID userCollectionItemId);
  List<UserTopFragrance> findByUserIdOrderByCreatedAtAsc(UUID userId);
}
