package com.stacta.api.integrations.fragella;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class FragellaDtos {

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Fragrance(
    @JsonProperty("Name") String name,
    @JsonProperty("Brand") String brand,
    @JsonProperty("Year") String year,
    @JsonProperty("Image URL") String imageUrl,
    @JsonProperty("Gender") String gender,

    // docs show this is lowercase "rating"
    @JsonProperty("rating") String rating,

    @JsonProperty("Price") String price,
    @JsonProperty("Price Value") String priceValue,

    @JsonProperty("General Notes") List<String> generalNotes,
    @JsonProperty("Main Accords") List<String> mainAccords,

    @JsonProperty("Notes") Notes notes,

    @JsonProperty("Image Fallbacks") List<String> imageFallbacks,
    @JsonProperty("Purchase URL") String purchaseUrl
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Notes(
    @JsonProperty("Top") List<Note> top,
    @JsonProperty("Middle") List<Note> middle,
    @JsonProperty("Base") List<Note> base
  ) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  public record Note(
    // Fragella note objects use lowercase keys per docs
    @JsonProperty("name")
    @JsonAlias({"Name"}) // keep this just in case / backward compat
    String name,

    @JsonProperty("imageUrl")
    @JsonAlias({"Image URL", "image_url"})
    String imageUrl
  ) {}
}
