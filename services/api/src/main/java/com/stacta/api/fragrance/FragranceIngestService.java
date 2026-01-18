package com.stacta.api.fragrance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.integrations.fragella.FragellaDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class FragranceIngestService {

  public static final String SOURCE = "FRAGELLA";

  private final FragranceRepository repo;
  private final ObjectMapper om;

  public FragranceIngestService(FragranceRepository repo, ObjectMapper om) {
    this.repo = repo;
    this.om = om;
  }

  @Transactional
  public void upsertAll(List<FragellaDtos.Fragrance> items) {
    for (var item : items) {
      var extId = externalId(item);

      var entity = repo.findByExternalSourceAndExternalId(SOURCE, extId)
        .orElseGet(() -> {
          var f = new Fragrance();
          f.setExternalSource(SOURCE);
          f.setExternalId(extId);
          return f;
        });

      entity.setName(nullSafe(item.name()));
      entity.setBrand(nullSafe(item.brand()));
      entity.setYear(nullSafe(item.year()));
      entity.setImageUrl(nullSafe(item.imageUrl()));
      entity.setGender(nullSafe(item.gender()));
      entity.setRating(nullSafe(item.rating()));
      entity.setPrice(nullSafe(item.price()));

      try {
        // per-item snapshot (better than storing the whole response)
        entity.setSnapshot(om.writeValueAsString(item));
      } catch (Exception e) {
        // Never kill the request just because snapshot serialization failed
        entity.setSnapshot("{}");
      }

      repo.save(entity);
    }
  }

  private static String nullSafe(String s) {
    return s == null ? "" : s.trim();
  }

  // Stable key since docs don't show an id field on fragrance objects
  private static String externalId(FragellaDtos.Fragrance f) {
    var brand = nullSafe(f.brand());
    var name  = nullSafe(f.name());
    var year  = nullSafe(f.year());

    if (year.isBlank()) year = "0";

    // normalize spacing + lower-case
    var raw = (brand + "|" + name + "|" + year)
      .toLowerCase(Locale.ROOT)
      .replaceAll("\\s+", " ")
      .trim();

    return raw;
  }
}
