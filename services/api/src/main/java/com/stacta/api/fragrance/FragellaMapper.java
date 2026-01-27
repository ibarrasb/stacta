package com.stacta.api.fragrance;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.fragrance.dto.NoteDto;
import com.stacta.api.fragrance.dto.NotesDto;
import com.stacta.api.fragrance.dto.RankingDto;
import com.stacta.api.integrations.fragella.FragellaDtos;

@Component
public class FragellaMapper {

  public List<FragranceSearchResult> mapRaw(List<FragellaDtos.Fragrance> raw) {
    if (raw == null || raw.isEmpty()) return List.of();

    List<FragranceSearchResult> out = new ArrayList<>(raw.size());

    for (var f : raw) {
      NotesDto notesDto = mapNotes(f.notes());

      out.add(new FragranceSearchResult(
        "fragella",
        null,

        f.name(),
        f.brand(),
        f.year(),
        f.imageUrl(),
        f.gender(),

        f.rating(),
        f.price(),
        f.priceValue(),

        f.oilType(),
        f.longevity(),
        f.sillage(),
        f.confidence(),
        f.popularity(),

        f.mainAccordsPercentage(),
        mapRanking(f.seasonRanking()),
        mapRanking(f.occasionRanking()),

        f.mainAccords(),
        f.generalNotes(),
        notesDto,
        f.purchaseUrl()
      ));
    }

    return out;
  }

  private NotesDto mapNotes(FragellaDtos.Notes notes) {
    if (notes == null) return null;

    return new NotesDto(
      mapNoteList(notes.top()),
      mapNoteList(notes.middle()),
      mapNoteList(notes.base())
    );
  }

  private List<NoteDto> mapNoteList(List<FragellaDtos.Note> list) {
    if (list == null || list.isEmpty()) return List.of();

    List<NoteDto> out = new ArrayList<>(list.size());
    for (var n : list) {
      if (n == null) continue;
      out.add(new NoteDto(n.name(), n.imageUrl()));
    }
    return out;
  }

  private List<RankingDto> mapRanking(List<FragellaDtos.Ranking> list) {
    if (list == null || list.isEmpty()) return List.of();

    List<RankingDto> out = new ArrayList<>(list.size());
    for (var r : list) {
      if (r == null) continue;
      out.add(new RankingDto(r.name(), r.score()));
    }
    return out;
  }
}
