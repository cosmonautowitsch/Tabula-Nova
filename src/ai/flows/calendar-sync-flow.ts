
'use server';

/**
 * @fileOverview A central flow to sync events from all connected calendar sources.
 * This acts as a manager, calling the appropriate connector flows based on user settings.
 *
 * - syncAllCalendars - Fetches events from all configured providers.
 * - SyncAllCalendarsInput - The input type for the sync function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { CalendarEvent, StoredSettings, GoogleAuthTokens, MicrosoftAuthTokens, CalendarConnector } from '@/types';
import { CalendarEventSchema } from '@/types';
import { fetchGoogleCalendarEvents } from './google-calendar-flow';
import { fetchNotionCalendar } from './notion-flow';
import { fetchProtonEvents, fetchProtonCalendars } from './proton-calendar-flow';
import { fetchMicrosoftCalendarEvents, refreshMicrosoftToken } from './microsoft-calendar-flow';
import { fetchAppleEvents, fetchAppleCalendars } from './apple-calendar-flow'; // Import Apple flows
import { addDays } from 'date-fns';

// Input schema for the main sync flow.
const SyncAllCalendarsInputSchema = z.object({
    settings: z.any().describe("The user's stored settings object."),
    // Added tokens for all potential providers
    tokens: z.object({
        google: z.any().optional().describe("Google OAuth tokens."),
        microsoft: z.any().optional().describe("Microsoft OAuth tokens."),
    }).describe("An object containing auth tokens for various services."),
});

// Defines the output for the sync flow, which now can also return updated tokens
const SyncAllCalendarsOutputSchema = z.object({
    events: z.array(CalendarEventSchema),
    updatedTokens: z.object({
        microsoft: z.any().optional(),
    }).optional(),
});

// --- KIL Calendar Connector Definitions ---
const googleConnector: CalendarConnector = {
    id: 'google',
    name: 'Google Calendar',
    isConfigured: (settings, tokens) => settings.googleCalendarConnected && !!tokens?.google?.access_token,
    sync: async (settings, tokens) => {
        return fetchGoogleCalendarEvents(tokens.google.access_token);
    },
};

const microsoftConnector: CalendarConnector = {
    id: 'microsoft',
    name: 'Microsoft Calendar',
    isConfigured: (settings, tokens) => settings.microsoftCalendarConnected && !!tokens?.microsoft?.access_token,
    sync: async (settings, tokens) => {
        return fetchMicrosoftCalendarEvents(tokens.microsoft.access_token);
    },
    refreshToken: async (tokens) => {
        if (!tokens?.microsoft?.refresh_token) throw new Error("No Microsoft refresh token available.");
        return refreshMicrosoftToken(tokens.microsoft.refresh_token);
    }
};

const notionConnector: CalendarConnector = {
    id: 'notion',
    name: 'Notion Calendar',
    isConfigured: (settings) => !!settings.notionDatabaseId,
    sync: async (settings) => {
        return fetchNotionCalendar(settings.notionDatabaseId!);
    }
};

const protonConnector: CalendarConnector = {
    id: 'proton',
    name: 'Proton Calendar',
    isConfigured: (settings) => settings.protonCalendarConnected && !!settings.protonUsername && !!settings.protonAppPassword && !!settings.protonCaldavUrl,
    sync: async (settings) => {
        const creds = {
            username: settings.protonUsername!,
            appPassword: settings.protonAppPassword!,
            caldavUrl: settings.protonCaldavUrl!,
        };
        const calendars = await fetchProtonCalendars(creds);
        const startDate = new Date();
        const endDate = addDays(startDate, 30);
        const eventPromises = calendars.map(cal =>
            fetchProtonEvents({ credentials: creds, calendar: cal, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        );
        const eventsFromAllCalendars = await Promise.all(eventPromises);
        return eventsFromAllCalendars.flat();
    }
};

const appleConnector: CalendarConnector = {
    id: 'apple',
    name: 'Apple Calendar',
    isConfigured: (settings) => settings.appleCalendarConnected && !!settings.appleId && !!settings.appleAppPassword && !!settings.appleCaldavUrl,
    sync: async (settings) => {
        const creds = {
            username: settings.appleId!,
            appPassword: settings.appleAppPassword!,
            caldavUrl: settings.appleCaldavUrl!,
        };
        const calendars = await fetchAppleCalendars(creds);
        const startDate = new Date();
        const endDate = addDays(startDate, 30);
        const eventPromises = calendars.map(cal =>
            fetchAppleEvents({ credentials: creds, calendar: cal, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        );
        const eventsFromAllCalendars = await Promise.all(eventPromises);
        return eventsFromAllCalendars.flat();
    }
};

const customCalDavConnector: CalendarConnector = {
    id: 'custom',
    name: 'Custom CalDAV',
    isConfigured: (settings) => settings.otherCaldavConnected && !!settings.otherCaldavUsername && !!settings.otherCaldavAppPassword && !!settings.otherCaldavUrl,
    sync: async (settings) => {
        const creds = {
            username: settings.otherCaldavUsername!,
            appPassword: settings.otherCaldavAppPassword!,
            caldavUrl: settings.otherCaldavUrl!,
        };
        const calendars = await fetchProtonCalendars(creds); // Reuses generic CalDAV fetcher
        const startDate = new Date();
        const endDate = addDays(startDate, 30);
        const eventPromises = calendars.map(cal =>
            fetchProtonEvents({ credentials: creds, calendar: cal, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        );
        const eventsFromAllCalendars = await Promise.all(eventPromises);
        return eventsFromAllCalendars.flat().map(e => ({...e, calendarSource: 'custom'}));
    }
};

// List of all available connectors, making the system extensible
const allConnectors: CalendarConnector[] = [
    googleConnector,
    microsoftConnector,
    notionConnector,
    protonConnector,
    appleConnector,
    customCalDavConnector
];


/**
 * Publicly exported function that can be called from the frontend.
 * It now returns events and potentially updated tokens.
 * @param input The settings and tokens required for the sync.
 * @returns A promise that resolves to an object with a unified list of calendar events and any updated tokens.
 */
