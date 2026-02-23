package com.stacta.api.note;

import com.stacta.api.note.dto.NoteReportItemDto;
import com.stacta.api.note.dto.NoteReportOffenderItemDto;
import com.stacta.api.note.dto.ResolveNoteReportRequest;
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
public class NoteModerationService {

  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final NoteRepository notes;

  public NoteModerationService(JdbcTemplate jdbc, UserRepository users, NoteRepository notes) {
    this.jdbc = jdbc;
    this.users = users;
    this.notes = notes;
  }

  @Transactional
  public void reportNote(UUID noteId, String reason, String details, String viewerSub) {
    User reporter = requireUser(viewerSub);
    if (noteId == null || notes.findById(noteId).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found.");
    }
    String normalizedReason = normalizeReason(reason);
    String cleanDetails = normalizeDetails(details);

    Integer openExists = jdbc.queryForObject(
      """
      SELECT COUNT(*)
      FROM note_report
      WHERE note_id = ?
        AND reported_by_user_id = ?
        AND status = 'OPEN'
      """,
      Integer.class,
      noteId,
      reporter.getId()
    );
    if ((openExists == null ? 0 : openExists) > 0) return;

    jdbc.update(
      """
      INSERT INTO note_report (note_id, reported_by_user_id, reason, details)
      VALUES (?, ?, ?, ?)
      """,
      noteId,
      reporter.getId(),
      normalizedReason,
      cleanDetails
    );
  }

