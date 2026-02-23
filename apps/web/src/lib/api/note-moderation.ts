import { authedFetch } from "@/lib/api/client";
import type {
  FragranceReportListResponse,
  NoteReportListResponse,
  NoteReportOffender,
} from "@/lib/api/types";

export function reportNote(noteId: string, body: { reason: string; details?: string | null }) {
  return authedFetch<void>(`/api/v1/notes/${encodeURIComponent(noteId)}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function reportCommunityFragrance(externalId: string, body: { reason: string; details?: string | null }) {
  return authedFetch<void>(`/api/v1/community-fragrances/${encodeURIComponent(externalId)}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listNoteReports(params?: { status?: "OPEN" | "ALL" | "RESOLVED_DISMISSED" | "RESOLVED_MERGED"; limit?: number }) {
  const status = params?.status ?? "OPEN";
  const limit = params?.limit ?? 100;
  return authedFetch<NoteReportListResponse>(
    `/api/v1/admin/note-reports?status=${encodeURIComponent(status)}&limit=${limit}`
  );
}

export function resolveNoteReport(
  reportId: string,
  body: {
    action: "DISMISS" | "MERGE_INTO";
    targetNoteId?: string;
    resolutionNote?: string | null;
  }
) {
  return authedFetch<void>(`/api/v1/admin/note-reports/${encodeURIComponent(reportId)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listNoteReportOffenders(reportId: string) {
  return authedFetch<NoteReportOffender[]>(
    `/api/v1/admin/note-reports/${encodeURIComponent(reportId)}/offenders`
  );
}

export function issueUserStrike(body: {
  userId: string;
  noteReportId?: string;
  reason: string;
  points?: number;
}) {
  return authedFetch<void>(`/api/v1/admin/note-reports/strikes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listFragranceReports(params?: { status?: "OPEN" | "ALL" | "RESOLVED_DISMISSED" | "RESOLVED_DELETED"; limit?: number }) {
  const status = params?.status ?? "OPEN";
  const limit = params?.limit ?? 100;
  return authedFetch<FragranceReportListResponse>(
    `/api/v1/admin/fragrance-reports?status=${encodeURIComponent(status)}&limit=${limit}`
  );
}

export function resolveFragranceReport(
  reportId: string,
  body: {
    action: "DISMISS" | "DELETE_FRAGRANCE";
    resolutionNote?: string | null;
  }
) {
  return authedFetch<void>(`/api/v1/admin/fragrance-reports/${encodeURIComponent(reportId)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
