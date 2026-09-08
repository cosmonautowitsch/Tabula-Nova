'use server';

/**
 * @fileOverview A flow to fetch events from the Google Calendar API.
 * This flow takes a user's access token and fetches their upcoming
 * primary calendar events, mapping them to a unified format.
 * 
 * - fetchGoogleCalendarEvents - Fetches calendar events using an access token.
 * - createGoogleEvent - Creates a new event.
 * - deleteGoogleEvent - Deletes an event.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { CalendarEvent } from '@/types';
import { CalendarEventSchema } from '@/types';

// Define the input schema for the flow, requiring a Google OAuth access token.
const AuthOnlyInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth 2.0 access token.'),
});

// Define the output schema for the array of events, using our unified model.
const FetchGoogleCalendarEventsOutputSchema = z.array(CalendarEventSchema);

const CreateEventInputSchema = AuthOnlyInputSchema.extend({
    title: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
});

const DeleteEventInputSchema = AuthOnlyInputSchema.extend({
    eventId: z.string(),
});


/**
 * Publicly exported function that can be called from other server components or flows.
 * @param accessToken The user's Google OAuth 2.0 access token.
 * @returns A promise that resolves to an array of unified CalendarEvent objects.
 */
export async function fetchGoogleCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  // If no token is provided, return an empty array without attempting to fetch.
  if (!accessToken) {
    console.log("No access token provided, skipping Google Calendar fetch.");
    return [];
  }
  // Call the underlying Genkit flow with the access token.
  return fetchGoogleCalendarEventsFlow({ accessToken });
}

export async function createGoogleEvent(input: z.infer<typeof CreateEventInputSchema>): Promise<CalendarEvent> {
    return createGoogleEventFlow(input);
}

export async function deleteGoogleEvent(input: z.infer<typeof DeleteEventInputSchema>): Promise<{ success: boolean }> {
    return deleteGoogleEventFlow(input);
}


/**
 * Maps a raw event object from the Google Calendar API to our unified CalendarEvent format.
 * This ensures consistency across different calendar providers.
 * @param event The raw event object from the Google Calendar API.
 * @returns A unified CalendarEvent object.
 */
function mapGoogleToUIEvent(event: any): CalendarEvent {
    // An all-day event in Google Calendar has a `date` but no `dateTime` property.
    const isAllDay = !!event.start?.date && !event.start?.dateTime;
    
    // An all-day event in Google Calendar has a `date` but no `dateTime` property.
    return {
        id: event.id,
        title: event.summary || 'No Title',
        description: event.description,
        // Use the dateTime for timed events, or date for all-day events.
        start: (event.start?.dateTime || event.start?.date),
        end: (event.end?.dateTime || event.end?.date),
        location: event.location,
        htmlLink: event.htmlLink,
        isAllDay: isAllDay,
        calendarSource: 'google',
        // Use Google's colorId to apply a consistent color, if available.
        color: event.colorId ? `var(--google-event-color-${event.colorId})` : undefined,
        calendarId: 'primary', // We are fetching the primary calendar.
        attendees: event.attendees?.map((a: any) => a.email) || [],
        raw: event, // Store the original event data for reference.
    };
}

// Defines the Genkit flow for fetching Google Calendar events.
const fetchGoogleCalendarEventsFlow = ai.defineFlow(
  {
    name: 'fetchGoogleCalendarEventsFlow',
    inputSchema: AuthOnlyInputSchema,
    outputSchema: FetchGoogleCalendarEventsOutputSchema,
  },
  async ({ accessToken }) => {
    try {
      // Fetch the next 15 events from the user's primary calendar.
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15&orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // If the response is not OK, parse the error and throw.
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching Google Calendar events:", errorData);
        throw new Error(errorData.error?.message || 'Failed to fetch Google Calendar events.');
      }
      
      const data = await response.json();
      const items = data.items || [];

      // Map the Google Calendar event format to our unified CalendarEvent format.
      return items.map(mapGoogleToUIEvent);

    } catch (e: any) {
      console.error("Exception in fetchGoogleCalendarEventsFlow:", e);
      // Don't expose detailed error messages to the client for security reasons.
      throw new Error('An unexpected error occurred while fetching calendar events.');
    }
  }
);


const createGoogleEventFlow = ai.defineFlow(
    {
        name: 'createGoogleEventFlow',
        inputSchema: CreateEventInputSchema,
        outputSchema: CalendarEventSchema,
    },
    async ({ accessToken, title, start, end }) => {
        try {
            const event = {
                summary: title,
                start: { dateTime: start, timeZone: 'UTC' },
                end: { dateTime: end, timeZone: 'UTC' },
            };
            const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to create event.');
            }
            const newEvent = await response.json();
            return mapGoogleToUIEvent(newEvent);
        } catch (e: any) {
            console.error("Exception in createGoogleEventFlow:", e);
            throw new Error(`An unexpected error occurred: ${e.message}`);
        }
    }
);

const deleteGoogleEventFlow = ai.defineFlow(
    {
        name: 'deleteGoogleEventFlow',
        inputSchema: DeleteEventInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ accessToken, eventId }) => {
        try {
            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.status === 204 || response.ok) {
                return { success: true };
            }
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to delete event.');
        } catch (e: any) {
            console.error("Exception in deleteGoogleEventFlow:", e);
            throw new Error(`An unexpected error occurred: ${e.message}`);
        }
    }
);
