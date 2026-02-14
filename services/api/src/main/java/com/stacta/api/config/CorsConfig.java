package com.stacta.api.config;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

  @Bean
  public CorsConfigurationSource corsConfigurationSource(
    @Value("#{'${app.cors.allowed-origins:}'.split(',')}") List<String> allowedOriginsRaw,
    @Value("${app.cors.allow-credentials:false}") boolean allowCredentials
  ) {
    CorsConfiguration config = new CorsConfiguration();

    List<String> allowedOrigins = allowedOriginsRaw.stream()
      .map(String::trim)
      .filter(s -> !s.isEmpty())
      .collect(Collectors.toList());

    config.setAllowedOrigins(allowedOrigins);

    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

    config.setExposedHeaders(List.of("WWW-Authenticate"));

    config.setAllowCredentials(allowCredentials);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
