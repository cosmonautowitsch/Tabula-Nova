
'use server';

/**
 * @fileOverview Flows to interact with Proton Calendar via CalDAV.
 * 
 * - testProtonConnection - Verifies CalDAV credentials.
 * - fetchProtonCalendars - Fetches a list of available calendars.
 * - fetchProtonEvents - Fetches events from a specific calendar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createDAVClient } from 'tsdav';
import { CalDAVCredentialsSchema, DavCalendarSchema, CalendarEventSchema, type CalDAVCredentials, type DavCalendar, type CalendarEvent } from '@/types';
import ical from 'node-ical';
import { v4 as uuidv4 } from 'uuid';

// Output schema for testing the connection
const ConnectionTestOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const FetchCalendarsOutputSchema = z.array(DavCalendarSchema);

// Schema for fetching events
const FetchEventsInputSchema = z.object({
    credentials: CalDAVCredentialsSchema,
    calendar: DavCalendarSchema,
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
});

const FetchEventsOutputSchema = z.array(CalendarEventSchema);

// Maps a raw iCal VEVENT to our unified CalendarEvent format
function mapProtonToUIEvent(event: ical.VEvent, calendar: DavCalendar): CalendarEvent {
    const isAllDay = (event.start as ical.DateWithTimeZone)?.dateOnly === true;
    return {
        id: event.uid || uuidv4(),
        title: event.summary || 'No Title',
        description: event.description || null,
        start: (event.start as Date)?.toISOString(),
        end: (event.end as Date)?.toISOString(),
        location: event.location || null,
        isAllDay,
        calendarSource: 'proton',
        color: '#6e44ff', // Proton's primary purple
        calendarId: calendar.name || calendar.url,
        attendees: [], // Proton CalDAV does not expose attendees
        raw: event,
    };
}


/**
 * Tests the connection to the Proton CalDAV server.
 */
export async function testProtonConnection(credentials: CalDAVCredentials): Promise<{ success: boolean; message: string }> {
  return testProtonConnectionFlow(credentials);
}

const testProtonConnectionFlow = ai.defineFlow(
  {
    name: 'testProtonConnectionFlow',
    inputSchema: CalDAVCredentialsSchema,
    outputSchema: ConnectionTestOutputSchema,
  },
  async (creds) => {
    try {
      const client = await createDAVClient({
        server: creds.caldavUrl,
        credentials: {
          username: creds.username,
          password: creds.appPassword,
        },
        authMethod: 'Basic',
        accountType: 'caldav',
      });

      // Fetch account to verify credentials. If it fails, it will throw an error.
      const account = await client.createAccount({
        account: {
            rootUrl: client.server,
            accountType: 'caldav'
        }
      });
      
      if (account) {
        return { success: true, message: 'Connection successful!' };
      }
      // This part might not be reached if createAccount throws, but as a fallback.
      return { success: false, message: "Could not retrieve account details, but connection seemed to work." };

    } catch (e: any) {
      console.error("Proton CalDAV connection test failed:", e);
      return { success: false, message: e.message || "Failed to connect. Check credentials and URL." };
    }
  }
);


/**
 * Fetches the list of calendars from the Proton CalDAV server.
 */
export async function fetchProtonCalendars(credentials: CalDAVCredentials): Promise<DavCalendar[]> {
    return fetchProtonCalendarsFlow(credentials);
}

const fetchProtonCalendarsFlow = ai.defineFlow(
  {
    name: 'fetchProtonCalendarsFlow',
    inputSchema: CalDAVCredentialsSchema,
    outputSchema: FetchCalendarsOutputSchema,
  },
  async (creds) => {
    try {
      const client = await createDAVClient({
        server: creds.caldavUrl,
        credentials: {
          username: creds.username,
          password: creds.appPassword,
        },
        authMethod: 'Basic',
        accountType: 'caldav',
      });

      const account = await client.createAccount({
        account: {
            rootUrl: client.server,
            accountType: 'caldav'
        }
      });

      return (account.calendars ?? []).map(c => ({
          url: c.url,
          name: c.name,
          description: c.description,
          ctag: c.ctag,
          resourcetype: c.resourcetype,
      }));
    } catch (e: any) {
      console.error("Failed to fetch Proton calendars:", e);
      throw new Error(e.message || "Could not fetch calendars.");
    }
  }
);


/**
 * Fetches events from a specific Proton calendar.
 */
export async function fetchProtonEvents(input: z.infer<typeof FetchEventsInputSchema>): Promise<z.infer<typeof FetchEventsOutputSchema>> {
    return fetchProtonEventsFlow(input);
}

const fetchProtonEventsFlow = ai.defineFlow(
  {
    name: 'fetchProtonEventsFlow',
    inputSchema: FetchEventsInputSchema,
    outputSchema: FetchEventsOutputSchema,
  },
  async ({ credentials, calendar, startDate, endDate }) => {
    try {
      const client = await createDAVClient({
        server: credentials.caldavUrl,
        credentials: {
          username: credentials.username,
          password: credentials.appPassword,
        },
        authMethod: 'Basic',
        accountType: 'caldav',
      });
      
      const icsEvents = await client.fetchCalendarObjects({
        calendar: calendar,
        timeRange: {
            start: startDate,
            end: endDate,
        }
      });

      const parsedEvents: CalendarEvent[] = [];
      for (const icsEvent of icsEvents) {
          if (!icsEvent.data) continue;
          const eventsData = ical.parseICS(icsEvent.data);
          for (const key in eventsData) {
              if (eventsData[key].type === 'VEVENT') {
                  const event = eventsData[key] as ical.VEvent;
                  parsedEvents.push(mapProtonToUIEvent(event, calendar));
              }
          }
      }

      return parsedEvents;

    } catch (e: any) {
      console.error("Failed to fetch/parse Proton events:", e);
      throw new Error(e.message || "Could not fetch or parse events from Proton Calendar.");
    }
  }
);
