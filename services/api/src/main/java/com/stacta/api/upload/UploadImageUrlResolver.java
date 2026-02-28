package com.stacta.api.upload;

import com.stacta.api.config.aws.AwsProperties;
import java.time.Duration;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Component
public class UploadImageUrlResolver {
  private static final Duration READ_URL_TTL = Duration.ofHours(12);

  private final AwsProperties aws;
  private final S3Presigner presigner;

  public UploadImageUrlResolver(AwsProperties aws, S3Presigner presigner) {
    this.aws = aws;
    this.presigner = presigner;
  }

  public String resolveFromObjectKey(String objectKey) {
    String key = normalize(objectKey);
    if (key == null) return null;
    String base = aws.cdn() == null ? null : normalizeBase(aws.cdn().baseUrl());
    if (base != null) return base + "/" + key;
    return resolvePresignedReadUrl(key);
  }

  public String resolveWithFallback(String objectKey, String fallbackUrl) {
    String resolved = resolveFromObjectKey(objectKey);
    if (resolved != null) return resolved;
    if (normalize(objectKey) != null) {
      return null;
    }
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

  private String resolvePresignedReadUrl(String key) {
    String bucket = aws.s3() == null ? null : normalize(aws.s3().bucket());
    if (bucket == null) return null;
    try {
      GetObjectRequest getObject = GetObjectRequest.builder()
        .bucket(bucket)
        .key(key)
        .build();
      GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
        .signatureDuration(READ_URL_TTL)
        .getObjectRequest(getObject)
        .build();
      return presigner.presignGetObject(presignRequest).url().toString();
    } catch (Exception ignore) {
      return null;
    }
  }

}
