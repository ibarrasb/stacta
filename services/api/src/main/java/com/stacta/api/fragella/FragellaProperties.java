package com.stacta.api.fragella;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fragella")
public record FragellaProperties(String baseUrl, String apiKey) {}