  @Transactional(readOnly = true)
  public List<NoteReportItemDto> list(String status, int limit, String viewerSub) {
    requireAdmin(viewerSub);
    int safeLimit = Math.max(1, Math.min(limit, 200));
    String normalizedStatus = normalizeStatusFilter(status);

    return jdbc.query(
      """
      SELECT
        r.id,
        r.note_id,
        n.name AS note_name,
        COALESCE(n.usage_count, 0) AS note_usage_count,
        ru.username AS reported_by_username,
        ru.display_name AS reported_by_display_name,
        r.reason,
        r.details,
        r.status,
        r.merged_into_note_id,
        mn.name AS merged_into_note_name,
        r.resolution_note,
        rs.username AS resolved_by_username,
        r.created_at,
        r.resolved_at
      FROM note_report r
      JOIN note_dictionary n ON n.id = r.note_id
      JOIN users ru ON ru.id = r.reported_by_user_id
      LEFT JOIN users rs ON rs.id = r.resolved_by_user_id
      LEFT JOIN note_dictionary mn ON mn.id = r.merged_into_note_id
      WHERE (? = 'ALL' OR r.status = ?)
      ORDER BY
        CASE WHEN r.status = 'OPEN' THEN 0 ELSE 1 END,
        r.created_at DESC
      LIMIT ?
      """,
      (rs, rowNum) -> new NoteReportItemDto(
        rs.getObject("id", UUID.class),
        rs.getObject("note_id", UUID.class),
        rs.getString("note_name"),
        rs.getInt("note_usage_count"),
        rs.getString("reported_by_username"),
        rs.getString("reported_by_display_name"),
        rs.getString("reason"),
        rs.getString("details"),
        rs.getString("status"),
        rs.getObject("merged_into_note_id", UUID.class),
        rs.getString("merged_into_note_name"),
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

  @Transactional(readOnly = true)
  public List<NoteReportOffenderItemDto> offenders(UUID reportId, String viewerSub) {
    requireAdmin(viewerSub);
    if (reportId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report id is required.");
    }

    UUID noteId = jdbc.query(
      """
      SELECT note_id
      FROM note_report
      WHERE id = ?
      """,
      rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
      reportId
    );
    if (noteId == null) return List.of();

    return jdbc.query(
      """
      SELECT
        u.id AS user_id,
        u.username,
        u.display_name,
        COUNT(DISTINCT f.id) AS fragrance_count,
        COALESCE((
          SELECT COUNT(*)
          FROM user_moderation_strike s
          WHERE s.user_id = u.id
        ), 0) AS strike_count
      FROM fragrance_note fn
      JOIN fragrance f ON f.id = fn.fragrance_id
      JOIN users u ON u.id = f.created_by_user_id
      WHERE fn.note_id = ?
      GROUP BY u.id, u.username, u.display_name
      ORDER BY fragrance_count DESC, strike_count DESC, u.username ASC NULLS LAST
      LIMIT 50
      """,
      (rs, rowNum) -> new NoteReportOffenderItemDto(
        rs.getObject("user_id", UUID.class),
        rs.getString("username"),
        rs.getString("display_name"),
        rs.getInt("fragrance_count"),
        rs.getInt("strike_count")
      ),
      noteId
    );
  }

  @Transactional
  public void issueStrike(String viewerSub, UUID userId, UUID noteReportId, String reason, Integer points) {
    User admin = requireAdmin(viewerSub);
    if (userId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required.");
    }
    if (users.findById(userId).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target user not found.");
    }
    String cleanReason = normalizeDetails(reason);
    if (cleanReason == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reason is required.");
    }
    int safePoints = points == null ? 1 : Math.max(1, Math.min(points, 10));

    if (noteReportId != null) {
      Integer exists = jdbc.queryForObject(
        "SELECT COUNT(*) FROM note_report WHERE id = ?",
        Integer.class,
        noteReportId
      );
      if ((exists == null ? 0 : exists) == 0) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "noteReportId not found.");
      }
    }

    jdbc.update(
      """
      INSERT INTO user_moderation_strike (user_id, issued_by_user_id, note_report_id, reason, points)
      VALUES (?, ?, ?, ?, ?)
      """,
      userId,
      admin.getId(),
      noteReportId,
      cleanReason,
      safePoints
    );

    jdbc.update(
      """
      INSERT INTO notification_event (recipient_user_id, actor_user_id, type, source_follow_id, created_at)
      VALUES (?, ?, 'MODERATION_STRIKE', NULL, now())
      """,
      userId,
      admin.getId()
    );
  }

  @Transactional
  public void resolve(UUID reportId, ResolveNoteReportRequest req, String viewerSub) {
    User admin = requireAdmin(viewerSub);
    if (reportId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report id is required.");
    }
    String action = normalizeAction(req.action());
    String resolutionNote = normalizeDetails(req.resolutionNote());

    UUID sourceNoteId = jdbc.query(
      """
      SELECT note_id
      FROM note_report
      WHERE id = ?
        AND status = 'OPEN'
      """,
      rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
      reportId
    );
    if (sourceNoteId == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Open report not found.");
    }

    if ("DISMISS".equals(action)) {
      jdbc.update(
        """
        UPDATE note_report
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

    UUID targetNoteId = req.targetNoteId();
    if (targetNoteId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetNoteId is required for MERGE_INTO.");
    }
    if (targetNoteId.equals(sourceNoteId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot merge note into itself.");
    }
    if (notes.findById(targetNoteId).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target note was not found.");
    }

    jdbc.update(
      """
      INSERT INTO fragrance_note (fragrance_id, note_id, note_category, display_order)
      SELECT fragrance_id, ?, note_category, display_order
      FROM fragrance_note
      WHERE note_id = ?
      ON CONFLICT DO NOTHING
      """,
      targetNoteId,
      sourceNoteId
    );
    jdbc.update("DELETE FROM fragrance_note WHERE note_id = ?", sourceNoteId);
    jdbc.update("UPDATE user_custom_note_creation_event SET note_id = ? WHERE note_id = ?", targetNoteId, sourceNoteId);

    recountUsage(targetNoteId);
    recountUsage(sourceNoteId);

    jdbc.update(
      """
      DELETE FROM note_dictionary n
      WHERE n.id = ?
        AND NOT EXISTS (
          SELECT 1 FROM fragrance_note fn WHERE fn.note_id = n.id
        )
      """,
      sourceNoteId
    );

    jdbc.update(
      """
      UPDATE note_report
      SET status = 'RESOLVED_MERGED',
          merged_into_note_id = ?,
          resolution_note = ?,
          resolved_by_user_id = ?,
          resolved_at = now()
      WHERE note_id = ?
        AND status = 'OPEN'
      """,
      targetNoteId,
      resolutionNote,
      admin.getId(),
      sourceNoteId
    );
  }

  private void recountUsage(UUID noteId) {
    if (noteId == null) return;
    jdbc.update(
      """
      UPDATE note_dictionary n
      SET usage_count = COALESCE((
        SELECT COUNT(*)
        FROM fragrance_note fn
        WHERE fn.note_id = n.id
      ), 0)
      WHERE n.id = ?
      """,
      noteId
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

  private static String normalizeReason(String reason) {
    String value = String.valueOf(reason == null ? "" : reason).trim().toUpperCase(Locale.ROOT);
    if (value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reason is required.");
    }
    return switch (value) {
      case "SPAM", "INAPPROPRIATE", "DUPLICATE", "OTHER" -> value;
      default -> "OTHER";
    };
  }

  private static String normalizeAction(String action) {
    String value = String.valueOf(action == null ? "" : action).trim().toUpperCase(Locale.ROOT);
    return switch (value) {
      case "DISMISS", "MERGE_INTO" -> value;
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported action.");
    };
  }

  private static String normalizeStatusFilter(String status) {
    String value = String.valueOf(status == null ? "OPEN" : status).trim().toUpperCase(Locale.ROOT);
    return switch (value) {
      case "OPEN", "RESOLVED_DISMISSED", "RESOLVED_MERGED", "ALL" -> value;
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
}
