package com.stacta.api.user;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByCognitoSub(String cognitoSub);
  boolean existsByUsername(String username);
  Optional<User> findByUsernameIgnoreCase(String username);
  boolean existsByUsernameIgnoreCase(String username);

  @Query("""
    SELECT u
    FROM User u
    WHERE u.username IS NOT NULL
      AND (:viewerSub IS NULL OR u.cognitoSub <> :viewerSub)
      AND (
        :q = ''
        OR LOWER(u.username) LIKE LOWER(CONCAT(:q, '%'))
        OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%'))
      )
    ORDER BY
      CASE
        WHEN LOWER(u.username) = LOWER(:q) THEN 0
        WHEN LOWER(u.username) LIKE LOWER(CONCAT(:q, '%')) THEN 1
        WHEN LOWER(u.displayName) LIKE LOWER(CONCAT(:q, '%')) THEN 2
        ELSE 3
      END,
      LOWER(u.username) ASC
  """)
  List<User> searchUsers(@Param("q") String q, @Param("viewerSub") String viewerSub, Pageable pageable);
}
