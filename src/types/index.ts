

import { z } from 'zod';

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  favicon?: string; // Optional: URL to the website's favicon
  tags?: string[]; // Optional: Array of tags for the link
  colSpan?: number; // For wallboard layout
  rowSpan?: number; // For wallboard layout
};

export type Folder = {
  id: string;
  name: string;
  links: LinkItem[];
  isOpen?: boolean; // For UI state, e.g., accordion
  iconId?: string;
  layout?: 'grid' | 'list' | 'masonry' | 'carousel' | 'wallboard'; // NEW: Per-folder layout setting
};

export type BackgroundSettings = {
  type: 'color' | 'image';
  value: string; // Hex color or image URL / data URI for uploaded image, or gradient string
};

export type WeatherData = {
  city: string;
  temperature: number | null;
  description: string;
  icon: string; // Icon code from OpenWeatherMap
  humidity: number | null;
  windSpeed: number | null;
  feelsLike: number | null;
  unit: 'metric' | 'imperial';
};

export type AdditionalTimezoneSetting = {
  id: string;
  offset: number;
  label: string;
};

export type NoteItem = {
  id: string;
  title: string;
  content: string;
};

// For Obsidian integration - Aligned with KIL NoteMeta
export interface NoteMeta {
  path: string;
  name: string;
  tags?: string[];
  content?: string;
  modified?: string;
  linkedEvents?: string[];
  source?: 'obsidian' | 'notion' | 'apple_notes'; // Source system
}


// Unified UI Event Model
export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  start: z.string(), // ISO 8601 string
  end: z.string(), // ISO 8601 string
  location: z.string().optional().nullable(),
  htmlLink: z.string().optional().nullable(),
  isAllDay: z.boolean(),
  calendarSource: z.enum(['google', 'proton', 'microsoft', 'notion', 'apple', 'custom']),
  color: z.string().optional(),
  calendarId: z.string(),
  attendees: z.array(z.string()).optional(),
  raw: z.any().optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export type MatchResult = {
  event: CalendarEvent;
  matchedNote?: NoteMeta;
  reason?: 'date' | 'keyword' | 'no match';
};

// For Notion Tasks
export const NotionTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().nullable(),
  tags: z.array(z.string()).optional(),
  raw: z.any().optional(),
});
export type NotionTask = z.infer<typeof NotionTaskSchema>;

// For Google Tasks
export const GoogleTaskListSchema = z.object({
  id: z.string(),
  title: z.string(),
  updated: z.string(),
});
export type GoogleTaskList = z.infer<typeof GoogleTaskListSchema>;

export const GoogleTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().optional(),
  status: z.enum(['needsAction', 'completed']),
  due: z.string().optional(),
  completed: z.string().optional(),
  updated: z.string(),
});
export type GoogleTask = z.infer<typeof GoogleTaskSchema>;

// For Microsoft OneNote
export const OneNoteNotebookSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  isDefault: z.boolean(),
  links: z.any(),
});
export type OneNoteNotebook = z.infer<typeof OneNoteNotebookSchema>;

export const OneNoteSectionSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  pagesUrl: z.string(),
});
export type OneNoteSection = z.infer<typeof OneNoteSectionSchema>;

export const OneNotePageSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentUrl: z.string(),
  links: z.any(),
});
export type OneNotePage = z.infer<typeof OneNotePageSchema>;

// For Google Docs
export const GoogleDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  webViewLink: z.string().url(),
});
export type GoogleDoc = z.infer<typeof GoogleDocSchema>;

// For Google Drive
export const GoogleDriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  webViewLink: z.string().url(),
  iconLink: z.string().url(),
});
export type GoogleDriveFile = z.infer<typeof GoogleDriveFileSchema>;


// For Gmail
export const GmailMessagePartSchema = z.object({
    name: z.string(),
    value: z.string(),
});
export const GmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()),
  snippet: z.string(),
  historyId: z.string(),
  internalDate: z.string(),
  payload: z.object({
    partId: z.string(),
    mimeType: z.string(),
    filename: z.string(),
    headers: z.array(GmailMessagePartSchema),
  }),
});
export type GmailMessage = z.infer<typeof GmailMessageSchema>;

// For GotchiQuest (formerly Habitica)
export const GotchiQuestTaskTypeEnum = z.enum(["habit", "daily", "todo", "reward"]);
export type GotchiQuestTaskType = z.infer<typeof GotchiQuestTaskTypeEnum>;

