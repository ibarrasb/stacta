package com.stacta.api.fragrance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FragranceRepository extends JpaRepository<Fragrance, UUID> {
  Optional<Fragrance> findByExternalSourceAndExternalId(String externalSource, String externalId);
}
