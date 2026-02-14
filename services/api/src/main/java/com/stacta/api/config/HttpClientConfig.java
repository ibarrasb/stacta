package com.stacta.api.config;

import java.net.http.HttpClient;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
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
    HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofMillis(connectTimeoutMs))
      .followRedirects(HttpClient.Redirect.NORMAL)
      .build();

    var factory = new JdkClientHttpRequestFactory(httpClient);
    factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

    return RestClient.builder().requestFactory(factory);
  }
}
