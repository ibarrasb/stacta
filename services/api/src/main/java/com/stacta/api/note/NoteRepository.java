package com.stacta.api.note;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<NoteEntity, UUID> {
  Optional<NoteEntity> findByNormalizedName(String normalizedName);

  @Query("""
    SELECT n
    FROM NoteEntity n
    WHERE n.name ILIKE CONCAT('%', :q, '%')
    ORDER BY n.usageCount DESC, n.name ASC
  """)
  List<NoteEntity> searchByNameContains(@Param("q") String q, Pageable pageable);

  List<NoteEntity> findAllByOrderByUsageCountDescNameAsc(Pageable pageable);

  List<NoteEntity> findTop40ByNormalizedNameStartingWithOrderByUsageCountDescNameAsc(String prefix);
}
