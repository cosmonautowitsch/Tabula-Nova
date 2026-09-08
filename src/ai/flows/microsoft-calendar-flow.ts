
'use server';

/**
 * @fileOverview A flow to fetch events from the Microsoft Calendar API (Graph API).
 *
 * - fetchMicrosoftCalendarEvents - Fetches calendar events using an access token.
 * - refreshMicrosoftToken - Refreshes an expired Microsoft access token.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { CalendarEvent, MicrosoftAuthTokens } from '@/types';
import { CalendarEventSchema } from '@/types';
import { addDays } from 'date-fns';

// Input schema for fetching events, requiring a Microsoft Graph access token.
const FetchMicrosoftCalendarEventsInputSchema = z.object({
  accessToken: z.string().describe('The Microsoft Graph API access token.'),
});

// Output schema is an array of our unified CalendarEvent model.
const FetchMicrosoftCalendarEventsOutputSchema = z.array(CalendarEventSchema);

/**
 * Maps a raw event object from the Microsoft Graph API to our unified CalendarEvent format.
 * This ensures consistency across different calendar providers.
 * @param event The raw event object from the Microsoft Graph API.
 * @returns A unified CalendarEvent object.
 */
function mapMicrosoftToUIEvent(event: any): CalendarEvent {
    // Determine the start and end times. For all-day events, MS Graph provides dateTime in UTC.
    // The `isAllDay` flag is the primary indicator.
    const start = (event.start?.dateTime + 'Z'); // Append Z to ensure it's parsed as UTC
    const end = (event.end?.dateTime + 'Z');

    return {
        id: event.id,
        title: event.subject || 'No Title',
        description: event.bodyPreview,
        // For Microsoft, the webLink is the canonical link to the event.
        htmlLink: event.webLink,
        start,
        end,
        location: event.location?.displayName,
        isAllDay: event.isAllDay,
        calendarSource: 'microsoft',
        // Use a fixed color for Microsoft events for now.
        color: '#0078D4', // Microsoft Blue
        calendarId: event.calendar?.id || 'primary',
        attendees: event.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean) || [],
        raw: event, // Store the original event data for reference.
    };
}


/**
 * Publicly exported function to fetch Microsoft calendar events.
 * Can be called from other server components or flows.
 * @param accessToken The user's Microsoft Graph API access token.
 * @returns A promise that resolves to an array of unified CalendarEvent objects.
 */
export async function fetchMicrosoftCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  // If no token is provided, return an empty array without attempting to fetch.
  if (!accessToken) {
    console.log("No access token provided, skipping Microsoft Calendar fetch.");
    return [];
  }
  // Call the underlying Genkit flow with the access token.
  return fetchMicrosoftCalendarEventsFlow({ accessToken });
}


// Defines the Genkit flow for fetching Microsoft Calendar events.
const fetchMicrosoftCalendarEventsFlow = ai.defineFlow(
  {
    name: 'fetchMicrosoftCalendarEventsFlow',
    inputSchema: FetchMicrosoftCalendarEventsInputSchema,
    outputSchema: FetchMicrosoftCalendarEventsOutputSchema,
  },
  async ({ accessToken }) => {
    try {
        // Define the time window for the calendar view (e.g., today to 30 days from now).
        const timeMin = new Date().toISOString();
        const timeMax = addDays(new Date(), 30).toISOString();
        const calendarViewUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${timeMin}&endDateTime=${timeMax}&$orderby=start/dateTime`;

      // Fetch events from the user's primary calendar view.
      const response = await fetch(calendarViewUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // If the response is not OK (e.g., 401 Unauthorized), parse the error and throw.
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching Microsoft Calendar events:", errorData);
        // Add status to error message to help identify token expiration (401).
        throw new Error(`(${response.status}) ${errorData.error?.message || 'Failed to fetch Microsoft Calendar events.'}`);
      }
      
      const data = await response.json();
      const items = data.value || [];

      // Map the Microsoft Graph event format to our unified CalendarEvent format.
      return items.map(mapMicrosoftToUIEvent);

    } catch (e: any) {
      console.error("Exception in fetchMicrosoftCalendarEventsFlow:", e);
      // Re-throw the original error message to help with debugging (e.g., token expiry).
      throw new Error(e.message || 'An unexpected error occurred while fetching Microsoft calendar events.');
    }
  }
);


/**
 * Publicly exported function to refresh a Microsoft access token.
 * This is crucial as Microsoft access tokens have a short lifespan (1 hour).
 * @param refreshToken The refresh token obtained during the initial auth.
 * @returns A promise that resolves to the new set of tokens.
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftAuthTokens> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      throw new Error("Microsoft Client ID is not configured on the server.");
    }

    try {
        const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
        const body = new URLSearchParams({
            client_id: clientId,
            scope: "openid offline_access Calendars.Read User.Read Notes.Read",
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        });

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error_description || 'Failed to refresh Microsoft token.');
        }
        return data as MicrosoftAuthTokens;
    } catch (e: any) {
        console.error("Error refreshing Microsoft token:", e);
        throw new Error(e.message);
    }
}
