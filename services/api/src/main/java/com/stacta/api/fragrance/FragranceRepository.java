package com.stacta.api.fragrance;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FragranceRepository extends JpaRepository<Fragrance, UUID> {

  Optional<Fragrance> findByExternalSourceAndExternalId(String externalSource, String externalId);

  @Query("""
    SELECT f FROM Fragrance f
    WHERE f.externalSource = 'COMMUNITY'
      AND (f.visibility = 'PUBLIC' OR f.createdByUserId = :userId)
      AND (
        LOWER(CONCAT(f.brand, ' ', f.name)) LIKE LOWER(CONCAT('%', :q, '%'))
        OR LOWER(f.brand) LIKE LOWER(CONCAT('%', :q, '%'))
        OR LOWER(f.name) LIKE LOWER(CONCAT('%', :q, '%'))
      )
    ORDER BY f.updatedAt DESC
  """)
  List<Fragrance> searchCommunity(String q, UUID userId, Pageable pageable);
}
