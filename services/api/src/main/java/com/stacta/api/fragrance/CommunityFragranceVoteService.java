package com.stacta.api.fragrance;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteRequest;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteSelection;
import com.stacta.api.fragrance.dto.CommunityFragranceVoteSummaryResponse;
import com.stacta.api.fragrance.dto.RankingDto;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CommunityFragranceVoteService {
  private static final String VERY_OVERPRICED = "VERY_OVERPRICED";
  private static final String A_BIT_OVERPRICED = "A_BIT_OVERPRICED";
  private static final String FAIR = "FAIR";
  private static final String GOOD_VALUE = "GOOD_VALUE";
  private static final String EXCELLENT_VALUE = "EXCELLENT_VALUE";
  private static final Set<String> ALLOWED_PRICE = Set.of(
    VERY_OVERPRICED,
    A_BIT_OVERPRICED,
    FAIR,
    GOOD_VALUE,
    EXCELLENT_VALUE,
    "GREAT_VALUE",
    "OVERPRICED"
  );
  private static final Map<String, String> SEASON_LABELS = Map.of(
    "SPRING", "Spring",
    "SUMMER", "Summer",
    "FALL", "Fall",
    "WINTER", "Winter"
  );
  private static final Map<String, String> OCCASION_LABELS = Map.of(
    "DAILY", "Daily",
    "OFFICE", "Office",
    "DATE_NIGHT", "Date night",
    "EVENING", "Evening",
    "FORMAL", "Formal",
    "PARTY", "Party",
    "GYM", "Gym"
  );
  private static final Map<Integer, String> LONGEVITY_LABELS = Map.of(
    1, "Fleeting",
    2, "Weak",
    3, "Moderate",
    4, "Long lasting",
    5, "Endless"
  );
  private static final Map<Integer, String> SILLAGE_LABELS = Map.of(
    1, "Skin scent",
    2, "Weak",
    3, "Moderate",
    4, "Strong",
    5, "Nuclear"
  );
  private static final Map<String, String> PRICE_LABELS = Map.of(
    VERY_OVERPRICED, "Very overpriced",
    A_BIT_OVERPRICED, "A bit overpriced",
    FAIR, "Fair",
    GOOD_VALUE, "Good value",
    EXCELLENT_VALUE, "Excellent value"
  );
  private static final List<String> PRICE_KEYS = List.of(
    VERY_OVERPRICED,
    A_BIT_OVERPRICED,
    FAIR,
    GOOD_VALUE,
    EXCELLENT_VALUE
  );

  private final FragranceRepository fragrances;
  private final UserRepository users;
  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public CommunityFragranceVoteService(
    FragranceRepository fragrances,
    UserRepository users,
    JdbcTemplate jdbc,
    ObjectMapper objectMapper
  ) {
    this.fragrances = fragrances;
    this.users = users;
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public CommunityFragranceVoteSummaryResponse upsert(String externalId, String viewerSub, CommunityFragranceVoteRequest req) {
    User me = getViewer(viewerSub);
    Fragrance fragrance = getCommunityFragrance(externalId);
    VoteInput input = normalize(req);

    String seasonJson = toJson(input.seasonVotes());
    String occasionJson = toJson(input.occasionVotes());

    jdbc.update(
      """
        INSERT INTO community_fragrance_vote
          (fragrance_id, user_id, longevity_score, sillage_score, price_perception, season_votes_json, occasion_votes_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), now(), now())
        ON CONFLICT (fragrance_id, user_id) DO UPDATE SET
          longevity_score = EXCLUDED.longevity_score,
          sillage_score = EXCLUDED.sillage_score,
          price_perception = EXCLUDED.price_perception,
          season_votes_json = EXCLUDED.season_votes_json,
          occasion_votes_json = EXCLUDED.occasion_votes_json,
          updated_at = now()
      """,
      fragrance.getId(),
      me.getId(),
      input.longevityScore(),
      input.sillageScore(),
      input.pricePerception(),
      seasonJson,
      occasionJson
    );

    return summaryFor(fragrance.getId(), me.getId());
  }

  @Transactional(readOnly = true)
  public CommunityFragranceVoteSummaryResponse summary(String externalId, String viewerSub) {
    User me = getViewer(viewerSub);
    Fragrance fragrance = getCommunityFragrance(externalId);
    return summaryFor(fragrance.getId(), me.getId());
  }

  private CommunityFragranceVoteSummaryResponse summaryFor(UUID fragranceId, UUID viewerUserId) {
    Long voters = jdbc.queryForObject(
      "SELECT COUNT(*) FROM community_fragrance_vote WHERE fragrance_id = ?",
      Long.class,
      fragranceId
    );

    List<RankingDto> longevity = listNumericRanking(
      """
        SELECT longevity_score::text AS key, COUNT(*)::bigint AS cnt
        FROM community_fragrance_vote
        WHERE fragrance_id = ? AND longevity_score IS NOT NULL
        GROUP BY longevity_score
      """,
      fragranceId,
      (k) -> LONGEVITY_LABELS.getOrDefault(Integer.parseInt(k), k),
      List.of("1", "2", "3", "4", "5")
    );

    List<RankingDto> sillage = listNumericRanking(
      """
        SELECT sillage_score::text AS key, COUNT(*)::bigint AS cnt
        FROM community_fragrance_vote
        WHERE fragrance_id = ? AND sillage_score IS NOT NULL
        GROUP BY sillage_score
      """,
      fragranceId,
      (k) -> SILLAGE_LABELS.getOrDefault(Integer.parseInt(k), k),
      List.of("1", "2", "3", "4", "5")
    );

    List<RankingDto> season = listKeyRanking(
      """
        SELECT s.key AS key, COUNT(*)::bigint AS cnt
        FROM community_fragrance_vote v
        CROSS JOIN LATERAL jsonb_array_elements_text(v.season_votes_json) AS s(key)
        WHERE v.fragrance_id = ?
        GROUP BY s.key
      """,
      fragranceId,
      SEASON_LABELS,
      List.of("SPRING", "SUMMER", "FALL", "WINTER"),
      false
    );

    List<RankingDto> occasion = listKeyRanking(
      """
        SELECT o.key AS key, COUNT(*)::bigint AS cnt
        FROM community_fragrance_vote v
        CROSS JOIN LATERAL jsonb_array_elements_text(v.occasion_votes_json) AS o(key)
        WHERE v.fragrance_id = ?
        GROUP BY o.key
      """,
      fragranceId,
      OCCASION_LABELS,
      List.of("DAILY", "OFFICE", "DATE_NIGHT", "EVENING", "FORMAL", "PARTY", "GYM"),
      false
    );

    List<RankingDto> price = listKeyRanking(
      """
        SELECT price_perception AS key, COUNT(*)::bigint AS cnt
        FROM community_fragrance_vote
        WHERE fragrance_id = ? AND price_perception IS NOT NULL
        GROUP BY price_perception
      """,
      fragranceId,
      PRICE_LABELS,
      PRICE_KEYS,
      true
    );

    CommunityFragranceVoteSelection userVote = jdbc.query(
      """
        SELECT longevity_score, sillage_score, price_perception, season_votes_json::text, occasion_votes_json::text
        FROM community_fragrance_vote
        WHERE fragrance_id = ? AND user_id = ?
      """,
      rs -> {
        if (!rs.next()) return null;
        return new CommunityFragranceVoteSelection(
          (Integer) rs.getObject("longevity_score"),
          (Integer) rs.getObject("sillage_score"),
          canonicalPriceKey(rs.getString("price_perception")),
          parseJsonList(rs.getString("season_votes_json")),
          parseJsonList(rs.getString("occasion_votes_json"))
        );
      },
      fragranceId,
      viewerUserId
    );

    return new CommunityFragranceVoteSummaryResponse(
      voters == null ? 0L : voters,
      longevity,
      sillage,
      season,
      occasion,
      price,
      userVote
    );
  }

  private List<RankingDto> listNumericRanking(
    String sql,
    UUID fragranceId,
    java.util.function.Function<String, String> labelMapper,
    List<String> orderedKeys
  ) {
    Map<String, Long> counts = new LinkedHashMap<>();
    jdbc.query(sql, rs -> {
      counts.put(rs.getString("key"), rs.getLong("cnt"));
    }, fragranceId);

    List<RankingDto> out = new ArrayList<>();
    for (String key : orderedKeys) {
      Long cnt = counts.getOrDefault(key, 0L);
      out.add(new RankingDto(labelMapper.apply(key), cnt.doubleValue()));
    }
    return out;
  }

  private List<RankingDto> listKeyRanking(
    String sql,
    UUID fragranceId,
    Map<String, String> labelMap,
    List<String> orderedKeys,
    boolean canonicalizePrice
  ) {
    Map<String, Long> counts = new LinkedHashMap<>();
    jdbc.query(sql, rs -> {
      String rawKey = rs.getString("key");
      String key = canonicalizePrice ? canonicalPriceKey(rawKey) : rawKey;
      if (key == null || key.isBlank()) return;
      counts.put(key, counts.getOrDefault(key, 0L) + rs.getLong("cnt"));
    }, fragranceId);

    List<RankingDto> out = new ArrayList<>();
    for (String key : orderedKeys) {
      Long cnt = counts.getOrDefault(key, 0L);
      out.add(new RankingDto(labelMap.getOrDefault(key, key), cnt.doubleValue()));
    }
    return out;
  }

  private VoteInput normalize(CommunityFragranceVoteRequest req) {
    Integer longevity = req == null ? null : req.longevityScore();
    Integer sillage = req == null ? null : req.sillageScore();
    String price = normalizePrice(req == null ? null : req.pricePerception());
    List<String> seasons = normalizeMulti(req == null ? null : req.seasonVotes(), SEASON_LABELS.keySet(), 20);
    List<String> occasions = normalizeMulti(req == null ? null : req.occasionVotes(), OCCASION_LABELS.keySet(), 35);

    if (longevity == null && sillage == null && price == null && seasons.isEmpty() && occasions.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one vote field is required");
    }

    return new VoteInput(longevity, sillage, price, seasons, occasions);
  }

  private String normalizePrice(String raw) {
    if (raw == null || raw.isBlank()) return null;
    String normalized = raw.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
    if (!ALLOWED_PRICE.contains(normalized)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pricePerception");
    }
    return canonicalPriceKey(normalized);
  }

  private String canonicalPriceKey(String key) {
    if (key == null || key.isBlank()) return null;
    String normalized = key.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
    return switch (normalized) {
      case "OVERPRICED" -> A_BIT_OVERPRICED;
      case "GREAT_VALUE" -> GOOD_VALUE;
      case VERY_OVERPRICED, A_BIT_OVERPRICED, FAIR, GOOD_VALUE, EXCELLENT_VALUE -> normalized;
      default -> null;
    };
  }

  private List<String> normalizeMulti(List<String> raw, Set<String> allowed, int maxLen) {
    if (raw == null || raw.isEmpty()) return List.of();
    List<String> out = new ArrayList<>();
    for (String item : raw) {
      if (item == null || item.isBlank()) continue;
      String normalized = item.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
      if (!allowed.contains(normalized)) continue;
      out.add(normalized);
      if (out.size() >= maxLen) break;
    }
    return List.copyOf(out);
  }

  private String toJson(List<String> values) {
    try {
      return objectMapper.writeValueAsString(values == null ? List.of() : values);
    } catch (Exception e) {
      return "[]";
    }
  }

  private List<String> parseJsonList(String json) {
    if (json == null || json.isBlank()) return List.of();
    try {
      return objectMapper.readValue(json, new TypeReference<List<String>>() {});
    } catch (Exception e) {
      return List.of();
    }
  }

  private Fragrance getCommunityFragrance(String externalId) {
    String ext = normalizeExternalId(externalId);
    Optional<Fragrance> maybe = fragrances.findByExternalSourceAndExternalId("COMMUNITY", ext);
    if (maybe.isEmpty()) maybe = fragrances.findByExternalSourceAndExternalId("community", ext);
    Fragrance fragrance = maybe.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Community fragrance not found"));
    if (!"COMMUNITY".equalsIgnoreCase(fragrance.getExternalSource())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Votes are only available for community fragrances");
    }
    return fragrance;
  }

  private User getViewer(String viewerSub) {
    return users.findByCognitoSub(viewerSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));
  }

  private String normalizeExternalId(String externalId) {
    return externalId == null ? "" : externalId.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }

  private record VoteInput(
    Integer longevityScore,
    Integer sillageScore,
    String pricePerception,
    List<String> seasonVotes,
    List<String> occasionVotes
  ) {}
}
