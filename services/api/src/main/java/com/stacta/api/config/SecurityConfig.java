package com.stacta.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
      .csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
        .requestMatchers("/api/v1/ping").permitAll()
        .anyRequest().authenticated()
      )
      // temporary: enables basic auth login page etc (just to stop 401 everywhere)
      .httpBasic(Customizer.withDefaults())
      .build();
  }
}