export const GotchiQuestTaskSchema = z.object({
  id: z.string(),
  type: GotchiQuestTaskTypeEnum,
  text: z.string(),
  notes: z.string().optional(),
  completed: z.boolean().optional(), // For daily/todo
  streak: z.number().optional(), // For daily
  cost: z.number().optional(), // For reward
});
export type GotchiQuestTask = z.infer<typeof GotchiQuestTaskSchema>;

export const GotchiQuestUserStatsSchema = z.object({
  level: z.number(),
  xp: z.number(),
  gold: z.number(),
  hp: z.number(),
});
export type GotchiQuestUserStats = z.infer<typeof GotchiQuestUserStatsSchema>;


export type GoogleAuthTokens = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
};

// Tokens for Microsoft Graph API
export type MicrosoftAuthTokens = {
  access_token: string;
  expires_in: number;
  refresh_token: string; // Always provided for offline_access
  scope: string;
  token_type: string;
};


// Zod schema for CalDAV credentials
export const CalDAVCredentialsSchema = z.object({
  username: z.string().describe('The user ID (e.g., email address).'),
  appPassword: z.string().describe('An app-specific password.'),
  caldavUrl: z.string().url().describe('The CalDAV server URL.'),
});
export type CalDAVCredentials = z.infer<typeof CalDAVCredentialsSchema>;

// Zod schema for a single CalDAV calendar
export const DavCalendarSchema = z.object({
  url: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  ctag: z.string().optional(),
  resourcetype: z.array(z.string()).optional(),
});
export type DavCalendar = z.infer<typeof DavCalendarSchema>;


export type StoredSettings = {
  folders: Folder[];
  background: BackgroundSettings;
  weatherCity: string;
  openWeatherApiKey: string;
  weatherUnit?: 'metric' | 'imperial';
  timezoneOffset?: number; // Offset from UTC in hours, e.g., -5 for EST, +1 for CET
  mainTimezoneDstActive?: boolean; // For manual DST adjustment of main timezone
  showDateTimeWidget?: boolean;
  showWeatherWidget?: boolean;
  additionalTimezones?: AdditionalTimezoneSetting[];
  showCalendarEvents?: boolean;
  layout?: 'standard' | 'wide';
  linkContainerBackgroundColor?: string; // Hex color
  linkContainerBackgroundOpacity?: number; // 0 to 1
  timeFormat?: '12h' | '24h';
  showSeconds?: boolean;
  notes?: NoteItem[];
  notesDefaultTitle?: string;
  
  // Integrations
  notionDatabaseId?: string;
  notionTaskDatabaseId?: string; // New setting for tasks
  showNotionTasksWidget?: boolean; // New setting for tasks widget
  
  obsidianVaultUrl?: string;
  obsidianAccessType?: 'url' | 'webdav' | 'local';
  obsidianWebdavUsername?: string;
  obsidianWebdavPassword?: string;
  showObsidianWidget?: boolean;
  
  // OAuth Connections
  googleCalendarConnected?: boolean;
  showGoogleTasksWidget?: boolean; // New setting for Google Tasks
  showGoogleDriveWidget?: boolean;
  microsoftCalendarConnected?: boolean;
  showOneNoteWidget?: boolean;
  showGoogleDocsWidget?: boolean; // New setting for Google Docs
  showGmailWidget?: boolean;

  // CalDAV Connections
  protonCalendarConnected?: boolean;
  protonUsername?: string;
  protonAppPassword?: string;
  protonCaldavUrl?: string;

  appleCalendarConnected?: boolean;
  appleId?: string;
  appleAppPassword?: string;
  appleCaldavUrl?: string;

  otherCaldavConnected?: boolean;
  otherCaldavUsername?: string;
  otherCaldavAppPassword?: string;
  otherCaldavUrl?: string;

  // New Google Sheets Settings
  showGoogleSheetsWidget?: boolean;
  googleSheetId?: string;
  googleSheetRange?: string;

  // Gamification Settings
  showHabiticaWidget?: boolean;
  habiticaUserId?: string; // No longer used, but kept for potential future re-integration
  habiticaApiToken?: string; // No longer used
  
  // New Dock Settings
  showWidgetDock?: boolean;
  widgetDockPosition?: 'left' | 'right';
};

// The interface for a calendar connector (KIL architecture)
export interface CalendarConnector {
  id: 'google' | 'proton' | 'notion' | 'microsoft' | 'apple' | 'custom';
  name: string;
  // Checks if the connector is enabled and has the necessary credentials/tokens
  isConfigured: (settings: StoredSettings, tokens?: any) => boolean;
  // Fetches events from the source
  sync: (settings: StoredSettings, tokens?: any) => Promise<CalendarEvent[]>;
  // Optional: Allows the connector to refresh its own tokens
  refreshToken?: (tokens: any) => Promise<any>;
}
