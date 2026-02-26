package com.stacta.api.upload;

import com.stacta.api.upload.dto.PresignUploadRequest;
import com.stacta.api.upload.dto.PresignUploadResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {
  private final PresignedUploadService uploads;

  public UploadController(PresignedUploadService uploads) {
    this.uploads = uploads;
  }

  @PostMapping("/presign")
  public PresignUploadResponse presign(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody PresignUploadRequest req
  ) {
    return uploads.createFragranceUploadUrl(jwt.getSubject(), req);
  }
}
