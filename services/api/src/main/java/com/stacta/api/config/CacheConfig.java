package com.stacta.api.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {

    var json = GenericJacksonJsonRedisSerializer.builder().build();
    var valuePair = RedisSerializationContext.SerializationPair.fromSerializer(json);

    // default TTL for any cache you don't explicitly configure
    var defaults = RedisCacheConfiguration.defaultCacheConfig()
      .serializeValuesWith(valuePair)
      .entryTtl(Duration.ofMinutes(10));

    // special TTL for Fragella search results
    var fragellaSearch = defaults.entryTtl(Duration.ofMinutes(30));

    return RedisCacheManager.builder(connectionFactory)
      .cacheDefaults(defaults)
      .withCacheConfiguration("fragellaSearch", fragellaSearch)
      .build();
  }
}
