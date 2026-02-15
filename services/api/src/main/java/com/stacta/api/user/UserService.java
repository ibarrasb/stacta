package com.stacta.api.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stacta.api.config.ApiException;
import com.stacta.api.user.dto.MeResponse;
import com.stacta.api.user.dto.OnboardingRequest;
import com.stacta.api.user.dto.UpdateMeRequest;
import com.stacta.api.user.dto.UserProfileResponse;
import com.stacta.api.user.dto.UserSearchItem;

@Service
public class UserService {

  private final UserRepository repo;

  public UserService(UserRepository repo) {
    this.repo = repo;
  }

  @Transactional(readOnly = true)
  public Optional<MeResponse> getMe(String sub) {
    return repo.findByCognitoSub(sub).map(this::toMe);
  }

  @Transactional
  public MeResponse upsertOnboarding(String sub, OnboardingRequest req) {
    User u = repo.findByCognitoSub(sub).orElseGet(User::new);
    u.setCognitoSub(sub);
    u.setDisplayName(req.displayName().trim());

    //username optional, but if provided enforce normalization + validation + uniqueness
    if (req.username() != null && !req.username().trim().isEmpty()) {
      String username = normalizeUsername(req.username());

      // 3–20 chars, starts with letter/number, only letters/numbers/underscore
      if (!username.matches("^[a-z0-9][a-z0-9_]{2,19}$")) {
        throw new ApiException("INVALID_USERNAME");
      }

      // If another user already has this username (case-insensitive), reject
      repo.findByUsernameIgnoreCase(username).ifPresent(existing -> {
        if (!existing.getCognitoSub().equals(sub)) {
          throw new ApiException("USERNAME_TAKEN");
        }
      });

      u.setUsername(username);
    }

    User saved = repo.save(u);
    return toMe(saved);
  }

  @Transactional
  public MeResponse updateMe(String sub, UpdateMeRequest req) {
    User user = repo.findByCognitoSub(sub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String displayName = req.displayName().trim();
    if (displayName.isEmpty()) {
      throw new ApiException("INVALID_DISPLAY_NAME");
    }

    String bio = req.bio() == null ? null : req.bio().trim();
    if (bio != null && bio.isEmpty()) {
      bio = null;
    }

    user.setDisplayName(displayName);
    user.setBio(bio);
    if (req.isPrivate() != null) {
      user.setPrivate(req.isPrivate());
    }

    User saved = repo.save(user);
    return toMe(saved);
  }

  @Transactional(readOnly = true)
  public List<UserSearchItem> searchUsers(String q, String viewerSub, int limit) {
    String query = q == null ? "" : q.trim().toLowerCase();
    if (query.isEmpty()) return List.of();

    int safeLimit = Math.max(1, Math.min(limit, 20));
    var users = repo.searchUsers(query, viewerSub, PageRequest.of(0, safeLimit));
    return users.stream()
      .map(u -> new UserSearchItem(
        u.getUsername(),
        u.getDisplayName(),
        u.getAvatarUrl(),
        u.isPrivate()
      ))
      .toList();
  }

  @Transactional(readOnly = true)
  public UserProfileResponse getProfile(String viewerSub, String username) {
    String normalized = normalizeUsername(username);
    if (normalized.isEmpty()) {
      throw new ApiException("USER_NOT_FOUND");
    }

    User target = repo.findByUsernameIgnoreCase(normalized)
      .orElseThrow(() -> new ApiException("USER_NOT_FOUND"));

    User viewer = viewerSub == null ? null : repo.findByCognitoSub(viewerSub).orElse(null);
    boolean isOwner = viewer != null && viewer.getId().equals(target.getId());
    boolean isVisible = !target.isPrivate() || isOwner;

    return new UserProfileResponse(
      target.getUsername(),
      target.getDisplayName(),
      target.getAvatarUrl(),
      isVisible ? target.getBio() : null,
      target.isPrivate(),
      isOwner,
      isVisible
    );
  }

  private String normalizeUsername(String raw) {
    String cleaned = raw
      .trim()
      .toLowerCase()
      .replaceAll("^@+", "")
      .replaceAll("[^a-z0-9_]", "");

    return cleaned.length() > 20 ? cleaned.substring(0, 20) : cleaned;
  }

  private MeResponse toMe(User u) {
    return new MeResponse(
      u.getId(),
      u.getCognitoSub(),
      u.getUsername(),
      u.getDisplayName(),
      u.getBio(),
      u.getAvatarUrl(),
      u.isPrivate(),
      u.getCreatedAt(),
      u.getUpdatedAt()
    );
  }
}
