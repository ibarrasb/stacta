package com.stacta.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
      .csrf(csrf -> csrf.disable())
      .cors(Customizer.withDefaults()) // ✅ ADD THIS
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(auth -> auth
        // public endpoints
        .requestMatchers("/health").permitAll()

        // swagger
        .requestMatchers(
          "/v3/api-docs/**",
          "/swagger-ui/**",
          "/swagger-ui.html"
        ).permitAll()

        .requestMatchers("/api/v1/usernames/available").permitAll()

        // protect your API
        .requestMatchers("/api/**").authenticated()

        // ✅ recommend: lock down everything else by default
        .anyRequest().authenticated()
      )
      .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
      .build();
  }
}
