
'use server';

/**
 * @fileOverview Flows to interact with Apple Calendar via CalDAV.
 * This is largely a copy of the Proton implementation, as both use CalDAV.
 * 
 * - testAppleConnection - Verifies CalDAV credentials for Apple.
 * - fetchAppleCalendars - Fetches a list of available calendars.
 * - fetchAppleEvents - Fetches events from a specific calendar.
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
function mapAppleToUIEvent(event: ical.VEvent, calendar: DavCalendar): CalendarEvent {
    const isAllDay = (event.start as ical.DateWithTimeZone)?.dateOnly === true;
    return {
        id: event.uid || uuidv4(),
        title: event.summary || 'No Title',
        description: event.description || null,
        start: (event.start as Date)?.toISOString(),
        end: (event.end as Date)?.toISOString(),
        location: event.location || null,
        isAllDay,
        calendarSource: 'apple',
        color: '#ff3b30', // Apple Red
        calendarId: calendar.name || calendar.url,
        attendees: [], // CalDAV does not typically expose attendees
        raw: event,
    };
}


/**
 * Tests the connection to the Apple CalDAV server.
 */
export async function testAppleConnection(credentials: CalDAVCredentials): Promise<{ success: boolean; message: string }> {
  return testAppleConnectionFlow(credentials);
}

const testAppleConnectionFlow = ai.defineFlow(
  {
    name: 'testAppleConnectionFlow',
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
      console.error("Apple CalDAV connection test failed:", e);
      return { success: false, message: e.message || "Failed to connect. Check credentials and URL." };
    }
  }
);


/**
 * Fetches the list of calendars from the Apple CalDAV server.
 */
export async function fetchAppleCalendars(credentials: CalDAVCredentials): Promise<DavCalendar[]> {
    return fetchAppleCalendarsFlow(credentials);
}

const fetchAppleCalendarsFlow = ai.defineFlow(
  {
    name: 'fetchAppleCalendarsFlow',
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
      console.error("Failed to fetch Apple calendars:", e);
      throw new Error(e.message || "Could not fetch calendars.");
    }
  }
);


/**
 * Fetches events from a specific Apple calendar.
 */
export async function fetchAppleEvents(input: z.infer<typeof FetchEventsInputSchema>): Promise<z.infer<typeof FetchEventsOutputSchema>> {
    return fetchAppleEventsFlow(input);
}

const fetchAppleEventsFlow = ai.defineFlow(
  {
    name: 'fetchAppleEventsFlow',
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
                  parsedEvents.push(mapAppleToUIEvent(event, calendar));
              }
          }
      }

      return parsedEvents;

    } catch (e: any) {
      console.error("Failed to fetch/parse Apple events:", e);
      throw new Error(e.message || "Could not fetch or parse events from Apple Calendar.");
    }
  }
);
