// src/lib/calendar-linker.ts
import type { CalendarEvent, NoteMeta, MatchResult } from '@/types';

/**
 * A highly optimized class to link calendar events to Obsidian notes.
 * It pre-processes the list of notes into efficient lookup maps
 * to avoid slow, repetitive searches.
 */
export class ObsidianCalendarLinker {
  private dateNoteMap: Map<string, NoteMeta> = new Map();
  private keywordNoteMap: Map<string, NoteMeta[]> = new Map();
  private allNotes: NoteMeta[] = [];
  
  // A set of common, non-descriptive words to ignore during keyword matching.
  private stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'of',
    'is', 'are', 'was', 'were', 'it', 'that', 'this', 'me', 'you', 'he', 'she',
    'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'meeting', 'call',
    'sync', 'update', 'review', 'discuss', 'session', 'appointment'
  ]);

  /**
   * Pre-processes the notes list to build efficient lookup maps.
   * This should be called once before matching multiple events.
   * @param notes An array of `NoteMeta` objects from the Obsidian vault.
   */
  private indexNotes(notes: NoteMeta[]): void {
    this.allNotes = notes;
    this.dateNoteMap.clear();
    this.keywordNoteMap.clear();

    const dateRegex = /(\d{4}-\d{2}-\d{2})/;

    for (const note of notes) {
      // Index by date
      const dateMatch = note.name.match(dateRegex);
      if (dateMatch && !this.dateNoteMap.has(dateMatch[1])) {
        this.dateNoteMap.set(dateMatch[1], note);
      }

      // Index by keywords
      const keywords = this.extractKeywords(note.name);
      for (const keyword of keywords) {
        if (!this.keywordNoteMap.has(keyword)) {
          this.keywordNoteMap.set(keyword, []);
        }
        this.keywordNoteMap.get(keyword)!.push(note);
      }
    }
  }

  /**
   * Extracts meaningful keywords from a string by splitting,
   * converting to lowercase, and removing stop words.
   * @param text The text to extract keywords from.
   * @returns A set of unique keywords.
   */
  private extractKeywords(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .split(/[\s\-_.,;!?()\[\]{}]+/) // Split by various separators
        .filter(word => word.length > 2 && !this.stopWords.has(word))
    );
  }

  /**
   * Matches a single calendar event against the indexed notes.
   * @param event The calendar event to match.
   * @returns A `MatchResult` object.
   */
  private matchEvent(event: CalendarEvent): MatchResult {
    // Strategy 1: Date Match (YYYY-MM-DD) - O(1) lookup
    if (event.start) {
        const isoDate = event.start.split('T')[0];
        const byDate = this.dateNoteMap.get(isoDate);
        if (byDate) {
          return { event, matchedNote: byDate, reason: 'date' };
        }
    }

    // Strategy 2: Keyword Match - O(k) where k is keywords in title
    const keywords = this.extractKeywords(event.title);
    for (const keyword of keywords) {
      const potentialMatches = this.keywordNoteMap.get(keyword);
      if (potentialMatches && potentialMatches.length > 0) {
        // For simplicity, we return the first match.
        // A more advanced implementation could score or rank matches.
        return { event, matchedNote: potentialMatches[0], reason: 'keyword' };
      }
    }

    // Strategy 3: Fallback - No match found
    return { event, reason: 'no match' };
  }

  /**
   * Matches an array of calendar events to an array of Obsidian notes.
   * This is the main public method to be called.
   * @param events An array of `CalendarEvent` objects.
   * @param notes An array of `NoteMeta` objects.
   * @returns An array of `MatchResult` objects, one for each event.
   */
  public matchEventsToNotes(events: CalendarEvent[], notes: NoteMeta[]): MatchResult[] {
    this.indexNotes(notes);
    return events.map(event => this.matchEvent(event));
  }
}
