package com.stacta.api.config.aws;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(AwsProperties.class)
public class AwsConfig {

  @Bean
  S3Client s3Client(AwsProperties props) {
    return S3Client.builder()
      .region(Region.of(props.region()))
      .credentialsProvider(DefaultCredentialsProvider.create())
      .build();
  }

  @Bean
  S3Presigner s3Presigner(AwsProperties props) {
    return S3Presigner.builder()
      .region(Region.of(props.region()))
      .credentialsProvider(DefaultCredentialsProvider.create())
      .build();
  }
}
