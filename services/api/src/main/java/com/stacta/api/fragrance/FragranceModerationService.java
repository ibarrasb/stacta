package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceReportItemDto;
import com.stacta.api.fragrance.dto.ResolveFragranceReportRequest;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class FragranceModerationService {

  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final FragranceRepository fragrances;
  private final CommunityFragranceService communityFragranceService;

  public FragranceModerationService(
    JdbcTemplate jdbc,
    UserRepository users,
    FragranceRepository fragrances,
    CommunityFragranceService communityFragranceService
  ) {
    this.jdbc = jdbc;
    this.users = users;
    this.fragrances = fragrances;
    this.communityFragranceService = communityFragranceService;
  }

  @Transactional
  public void reportCommunityFragrance(String externalId, String reason, String details, String viewerSub) {
    User reporter = requireUser(viewerSub);
    Fragrance fragrance = getCommunityFragrance(externalId);
    String normalizedReason = normalizeReason(reason);
    String normalizedDetails = normalizeDetails(details);

    Integer openExists = jdbc.queryForObject(
      """
      SELECT COUNT(*)
      FROM fragrance_report
      WHERE fragrance_id = ?
        AND reported_by_user_id = ?
        AND status = 'OPEN'
      """,
      Integer.class,
      fragrance.getId(),
      reporter.getId()
    );
    if ((openExists == null ? 0 : openExists) > 0) return;

    jdbc.update(
      """
      INSERT INTO fragrance_report (fragrance_id, reported_by_user_id, reason, details)
      VALUES (?, ?, ?, ?)
      """,
      fragrance.getId(),
      reporter.getId(),
      normalizedReason,
      normalizedDetails
    );
  }

  @Transactional(readOnly = true)
  public List<FragranceReportItemDto> list(String status, int limit, String viewerSub) {
    requireAdmin(viewerSub);
    int safeLimit = Math.max(1, Math.min(limit, 200));
    String normalizedStatus = normalizeStatusFilter(status);

    return jdbc.query(
      """
      SELECT
        r.id,
        r.fragrance_id,
        f.external_id AS fragrance_external_id,
        f.name AS fragrance_name,
        f.brand AS fragrance_brand,
        f.created_by_user_id AS creator_user_id,
        cu.username AS creator_username,
        ru.username AS reported_by_username,
        ru.display_name AS reported_by_display_name,
        r.reason,
        r.details,
        r.status,
        r.resolution_note,
        rs.username AS resolved_by_username,
        r.created_at,
        r.resolved_at
      FROM fragrance_report r
      JOIN fragrance f ON f.id = r.fragrance_id
      LEFT JOIN users cu ON cu.id = f.created_by_user_id
      JOIN users ru ON ru.id = r.reported_by_user_id
      LEFT JOIN users rs ON rs.id = r.resolved_by_user_id
      WHERE (? = 'ALL' OR r.status = ?)
      ORDER BY
        CASE WHEN r.status = 'OPEN' THEN 0 ELSE 1 END,
        r.created_at DESC
      LIMIT ?
      """,
      (rs, rowNum) -> new FragranceReportItemDto(
        rs.getObject("id", UUID.class),
        rs.getObject("fragrance_id", UUID.class),
        rs.getString("fragrance_external_id"),
        rs.getString("fragrance_name"),
        rs.getString("fragrance_brand"),
        rs.getString("creator_username"),
        rs.getObject("creator_user_id", UUID.class),
        rs.getString("reported_by_username"),
        rs.getString("reported_by_display_name"),
        rs.getString("reason"),
        rs.getString("details"),
        rs.getString("status"),
        rs.getString("resolution_note"),
        rs.getString("resolved_by_username"),
        toInstant(rs.getTimestamp("created_at")),
        toInstant(rs.getTimestamp("resolved_at"))
      ),
      normalizedStatus,
      normalizedStatus,
      safeLimit
    );
  }

  @Transactional
  public void resolve(UUID reportId, ResolveFragranceReportRequest req, String viewerSub) {
    User admin = requireAdmin(viewerSub);
    if (reportId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report id is required.");
    }
    String action = normalizeAction(req.action());
    String resolutionNote = normalizeDetails(req.resolutionNote());

    ReportTarget target = jdbc.query(
      """
      SELECT r.fragrance_id, f.external_id
      FROM fragrance_report r
      JOIN fragrance f ON f.id = r.fragrance_id
      WHERE r.id = ?
        AND r.status = 'OPEN'
      """,
      rs -> rs.next()
        ? new ReportTarget(rs.getObject("fragrance_id", UUID.class), rs.getString("external_id"))
        : null,
      reportId
    );
    if (target == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Open fragrance report not found.");
    }

    if ("DISMISS".equals(action)) {
      jdbc.update(
        """
        UPDATE fragrance_report
        SET status = 'RESOLVED_DISMISSED',
            resolution_note = ?,
            resolved_by_user_id = ?,
            resolved_at = now()
        WHERE id = ?
        """,
        resolutionNote,
        admin.getId(),
        reportId
      );
      return;
    }

    communityFragranceService.forceDeleteByAdmin(target.externalId(), admin.getCognitoSub());

    jdbc.update(
      """
      UPDATE fragrance_report
      SET status = 'RESOLVED_DELETED',
          resolution_note = ?,
          resolved_by_user_id = ?,
          resolved_at = now()
      WHERE id = ?
      """,
      resolutionNote,
      admin.getId(),
      reportId
    );
  }

  private User requireUser(String sub) {
    return users.findByCognitoSub(sub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded."));
  }

  private User requireAdmin(String sub) {
    User user = requireUser(sub);
    if (!user.isAdmin()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required.");
    }
    return user;
  }

  private Fragrance getCommunityFragrance(String externalId) {
    String ext = String.valueOf(externalId == null ? "" : externalId).trim().toLowerCase(Locale.ROOT);
    if (ext.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalId is required.");
    return fragrances.findByExternalSourceAndExternalId("COMMUNITY", ext)
      .orElseGet(() -> fragrances.findByExternalSourceAndExternalId("community", ext)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Community fragrance not found.")));
  }

  private static String normalizeReason(String reason) {
    String value = String.valueOf(reason == null ? "" : reason).trim().toUpperCase(Locale.ROOT);
    if (value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reason is required.");
    }
    return switch (value) {
      case "SPAM", "INAPPROPRIATE", "OTHER" -> value;
      default -> "OTHER";
    };
  }

  private static String normalizeAction(String action) {
    String value = String.valueOf(action == null ? "" : action).trim().toUpperCase(Locale.ROOT);
    return switch (value) {
      case "DISMISS", "DELETE_FRAGRANCE" -> value;
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported action.");
    };
  }

  private static String normalizeStatusFilter(String status) {
    String value = String.valueOf(status == null ? "OPEN" : status).trim().toUpperCase(Locale.ROOT);
    return switch (value) {
      case "OPEN", "RESOLVED_DISMISSED", "RESOLVED_DELETED", "ALL" -> value;
      default -> "OPEN";
    };
  }

  private static String normalizeDetails(String value) {
    if (value == null) return null;
    String clean = value.trim();
    return clean.isBlank() ? null : clean;
  }

  private static Instant toInstant(Timestamp ts) {
    return ts == null ? null : ts.toInstant();
  }

  private record ReportTarget(UUID fragranceId, String externalId) {}
}
