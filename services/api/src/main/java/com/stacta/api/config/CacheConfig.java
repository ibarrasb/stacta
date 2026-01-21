package com.stacta.api.config;

import java.time.Duration;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {

    var stringPair = RedisSerializationContext.SerializationPair
      .fromSerializer(new StringRedisSerializer());

    var defaults = RedisCacheConfiguration.defaultCacheConfig()
      .serializeKeysWith(stringPair)
      .serializeValuesWith(stringPair)          // ✅ values stored as plain strings
      .entryTtl(Duration.ofMinutes(10))
      .prefixCacheNameWith("stacta4:");         // ✅ bump prefix to avoid old junk

    var fragellaSearch = defaults.entryTtl(Duration.ofMinutes(30));

    return RedisCacheManager.builder(connectionFactory)
      .cacheDefaults(defaults)
      .withCacheConfiguration("fragellaSearchV2", fragellaSearch)
      .build();
  }
}
