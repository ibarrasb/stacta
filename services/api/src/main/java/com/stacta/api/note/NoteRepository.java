package com.stacta.api.note;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<NoteEntity, UUID> {
  Optional<NoteEntity> findByNormalizedName(String normalizedName);

  List<NoteEntity> findByNameContainingIgnoreCaseOrderByUsageCountDescNameAsc(String name, Pageable pageable);
}
