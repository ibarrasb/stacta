package com.stacta.api.upload.dto;

public record UploadedImageResponse(
  String objectKey,
  String publicUrl
) {}
