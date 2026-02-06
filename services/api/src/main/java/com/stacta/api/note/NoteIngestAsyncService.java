package com.stacta.api.note;

import com.stacta.api.integrations.fragella.FragellaDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NoteIngestAsyncService {

  private static final Logger log = LoggerFactory.getLogger(NoteIngestAsyncService.class);

  private final NoteService noteService;

  public NoteIngestAsyncService(NoteService noteService) {
    this.noteService = noteService;
  }

  /**
   * Fire-and-forget ingestion.
   * - runs on a background thread pool (ingestExecutor)
   * - logs failures
   * - retries a few times with backoff (simple, no extra infra)
   *
   * Idempotency:
   * - NoteService upserts by normalized_name
   * - DB has unique constraint on normalized_name
   */
  @Async("ingestExecutor")
  public void ingestNotesFromFragellaAsync(List<FragellaDtos.Fragrance> items) {
    if (items == null || items.isEmpty()) return;

    int attempts = 0;
    long backoffMs = 250;

    while (true) {
      attempts++;
      try {
        noteService.ingestNotesFromFragella(items);
        return;
      } catch (Exception e) {
        log.warn("Async note ingestion failed (attempt {}/3). Will {}retry. items={}",
          attempts,
          (attempts >= 3 ? "NOT " : ""),
          items.size(),
          e
        );

        if (attempts >= 3) return;

        try {
          Thread.sleep(backoffMs);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          return;
        }
        backoffMs *= 4; // 250ms -> 1000ms -> 4000ms
      }
    }
  }
}
