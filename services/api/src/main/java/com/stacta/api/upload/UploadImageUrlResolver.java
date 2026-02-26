package com.stacta.api.upload;

import com.stacta.api.config.aws.AwsProperties;
import org.springframework.stereotype.Component;

@Component
public class UploadImageUrlResolver {

  private final AwsProperties aws;

  public UploadImageUrlResolver(AwsProperties aws) {
    this.aws = aws;
  }

  public String resolveFromObjectKey(String objectKey) {
    String key = normalize(objectKey);
    if (key == null) return null;
    String base = aws.cdn() == null ? null : normalizeBase(aws.cdn().baseUrl());
    if (base != null) return base + "/" + key;
    return resolveS3Url(key);
  }

  public String resolveWithFallback(String objectKey, String fallbackUrl) {
    String resolved = resolveFromObjectKey(objectKey);
    if (resolved != null) return resolved;
    return normalize(fallbackUrl);
  }

  private String normalize(String value) {
    if (value == null) return null;
    String cleaned = value.trim();
    return cleaned.isBlank() ? null : cleaned;
  }

  private String normalizeBase(String value) {
    String cleaned = normalize(value);
    if (cleaned == null) return null;
    return cleaned.endsWith("/") ? cleaned.substring(0, cleaned.length() - 1) : cleaned;
  }

  private String resolveS3Url(String key) {
    String bucket = aws.s3() == null ? null : normalize(aws.s3().bucket());
    String region = normalize(aws.region());
    if (bucket == null || region == null) return null;
    return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
  }
}
