package com.stacta.api.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByCognitoSub(String cognitoSub);
  boolean existsByUsername(String username);
  Optional<User> findByUsernameIgnoreCase(String username);
  boolean existsByUsernameIgnoreCase(String username);
}
