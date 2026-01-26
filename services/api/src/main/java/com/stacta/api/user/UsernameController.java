package com.stacta.api.user;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/usernames")
public class UsernameController {

  private final UserRepository repo;

  public UsernameController(UserRepository repo) {
    this.repo = repo;
  }

  @GetMapping("/available")
  public ResponseEntity<?> available(@RequestParam String username) {
    String normalized = normalizeUsername(username);

    // If user typed nothing after normalization, treat as invalid (or available=false)
    if (normalized.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of(
        "available", false,
        "normalized", normalized,
        "reason", "INVALID"
      ));
    }

    // 3–20 chars, starts with letter/number, only letters/numbers/underscore
    boolean valid = normalized.matches("^[a-z0-9][a-z0-9_]{2,19}$");
    if (!valid) {
      return ResponseEntity.badRequest().body(Map.of(
        "available", false,
        "normalized", normalized,
        "reason", "INVALID"
      ));
    }

    boolean taken = repo.existsByUsernameIgnoreCase(normalized);

    return ResponseEntity.ok(Map.of(
      "available", !taken,
      "normalized", normalized,
      "reason", taken ? "TAKEN" : "AVAILABLE"
    ));
  }

  private String normalizeUsername(String raw) {
    if (raw == null) return "";
    String cleaned = raw
      .trim()
      .toLowerCase()
      .replaceAll("^@+", "")
      .replaceAll("[^a-z0-9_]", "");

    return cleaned.length() > 20 ? cleaned.substring(0, 20) : cleaned;
  }
}
