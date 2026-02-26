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
        safeExternalId(f),
        f.name(),
        f.brand(),
        f.year(),
        f.imageUrl(),
        null,
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
        f.purchaseUrl(),
      
        //new community fields (not applicable for fragella)
        null, null, null, null, null, null, null, null
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
      out.add(new NoteDto(null, n.name(), n.imageUrl()));
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

  private String safeExternalId(FragellaDtos.Fragrance f) {
    if (f == null) return null;

    // try common names without breaking compile for your record
    try {
      // if your record has externalId()
      var m = f.getClass().getMethod("externalId");
      Object v = m.invoke(f);
      if (v != null && !v.toString().isBlank()) return v.toString();
    } catch (Exception ignore) {}

    try {
      // if your record has id()
      var m = f.getClass().getMethod("id");
      Object v = m.invoke(f);
      if (v != null && !v.toString().isBlank()) return v.toString();
    } catch (Exception ignore) {}

    try {
      // if your record has slug()
      var m = f.getClass().getMethod("slug");
      Object v = m.invoke(f);
      if (v != null && !v.toString().isBlank()) return v.toString();
    } catch (Exception ignore) {}

    return null;
  }

}
