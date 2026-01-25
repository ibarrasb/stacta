package com.stacta.api.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();

    // ✅ Dev origin (add prod later)
    config.setAllowedOrigins(List.of(
      "http://localhost:5173"
    ));

    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

    // ✅ IMPORTANT: allow Authorization header for Bearer token
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));

    // Optional: only needed if you read headers on client
    config.setExposedHeaders(List.of("WWW-Authenticate"));

    // If you ever use cookies; safe to keep true, but you can set false if you want
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
