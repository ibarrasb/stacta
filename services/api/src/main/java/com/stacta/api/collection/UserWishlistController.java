package com.stacta.api.collection;

import com.stacta.api.collection.dto.AddCollectionItemRequest;
import com.stacta.api.collection.dto.CollectionItemDto;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wishlist")
public class UserWishlistController {

  private final UserCollectionService userCollectionService;

  public UserWishlistController(UserCollectionService userCollectionService) {
    this.userCollectionService = userCollectionService;
  }

  @PostMapping
  public CollectionItemDto add(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody AddCollectionItemRequest req
  ) {
    return userCollectionService.addToWishlist(jwt.getSubject(), req);
  }

  @DeleteMapping
  public void remove(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam("source") String source,
    @RequestParam("externalId") String externalId
  ) {
    userCollectionService.removeFromWishlist(jwt.getSubject(), source, externalId);
  }
}
