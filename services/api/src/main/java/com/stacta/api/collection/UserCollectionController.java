package com.stacta.api.collection;

import com.stacta.api.collection.dto.AddCollectionItemRequest;
import com.stacta.api.collection.dto.AddCollectionItemResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/collection")
public class UserCollectionController {

  private final UserCollectionService userCollectionService;

  public UserCollectionController(UserCollectionService userCollectionService) {
    this.userCollectionService = userCollectionService;
  }

  @PostMapping
  public AddCollectionItemResponse add(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody AddCollectionItemRequest req
  ) {
    return userCollectionService.add(jwt.getSubject(), req);
  }

  @DeleteMapping
  public void remove(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam("source") String source,
    @RequestParam("externalId") String externalId
  ) {
    userCollectionService.remove(jwt.getSubject(), source, externalId);
  }

  @PostMapping("/top")
  public void addTop(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam("source") String source,
    @RequestParam("externalId") String externalId
  ) {
    userCollectionService.addTopFragrance(jwt.getSubject(), source, externalId);
  }

  @DeleteMapping("/top")
  public void removeTop(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam("source") String source,
    @RequestParam("externalId") String externalId
  ) {
    userCollectionService.removeTopFragrance(jwt.getSubject(), source, externalId);
  }
}
