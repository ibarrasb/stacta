package com.stacta.api.integrations.fragella;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public class FragellaDtos {

  public record Fragrance(
    @JsonProperty("Name") String name,
    @JsonProperty("Brand") String brand,
    @JsonProperty("Year") String year,
    @JsonProperty("rating") String rating,

    @JsonProperty("Image URL") String imageUrl,
    @JsonProperty("Gender") String gender,

    @JsonProperty("Price") String price,
    @JsonProperty("Price Value") String priceValue,

    @JsonProperty("OilType") String oilType,
    @JsonProperty("Longevity") String longevity,
    @JsonProperty("Sillage") String sillage,
    @JsonProperty("Confidence") String confidence,
    @JsonProperty("Popularity") String popularity,

    @JsonProperty("Main Accords") List<String> mainAccords,
    @JsonProperty("General Notes") List<String> generalNotes,

    @JsonProperty("Main Accords Percentage") Map<String, String> mainAccordsPercentage,
    @JsonProperty("Season Ranking") List<Ranking> seasonRanking,
    @JsonProperty("Occasion Ranking") List<Ranking> occasionRanking,

    @JsonProperty("Notes") Notes notes,

    @JsonProperty("Purchase URL") String purchaseUrl,
    @JsonProperty("Image Fallbacks") List<String> imageFallbacks
  ) {}

  public record Notes(
    @JsonProperty("Top") List<Note> top,
    @JsonProperty("Middle") List<Note> middle,
    @JsonProperty("Base") List<Note> base
  ) {}

  public record Note(
    @JsonProperty("name") String name,
    @JsonProperty("imageUrl") String imageUrl
  ) {}

  public record Ranking(
    @JsonProperty("name") String name,
    @JsonProperty("score") Double score
  ) {}
}