export async function syncAllCalendars(
    input: z.infer<typeof SyncAllCalendarsInputSchema>
): Promise<z.infer<typeof SyncAllCalendarsOutputSchema>> {
  return syncAllCalendarsFlow(input);
}

// Defines the Genkit flow for syncing all calendars.
const syncAllCalendarsFlow = ai.defineFlow(
  {
    name: 'syncAllCalendarsFlow',
    inputSchema: SyncAllCalendarsInputSchema,
    outputSchema: SyncAllCalendarsOutputSchema,
  },
  async ({ settings, tokens }) => {
    const allEvents: CalendarEvent[] = [];
    const promises: Promise<CalendarEvent[]>[] = [];
    const updatedTokens: { microsoft?: MicrosoftAuthTokens } = {};

    for (const connector of allConnectors) {
        if (connector.isConfigured(settings, tokens)) {
            const promise = (async () => {
                try {
                    return await connector.sync(settings, tokens);
                } catch (error: any) {
                    // Specific handling for Microsoft token refresh
                    if (connector.id === 'microsoft' && error.message.includes("401") && connector.refreshToken) {
                        try {
                            console.log("Microsoft token expired, attempting to refresh...");
                            const newTokens = await connector.refreshToken(tokens);
                            updatedTokens.microsoft = newTokens;
                            const refreshedTokens = { ...tokens, microsoft: newTokens };
                            return await connector.sync(settings, refreshedTokens);
                        } catch (refreshError: any) {
                            console.error(`Failed to refresh token for ${connector.name}:`, refreshError.message);
                            throw refreshError; // Re-throw refresh error
                        }
                    }
                    // For other errors, just log and throw
                    console.error(`Error syncing with ${connector.name}:`, error.message);
                    throw error;
                }
            })();
            promises.push(promise);
        }
    }

    try {
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allEvents.push(...result.value);
            } else if (result.status === 'rejected') {
                console.error("A calendar connector failed to sync:", result.reason?.message || result.reason);
            }
        });

        // Sort all collected events by their start date.
        const sortedEvents = allEvents.sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
        );

        return { events: sortedEvents, updatedTokens };

    } catch (error) {
        console.error("An unexpected error occurred during calendar sync:", error);
        throw new Error("Failed to sync calendar data.");
    }
  }
);
