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
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FragranceVoteService {
  private static final Set<String> ALLOWED_PRICE = Set.of("GREAT_VALUE", "FAIR", "OVERPRICED");
  private static final Map<String, String> SEASON_LABELS = Map.of(
    "SPRING", "Spring",
    "SUMMER", "Summer",
    "FALL", "Fall",
    "WINTER", "Winter"
  );
  private static final List<String> SEASON_KEYS = List.of("SPRING", "SUMMER", "FALL", "WINTER");
  private static final Map<String, String> OCCASION_LABELS = Map.of(
    "DAILY", "Daily",
    "OFFICE", "Office",
    "DATE_NIGHT", "Date night",
    "EVENING", "Evening",
    "FORMAL", "Formal",
    "PARTY", "Party",
    "GYM", "Gym"
  );
  private static final List<String> OCCASION_KEYS = List.of("DAILY", "OFFICE", "DATE_NIGHT", "EVENING", "FORMAL", "PARTY", "GYM");
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
    "GREAT_VALUE", "Great value",
    "FAIR", "Fair",
    "OVERPRICED", "Overpriced"
  );
  private static final double PRIOR_LON_SIL_WEIGHT = 320.0;
  private static final double PRIOR_SEASON_OCCASION_WEIGHT = 180.0;

  private final UserRepository users;
  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;
  private final CommunityFragranceVoteService communityVotes;
  private final FragellaSearchService fragranceSearch;

  public FragranceVoteService(
    UserRepository users,
    JdbcTemplate jdbc,
    ObjectMapper objectMapper,
    CommunityFragranceVoteService communityVotes,
    FragellaSearchService fragranceSearch
  ) {
    this.users = users;
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
    this.communityVotes = communityVotes;
    this.fragranceSearch = fragranceSearch;
  }

  @Transactional(readOnly = true)
  public CommunityFragranceVoteSummaryResponse summary(String source, String externalId, String viewerSub) {
    String src = normalizeSource(source);
    if ("COMMUNITY".equals(src)) {
      return communityVotes.summary(externalId, viewerSub);
    }
    User me = getViewer(viewerSub);
    return fragellaSummary(normalizeExternalId(externalId), me.getId());
  }

  @Transactional
  public CommunityFragranceVoteSummaryResponse upsert(String source, String externalId, String viewerSub, CommunityFragranceVoteRequest req) {
    String src = normalizeSource(source);
    if ("COMMUNITY".equals(src)) {
      return communityVotes.upsert(externalId, viewerSub, req);
    }

    User me = getViewer(viewerSub);
    String ext = normalizeExternalId(externalId);
    VoteInput input = normalize(req);

    jdbc.update(
      """
        INSERT INTO fragella_fragrance_vote
          (external_id, user_id, longevity_score, sillage_score, price_perception, season_votes_json, occasion_votes_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), now(), now())
        ON CONFLICT (external_id, user_id) DO UPDATE SET
          longevity_score = EXCLUDED.longevity_score,
          sillage_score = EXCLUDED.sillage_score,
          price_perception = EXCLUDED.price_perception,
          season_votes_json = EXCLUDED.season_votes_json,
          occasion_votes_json = EXCLUDED.occasion_votes_json,
          updated_at = now()
      """,
      ext,
      me.getId(),
      input.longevityScore(),
      input.sillageScore(),
      input.pricePerception(),
      toJson(input.seasonVotes()),
      toJson(input.occasionVotes())
    );

    return fragellaSummary(ext, me.getId());
  }

  private CommunityFragranceVoteSummaryResponse fragellaSummary(String externalId, UUID viewerUserId) {
    var detail = fragranceSearch.getPersistedDetail("FRAGELLA", externalId);

    Long voters = jdbc.queryForObject(
      "SELECT COUNT(*) FROM fragella_fragrance_vote WHERE external_id = ?",
      Long.class,
      externalId
    );

    Double baselineLongevity = mapLongevityBaseline(detail.longevity());
    Double baselineSillage = mapSillageBaseline(detail.sillage());
    Map<String, Double> baselineSeason = toPriorDistribution(detail.seasonRanking(), SEASON_KEYS);
    Map<String, Double> baselineOccasion = toPriorDistribution(detail.occasionRanking(), OCCASION_KEYS);

    List<RankingDto> longevity = listNumericWithPrior(
      """
        SELECT longevity_score::text AS key, COUNT(*)::double precision AS cnt
        FROM fragella_fragrance_vote
        WHERE external_id = ? AND longevity_score IS NOT NULL
        GROUP BY longevity_score
      """,
      externalId,
      LONGEVITY_LABELS,
      baselineLongevity,
      PRIOR_LON_SIL_WEIGHT
    );

    List<RankingDto> sillage = listNumericWithPrior(
      """
        SELECT sillage_score::text AS key, COUNT(*)::double precision AS cnt
        FROM fragella_fragrance_vote
        WHERE external_id = ? AND sillage_score IS NOT NULL
        GROUP BY sillage_score
      """,
      externalId,
      SILLAGE_LABELS,
      baselineSillage,
      PRIOR_LON_SIL_WEIGHT
    );

    List<RankingDto> season = listKeyWithPrior(
      """
        SELECT s.key AS key, COUNT(*)::double precision AS cnt
        FROM fragella_fragrance_vote v
        CROSS JOIN LATERAL jsonb_array_elements_text(v.season_votes_json) AS s(key)
        WHERE v.external_id = ?
        GROUP BY s.key
      """,
      externalId,
      SEASON_LABELS,
      SEASON_KEYS,
      baselineSeason,
      PRIOR_SEASON_OCCASION_WEIGHT
    );

    List<RankingDto> occasion = listKeyWithPrior(
      """
        SELECT o.key AS key, COUNT(*)::double precision AS cnt
        FROM fragella_fragrance_vote v
        CROSS JOIN LATERAL jsonb_array_elements_text(v.occasion_votes_json) AS o(key)
        WHERE v.external_id = ?
        GROUP BY o.key
      """,
      externalId,
      OCCASION_LABELS,
      OCCASION_KEYS,
      baselineOccasion,
      PRIOR_SEASON_OCCASION_WEIGHT
    );

    List<RankingDto> price = listKeyRaw(
      """
        SELECT price_perception AS key, COUNT(*)::double precision AS cnt
        FROM fragella_fragrance_vote
        WHERE external_id = ? AND price_perception IS NOT NULL
        GROUP BY price_perception
      """,
      externalId,
      PRICE_LABELS,
      List.of("GREAT_VALUE", "FAIR", "OVERPRICED")
    );

    CommunityFragranceVoteSelection userVote = jdbc.query(
      """
        SELECT longevity_score, sillage_score, price_perception, season_votes_json::text, occasion_votes_json::text
        FROM fragella_fragrance_vote
        WHERE external_id = ? AND user_id = ?
      """,
      rs -> {
        if (!rs.next()) return null;
        return new CommunityFragranceVoteSelection(
          (Integer) rs.getObject("longevity_score"),
          (Integer) rs.getObject("sillage_score"),
          rs.getString("price_perception"),
          parseJsonList(rs.getString("season_votes_json")),
          parseJsonList(rs.getString("occasion_votes_json"))
        );
      },
      externalId,
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

  private List<RankingDto> listNumericWithPrior(
    String sql,
    String externalId,
    Map<Integer, String> labelMap,
    Double baseline,
    double baselineWeight
  ) {
    Map<String, Double> counts = new LinkedHashMap<>();
    jdbc.queryForList(sql, externalId).forEach((row) -> {
      String key = String.valueOf(row.get("key"));
      Number cnt = (Number) row.get("cnt");
      counts.put(key, cnt == null ? 0.0 : cnt.doubleValue());
    });
    List<RankingDto> out = new ArrayList<>();
    for (int i = 1; i <= 5; i++) {
      double score = counts.getOrDefault(String.valueOf(i), 0.0);
      if (baseline != null) {
        score += priorForLevel(i, baseline, baselineWeight);
      }
      out.add(new RankingDto(labelMap.getOrDefault(i, String.valueOf(i)), score));
    }
    return out;
  }

  private List<RankingDto> listKeyWithPrior(
    String sql,
    String externalId,
    Map<String, String> labelMap,
    List<String> orderedKeys,
    Map<String, Double> baselineWeights,
    double baselineWeight
  ) {
    Map<String, Double> counts = new LinkedHashMap<>();
    jdbc.queryForList(sql, externalId).forEach((row) -> {
      String key = String.valueOf(row.get("key"));
      Number cnt = (Number) row.get("cnt");
      counts.put(key, cnt == null ? 0.0 : cnt.doubleValue());
    });
    List<RankingDto> out = new ArrayList<>();
    for (String key : orderedKeys) {
      double score = counts.getOrDefault(key, 0.0);
      score += baselineWeight * baselineWeights.getOrDefault(key, 0.0);
      out.add(new RankingDto(labelMap.getOrDefault(key, key), score));
    }
    return out;
  }

  private List<RankingDto> listKeyRaw(
    String sql,
    String externalId,
    Map<String, String> labelMap,
    List<String> orderedKeys
  ) {
    Map<String, Double> counts = new LinkedHashMap<>();
    jdbc.queryForList(sql, externalId).forEach((row) -> {
      String key = String.valueOf(row.get("key"));
      Number cnt = (Number) row.get("cnt");
      counts.put(key, cnt == null ? 0.0 : cnt.doubleValue());
    });
    List<RankingDto> out = new ArrayList<>();
    for (String key : orderedKeys) {
      out.add(new RankingDto(labelMap.getOrDefault(key, key), counts.getOrDefault(key, 0.0)));
    }
    return out;
  }

  private double priorForLevel(int level, double mean, double weight) {
    double m = Math.max(1.0, Math.min(5.0, mean));
    int lo = (int) Math.floor(m);
    int hi = (int) Math.ceil(m);
    if (lo == hi) return level == lo ? weight : 0.0;
    double hiPart = m - lo;
    double loPart = 1.0 - hiPart;
    if (level == lo) return weight * loPart;
    if (level == hi) return weight * hiPart;
    return 0.0;
  }

  private Double mapLongevityBaseline(String raw) {
    String v = normalizeLabel(raw);
    return switch (v) {
      case "fleeting", "very weak", "short", "short lasting" -> 1.0;
      case "weak" -> 2.0;
      case "moderate", "average", "medium" -> 3.0;
      case "long lasting", "long" -> 4.0;
      case "endless", "very long", "very long lasting", "beast", "beast mode" -> 5.0;
      default -> null;
    };
  }

  private Double mapSillageBaseline(String raw) {
    String v = normalizeLabel(raw);
    return switch (v) {
      case "skin scent", "intimate", "soft", "close" -> 1.0;
      case "weak" -> 2.0;
      case "moderate", "average", "medium" -> 3.0;
      case "strong" -> 4.0;
      case "nuclear", "very strong", "heavy", "enormous", "room filling" -> 5.0;
      default -> null;
    };
  }

  private Map<String, Double> toPriorDistribution(List<RankingDto> ranking, List<String> allowedKeys) {
    Map<String, Double> out = new LinkedHashMap<>();
    for (String key : allowedKeys) out.put(key, 0.0);
    if (ranking == null || ranking.isEmpty()) return out;

    Map<String, Double> tmp = new LinkedHashMap<>();
    double sum = 0.0;
    for (RankingDto row : ranking) {
      if (row == null) continue;
      String key = normalizeVoteKey(row.name());
      if (!out.containsKey(key)) continue;
      double score = row.score() == null ? 0.0 : Math.max(0.0, row.score());
      tmp.put(key, tmp.getOrDefault(key, 0.0) + score);
      sum += score;
    }
    if (sum <= 0.0) return out;
    for (String key : allowedKeys) {
      out.put(key, tmp.getOrDefault(key, 0.0) / sum);
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
    return normalized;
  }

  private List<String> normalizeMulti(List<String> raw, Set<String> allowed, int maxLen) {
    if (raw == null || raw.isEmpty()) return List.of();
    List<String> out = new ArrayList<>();
    for (String item : raw) {
      if (item == null || item.isBlank()) continue;
      String normalized = normalizeVoteKey(item);
      if (!allowed.contains(normalized)) continue;
      out.add(normalized);
      if (out.size() >= maxLen) break;
    }
    return List.copyOf(out);
  }

  private String normalizeSource(String source) {
    String normalized = source == null ? "FRAGELLA" : source.trim().toUpperCase(Locale.ROOT);
    if (!"FRAGELLA".equals(normalized) && !"COMMUNITY".equals(normalized)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid source");
    }
    return normalized;
  }

  private String normalizeExternalId(String externalId) {
    String ext = externalId == null ? "" : externalId.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    if (ext.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalId is required");
    }
    return ext;
  }

  private String normalizeVoteKey(String raw) {
    return String.valueOf(raw == null ? "" : raw)
      .trim()
      .toUpperCase(Locale.ROOT)
      .replaceAll("[^A-Z0-9]+", "_")
      .replaceAll("^_+|_+$", "");
  }

  private String normalizeLabel(String raw) {
    return String.valueOf(raw == null ? "" : raw)
      .trim()
      .toLowerCase(Locale.ROOT)
      .replaceAll("\\s+", " ");
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

  private User getViewer(String sub) {
    return users.findByCognitoSub(sub).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  private record VoteInput(
    Integer longevityScore,
    Integer sillageScore,
    String pricePerception,
    List<String> seasonVotes,
    List<String> occasionVotes
  ) {}
}
