
'use server';

/**
 * @fileOverview A flow to fetch events from a Notion database.
 * 
 * - fetchNotionCalendar - A function that handles fetching events from a Notion Calendar DB.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Client } from "@notionhq/client";
import { CalendarEventSchema, type CalendarEvent } from '@/types';

const NotionCalendarInputSchema = z.object({
  databaseId: z.string().describe('The ID of the Notion database to query.'),
});

const NotionCalendarOutputSchema = z.array(CalendarEventSchema);

// Maps a raw Notion page to our unified CalendarEvent format by automatically detecting property types.
function mapNotionToUIEvent(page: any): CalendarEvent | null {
    const props = page?.properties;
    if (!props) return null;

    let title: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;
    let location: string | null = null;
    let description: string | null = null;

    // Iterate over all properties to find the ones we need based on their type.
    for (const property of Object.values(props) as any[]) {
        if (property?.type === 'title' && title === null) {
            title = property.title?.map((t: any) => t.plain_text).join('') || null;
        }
        if (property?.type === 'date' && property.date?.start && startDate === null) {
            startDate = property.date.start;
            endDate = property.date.end || startDate;
        }
        // Use the first rich_text field as description, unless a better heuristic is needed.
        if (property?.type === 'rich_text' && description === null) {
            description = property.rich_text?.map((t: any) => t.plain_text).join('') || null;
        }
        // Use the first select field as location.
        if (property?.type === 'select' && location === null) {
            location = property.select?.name || null;
        }
    }

    // A valid event must have at least a title and a start date.
    if (!title || !startDate) {
        return null;
    }

    return {
        id: page.id,
        title: title || "Unnamed Event",
        description: description,
        start: startDate,
        end: endDate!,
        location: location,
        isAllDay: !startDate.includes('T'), // Notion dates without time are considered all-day
        calendarSource: 'notion',
        color: '#373737', // Notion's dark gray
        calendarId: page.parent.database_id,
        raw: page,
    };
}


export async function fetchNotionCalendar(databaseId: string): Promise<CalendarEvent[]> {
    if (!databaseId) {
        return [];
    }
    return notionCalendarFlow({ databaseId });
}

const notionCalendarFlow = ai.defineFlow(
  {
    name: 'notionCalendarFlow',
    inputSchema: NotionCalendarInputSchema,
    outputSchema: NotionCalendarOutputSchema,
  },
  async ({ databaseId }) => {
    const apiKey = process.env.NOTION_API_KEY;

    if (!apiKey) {
      throw new Error("Notion API key is not configured on the server.");
    }
    if (!databaseId) {
        throw new Error("Notion Database ID is not provided.");
    }

    const notion = new Client({ auth: apiKey });

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            // We can't sort by date if the property name is unknown.
            // Sorting will be done on the client after all events are fetched.
        });

        // Map Notion pages to our unified CalendarEvent format and filter out nulls
        return response.results.map(mapNotionToUIEvent).filter((event): event is CalendarEvent => event !== null);

    } catch(e: any) {
        console.error("Error fetching from Notion:", e.body || e.message);
        throw new Error(`Failed to fetch from Notion. Is the Database ID correct and has the integration been shared with the database? Error: ${e.code || e.message}`);
    }
  }
);
