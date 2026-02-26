package com.stacta.api.config.aws;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "aws")
public record AwsProperties(
  @NotBlank String region,
  @Valid S3 s3,
  @Valid Cdn cdn
) {
  public AwsProperties {
    if (s3 == null) {
      throw new IllegalArgumentException("aws.s3 must be configured");
    }
    if (cdn == null) {
      cdn = new Cdn(null);
    }
  }

  public record S3(@NotBlank String bucket) {}

  public record Cdn(String baseUrl) {}
}
