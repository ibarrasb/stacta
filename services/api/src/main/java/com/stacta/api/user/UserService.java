package com.stacta.api.user;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stacta.api.user.dto.MeResponse;
import com.stacta.api.user.dto.OnboardingRequest;

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

    // username is optional for now
    if (req.username() != null && !req.username().trim().isEmpty()) {
      u.setUsername(req.username().trim());
    }

    User saved = repo.save(u);
    return toMe(saved);
  }

  private MeResponse toMe(User u) {
    return new MeResponse(
      u.getId(),
      u.getCognitoSub(),
      u.getUsername(),
      u.getDisplayName(),
      u.getBio(),
      u.getAvatarUrl(),
      u.getCreatedAt(),
      u.getUpdatedAt()
    );
  }
}
