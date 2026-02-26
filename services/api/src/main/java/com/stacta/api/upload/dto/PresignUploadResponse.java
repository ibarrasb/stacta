package com.stacta.api.upload.dto;

public record PresignUploadResponse(
  String uploadUrl,
  String objectKey,
  String publicUrl,
  long expiresInSeconds
) {}
