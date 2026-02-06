package com.stacta.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class HttpClientConfig {

  /**
   * Global RestClient builder used by integrations (Fragella, etc).
   * Adds sane timeouts so remote calls don't hang forever.
   */
  @Bean
  RestClient.Builder restClientBuilder(
    @Value("${http.client.connect-timeout-ms:5000}") int connectTimeoutMs,
    @Value("${http.client.read-timeout-ms:20000}") int readTimeoutMs
  ) {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(connectTimeoutMs);
    factory.setReadTimeout(readTimeoutMs);

    return RestClient.builder().requestFactory(factory);
  }
}
