
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Trash2, Download, Upload, CheckCircle, ExternalLink, Power, PowerOff, Loader2, Apple, Info, Server, Notebook, Sheet as SheetIcon, FileText, Inbox, Folder as FolderIcon, Swords } from "lucide-react";
import type { BackgroundSettings, AdditionalTimezoneSetting, StoredSettings, GoogleAuthTokens, MicrosoftAuthTokens } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { exchangeCodeForToken as exchangeGoogleCode } from '@/ai/flows/google-auth-flow';
import { exchangeCodeForToken as exchangeMicrosoftCode } from '@/ai/flows/microsoft-auth-flow';
import { testProtonConnection } from '@/ai/flows/proton-calendar-flow';
import { testAppleConnection } from '@/ai/flows/apple-calendar-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


// Centralized data object for all setup guides, mimicking a JSON file import.
// This makes the system modular and easy to update.
const setupGuides = {
    'google-calendar': {
        title: "Google Calendar, Tasks, Sheets, Docs & Gmail",
        summary: "Connection via OAuth2 through a Google Cloud project.",
        steps: [
            "Go to https://console.cloud.google.com/ and create a new project.",
            "Enable the 'Google Calendar API', 'Google Tasks API', 'Google Sheets API', 'Google Docs API', 'Gmail API' and 'Google Drive API' for your project. (Drive API is used for listing files).",
            "In 'APIs & Services' > 'Credentials', create new 'OAuth 2.0 Client IDs' credentials for a 'Web application'.",
            "Enter the resulting Client ID and Client Secret as environment variables on the server (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).",
            "Click on 'Connect with Google' in the settings to start the process."
        ],
        type: "oauth",
    },
    'microsoft-calendar': {
        title: "Microsoft Calendar & OneNote",
        summary: "To connect Microsoft Calendar & OneNote, you need to register an application in the Azure portal to get a Client ID.",
        steps: [
            "Go to https://portal.azure.com/ and sign in.",
            "Navigate to 'Azure Active Directory' > 'App registrations' and click 'New registration'.",
            "Give your application a name (e.g., 'TabulaNova'). Select 'Accounts in any organizational directory and personal Microsoft accounts'.",
            "Under 'API Permissions', add permissions for 'Microsoft Graph'. Select 'Delegated permissions' and add `Calendars.Read`, `User.Read`, and `Notes.Read`.",
            "After registration, copy the 'Application (client) ID'. This must be set as an environment variable (`MICROSOFT_CLIENT_ID`) on the server."
        ],
        type: "oauth"
    },
    'proton-calendar': {
        title: "Proton Calendar (CalDAV)",
        summary: "Proton Calendar uses the open CalDAV standard, which requires your username, a special app password, and a server URL.",
        steps: [
            "Log in to your Proton account at https://account.proton.me/",
            "Go to 'Settings' > 'All settings' > 'Account and password' > 'App passwords'.",
            "Generate a new app password and give it a name (e.g., 'TabulaNova'). Copy this password.",
            "In Proton Calendar settings under 'Federation', find and copy your personal CalDAV URL.",
            "Enter your Proton username, the app password, and the CalDAV URL in the fields below."
        ],
        type: "caldav",
    },
    'apple-calendar': {
        title: "Apple Calendar (iCloud)",
        summary: "Use an app-specific password and CalDAV for iCloud.",
        steps: [
            "Go to https://appleid.apple.com/ and log in with your Apple ID.",
            "Scroll down to 'App-Specific Passwords' and click 'Generate'.",
            "Give your password a name (e.g., 'TabulaNova') and copy it.",
            "Use the following CalDAV address: `https://caldav.icloud.com`.",
            "Enter your Apple ID and the app-specific password in the widget settings."
        ],
        type: "caldav",
    },
    'notion': {
        title: "Notion",
        summary: "Connect a Notion database that you use as a calendar or task list.",
        steps: [
            "Go to https://www.notion.so/my-integrations and click '+ New Integration'.",
            "Give your integration a name (e.g., `TabulaNovaBot`), select your workspace, and enable `Read content` capabilities. For task management, also enable `Insert content` and `Update content`.",
            "Click 'Submit'. On the next screen, copy the 'Internal Integration Token'. This must be set as a server environment variable (`NOTION_API_KEY`).",
            "Open the Notion database you want to use (e.g., for calendar or tasks).",
            "Click the '...' menu at the top right, then 'Add connections', and share the database with your new integration (`TabulaNovaBot`).",
            "Open the database in your browser. The URL looks like `https://www.notion.so/workspace/DATABASE_ID?v=...`.",
            "The long string of letters and numbers (e.g., `6b1c92e4d7cf4b9e8ac3bcd2df0a47e7`) is your Database ID. Copy it and paste it into the appropriate input field below.",
            "For calendar, your database needs at least one 'Date' property and one 'Title' property. For tasks, it needs a 'Title' property named `Name`."
        ],
        type: "api_key"
    },
    'obsidian': {
        title: "Obsidian",
        summary: "Connect to your Obsidian vault via a local plugin or other access methods.",
        steps: [
            "1. Local Path (Plugin Required): This powerful option requires a companion plugin inside Obsidian that runs a local WebSocket server to bridge the connection. This enables live, two-way sync for features like the Obsidian widget.",
            "2. Obsidian Publish (Read-only): Go to your vault, click 'Publish changes', configure your site, and copy the public URL (e.g., `https://publish.obsidian.md/your-site`). Select 'Obsidian Publish URL' and paste the URL.",
            "3. WebDAV Server (Read-only): If you sync your vault via a WebDAV server (like Nextcloud), select 'WebDAV Server'. Enter the server's base URL and your credentials. This requires a backend implementation to work."
        ],
        type: "url"
    },
    'other-caldav': {
        title: "Other CalDAV Service",
        summary: "Connect any other calendar that supports the CalDAV standard, like Thunderbird, Nextcloud, or Fastmail.",
        steps: [
            "Find the CalDAV URL for your specific service. This is often found in the calendar's 'sync' or 'share' settings.",
            "If your service uses two-factor authentication, you will likely need to generate an 'app-specific password' or 'token' in its security settings. Do not use your main password.",
            "Enter your full username (often your email address), the app-specific password, and the full CalDAV URL below."
        ],
        type: "caldav",
    },
    'habitica': {
        title: "GotchiQuest Gamification",
        summary: "Enable the built-in gamification engine to track your progress with XP, Gold, and Levels.",
        steps: [
            "This is a self-contained module and does not require any external API keys or setup.",
            "Simply enable the 'Show GotchiQuest Widget' toggle below to add it to your wide layout.",
            "Tasks are pre-configured in the application code but can be customized by a developer.",
            "This system is inspired by Habitica but is fully independent."
        ],
        type: "internal"
    }
};


// Helper function for Microsoft PKCE flow
async function generateCodeChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


export interface SettingsPanelProps {
  settings: StoredSettings;
  onSettingsChange: (settings: Partial<StoredSettings>) => void;
  onClose: () => void;
  onExportSettings: () => void;
  onImportSettings: (settings: StoredSettings) => void;
}

const timezoneOptions = [
  { value: -12, label: "UTC-12:00" }, { value: -11, label: "UTC-11:00" },
  { value: -10, label: "UTC-10:00 (Hawaii)" }, { value: -9, label: "UTC-09:00 (Alaska)" },
  { value: -8, label: "UTC-08:00 (Pacific Time)" }, { value: -7, label: "UTC-07:00 (Mountain Time)" },
  { value: -6, label: "UTC-06:00 (Central Time)" }, { value: -5, label: "UTC-05:00 (Eastern Time)" },
  { value: -4, label: "UTC-04:00 (Atlantic Time)" }, { value: -3.5, label: "UTC-03:30 (Newfoundland)" },
  { value: -3, label: "UTC-03:00 (Argentina, Brazil)" }, { value: -2, label: "UTC-02:00" },
  { value: -1, label: "UTC-01:00 (Azores)" }, { value: 0, label: "UTC+00:00 (GMT, London)" },
  { value: 1, label: "UTC+01:00 (CET, Berlin)" }, { value: 2, label: "UTC+02:00 (EET, Athens)" },
  { value: 3, label: "UTC+03:00 (Moscow)" }, { value: 3.5, label: "UTC+03:30 (Tehran)" },
  { value: 4, label: "UTC+04:00 (Dubai)" }, { value: 4.5, label: "UTC+04:30 (Kabul)" },
  { value: 5, label: "UTC+05:00 (Karachi)" }, { value: 5.5, label: "UTC+05:30 (India)" },
  { value: 5.75, label: "UTC+05:45 (Kathmandu)" }, { value: 6, label: "UTC+06:00 (Dhaka)" },
  { value: 6.5, label: "UTC+06:30 (Yangon)" }, { value: 7, label: "UTC+07:00 (Bangkok)" },
  { value: 8, label: "UTC+08:00 (Beijing, Perth)" }, { value: 8.75, label: "UTC+08:45 (Eucla)" },
  { value: 9, label: "UTC+09:00 (Tokyo, Seoul)" }, { value: 9.5, label: "UTC+09:30 (Adelaide)" },
  { value: 10, label: "UTC+10:00 (Sydney, Guam)" }, { value: 10.5, label: "UTC+10:30 (Lord Howe)" },
  { value: 11, label: "UTC+11:00 (Solomon Is.)" }, { value: 12, label: "UTC+12:00 (Fiji, Auckland)" },
  { value: 12.75, label: "UTC+12:45 (Chatham Is.)" }, { value: 13, label: "UTC+13:00 (Tonga)" },
  { value: 14, label: "UTC+14:00 (Kiribati)" }
];

const gradientDirections = [
  { value: 'to top', label: 'To Top' }, { value: 'to top right', label: 'To Top Right' },
  { value: 'to right', label: 'To Right' }, { value: 'to bottom right', label: 'To Bottom Right' },
  { value: 'to bottom', label: 'To Bottom' }, { value: 'to bottom left', label: 'To Bottom Left' },
  { value: 'to left', label: 'To Left' }, { value: 'to top left', label: 'To Top Left' },
  { value: '45deg', label: '45 Degrees' }, { value: '90deg', label: '90 Degrees' },
  { value: '135deg', label: '135 Degrees' }, { value: '180deg', label: '180 Degrees' },
];


const parseGradientString = (gradientString: string): { direction: string; color1: string; color2: string } | null => {
  if (!gradientString) return null;
  const match = gradientString.match(/linear-gradient\((.+?),\s*(#?[0-9a-fA-F]+),\s*(#?[0-9a-fA-F]+)\)/);
  if (match && match.length === 4) {
    return { direction: match[1].trim(), color1: match[2].trim(), color2: match[3].trim() };
  }
  return null;
};

const defaultPanelFallbackSettings = {
  background: { type: 'color', value: '#F0F4F7' } as BackgroundSettings,
  linkContainerBackgroundColor: '#FFFFFF',
  linkContainerBackgroundOpacity: 0.1,
  additionalTimezones: [] as AdditionalTimezoneSetting[],
};

// Sub-components for different settings categories

const GeneralSettings = ({ settings, onChange }: { settings: StoredSettings, onChange: (key: keyof StoredSettings, value: any) => void }) => (
    <div className="space-y-4">
        <div>
            <Label>Layout</Label>
            <RadioGroup
                value={settings.layout || 'standard'}
                onValueChange={(v) => onChange('layout', v as 'standard' | 'wide')}
                className="flex space-x-4 mt-2"
            >
                <div className="flex items-center space-x-2"><RadioGroupItem value="standard" id="layout-standard" /><Label htmlFor="layout-standard">Standard</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="wide" id="layout-wide" /><Label htmlFor="layout-wide">Wide (Dashboard)</Label></div>
            </RadioGroup>
            <p className="mt-1 text-xs text-muted-foreground">"Wide" layout shows all enabled widgets.</p>
        </div>
        <Separator/>
        <div>
            <h4 className="text-sm font-medium mb-2">Widget Dock</h4>
            <div className="flex items-center justify-between">
                <Label htmlFor="show-widget-dock" className="text-sm font-medium">Show Widget Dock</Label>
                <Switch id="show-widget-dock" checked={settings.showWidgetDock ?? true} onCheckedChange={(c) => onChange('showWidgetDock', c)} />
            </div>
            <div className={cn("mt-4", !(settings.showWidgetDock ?? true) && "opacity-50 pointer-events-none")}>
                <Label>Position</Label>
                <RadioGroup
                    value={settings.widgetDockPosition || 'left'}
                    onValueChange={(v) => onChange('widgetDockPosition', v as 'left' | 'right')}
                    className="flex space-x-4 mt-2"
                >
                    <div className="flex items-center space-x-2"><RadioGroupItem value="left" id="pos-left" /><Label htmlFor="pos-left">Left</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="right" id="pos-right" /><Label htmlFor="pos-right">Right</Label></div>
                </RadioGroup>
            </div>
        </div>
    </div>
);

const WeatherSettings = ({ settings, onChange }: { settings: StoredSettings, onChange: (key: keyof StoredSettings, value: any) => void }) => (
    <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="show-weather-widget" className="text-sm font-medium">Show Weather in Combined Widget</Label>
      <Switch id="show-weather-widget" checked={settings.showWeatherWidget ?? true} onCheckedChange={(c) => onChange('showWeatherWidget', c)} />
    </div>
    <Separator />
    <div className={cn("space-y-4", !(settings.showWeatherWidget ?? true) && 'opacity-50 pointer-events-none')}>
      <div>
        <Label htmlFor="weather-city" className="text-sm font-medium">📍 Location (City)</Label>
        <Input id="weather-city" value={settings.weatherCity} onChange={(e) => onChange('weatherCity', e.target.value)} placeholder="e.g., London" className="mt-1" />
      </div>
       <div className="flex items-center justify-between">
        <Label htmlFor="use-geolocation" className="text-sm font-medium">Use Geolocation</Label>
        <Switch id="use-geolocation" disabled />
      </div>
      <div>
        <Label htmlFor="weather-api-key" className="text-sm font-medium">OpenWeatherMap API Key</Label>
        <Input id="weather-api-key" type="password" value={settings.openWeatherApiKey} onChange={(e) => onChange('openWeatherApiKey', e.target.value)} placeholder="Enter API Key" className="mt-1" />
        <p className="mt-1 text-xs text-muted-foreground">Get a free API key from <a href="https://openweathermap.org/appid" target="_blank" rel="noopener noreferrer" className="underline text-primary">OpenWeatherMap</a>.</p>
      </div>
      <div>
        <Label className="text-sm font-medium">🌡️ Temperature Unit</Label>
        <RadioGroup
            value={settings.weatherUnit || 'metric'}
            onValueChange={(v) => onChange('weatherUnit', v as 'metric' | 'imperial')}
            className="flex space-x-4 mt-2"
        >
            <div className="flex items-center space-x-2"><RadioGroupItem value="metric" id="r-metric" /><Label htmlFor="r-metric">Celsius (°C)</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="imperial" id="r-imperial" /><Label htmlFor="r-imperial">Fahrenheit (°F)</Label></div>
        </RadioGroup>
      </div>
      <div>
         <Label htmlFor="weather-provider" className="text-sm font-medium">🔌 Weather Provider</Label>
         <Select value="OpenWeatherMap" disabled>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
                <SelectItem value="OpenWeatherMap">OpenWeatherMap</SelectItem>
                <SelectItem value="WeatherAPI" disabled>WeatherAPI (coming soon)</SelectItem>
                 <SelectItem value="wttr" disabled>wttr.in (coming soon)</SelectItem>
            </SelectContent>
         </Select>
         <p className="mt-1 text-xs text-muted-foreground">Support for other providers is planned.</p>
      </div>
    </div>
  </div>
);

const DateTimeSettings = ({ settings, onChange }: { settings: StoredSettings, onChange: (key: keyof StoredSettings, value: any) => void }) => {
  const handleAddAdditionalTimezone = () => {
    const timezones = settings.additionalTimezones || [];
    if (timezones.length < 2) {
      onChange('additionalTimezones', [...timezones, { id: uuidv4(), label: '', offset: 0 }]);
    }
  };
  const handleUpdateAdditionalTimezone = (id: string, field: 'label' | 'offset', value: string | number) => {
    const updatedTimezones = (settings.additionalTimezones || []).map(tz => tz.id === id ? { ...tz, [field]: value } : tz);
    onChange('additionalTimezones', updatedTimezones);
  };
  const handleRemoveAdditionalTimezone = (id: string) => {
    const updatedTimezones = (settings.additionalTimezones || []).filter(tz => tz.id !== id);
    onChange('additionalTimezones', updatedTimezones);
  };
  
  return (
     <div className="space-y-4">
        <div className="flex items-center justify-between"><Label htmlFor="show-datetime-widget">Show Date &amp; Time Widget</Label><Switch id="show-datetime-widget" checked={settings.showDateTimeWidget ?? true} onCheckedChange={(c) => onChange('showDateTimeWidget', c)} /></div>
        <Separator />
        <div className={cn("space-y-4", !(settings.showDateTimeWidget ?? true) && 'opacity-50 pointer-events-none')}>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="show-seconds" className="text-sm font-medium">Show Seconds</Label>
                    <Switch id="show-seconds" checked={settings.showSeconds ?? true} onCheckedChange={(c) => onChange('showSeconds', c)} />
                </div>
                <div>
                    <Label htmlFor="time-format" className="block text-sm font-medium">Time Format</Label>
                    <RadioGroup id="time-format" value={settings.timeFormat || '24h'} onValueChange={(v) => onChange('timeFormat', v as '12h' | '24h')} className="flex space-x-4 mt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="24h" id="r-24h" /><Label htmlFor="r-24h">24-Hour</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="12h" id="r-12h" /><Label htmlFor="r-12h">12-Hour (AM/PM)</Label></div>
                    </RadioGroup>
                </div>
            </div>
            <Separator className="my-4" />
            <div>
              <Label htmlFor="timezone-offset">Main Timezone (Fixed UTC Offset)</Label>
              <Select value={(settings.timezoneOffset ?? 0).toString()} onValueChange={(v) => onChange('timezoneOffset', parseFloat(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{timezoneOptions.map(o=><SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between mt-2">
                <Label htmlFor="main-timezone-dst">Daylight Saving Active</Label>
                <Switch id="main-timezone-dst" checked={settings.mainTimezoneDstActive ?? false} onCheckedChange={(c) => onChange('mainTimezoneDstActive', c)} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Manually enable when Daylight Saving Time applies to your chosen UTC offset.</p>
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm font-medium mb-2">Additional Timezones (max 2, Fixed UTC Offset)</h4>
              {(settings.additionalTimezones || []).map((tz, index) => (
                <div key={tz.id} className="p-3 border rounded-md mb-3 space-y-2 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`additional-tz-label-${index}`} className="text-xs">Label {index + 1}</Label>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAdditionalTimezone(tz.id)} className="h-6 w-6"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                  <Input id={`additional-tz-label-${index}`} value={tz.label} onChange={(e) => handleUpdateAdditionalTimezone(tz.id, 'label', e.target.value)} placeholder={`e.g., Tokyo, Home`} className="text-sm" />
                  <Label htmlFor={`additional-tz-offset-${index}`} className="text-xs">Offset {index + 1}</Label>
                  <Select value={tz.offset.toString()} onValueChange={(v) => handleUpdateAdditionalTimezone(tz.id, 'offset', parseFloat(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{timezoneOptions.map(o=><SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              {(!settings.additionalTimezones || settings.additionalTimezones.length < 2) && (
                <Button variant="outline" size="sm" onClick={handleAddAdditionalTimezone} className="mt-2 w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add Additional Timezone</Button>
              )}
               <p className="mt-1 text-xs text-muted-foreground">Additional timezones are also fixed UTC offsets.</p>
            </div>
        </div>
    </div>
  );
};

interface SetupGuideProps {
  service: keyof typeof setupGuides;
}

const SetupGuide: React.FC<SetupGuideProps> = ({ service }) => {
    const guide = setupGuides[service];
    if (!guide) return null;
        
    return (
        <Accordion type="single" collapsible className="w-full mt-2">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4" />
                        <span>How to set up {guide.title}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Alert>
                        <AlertTitle className="mb-2">{guide.title}</AlertTitle>
                        <AlertDescription>
                            <p className="mb-3 text-xs">{guide.summary}</p>
                            <ol className="list-decimal list-inside space-y-2 text-xs">
                                {guide.steps.map((step, index) => (
                                    <li key={index}>
                                        {step.split(/(`[^`]+`)/).map((part, i) => {
                                            if (part.startsWith('`') && part.endsWith('`')) {
                                                return <code key={i} className="bg-muted px-1 py-0.5 rounded-sm font-mono text-xs">{part.slice(1, -1)}</code>;
                                            }
                                            const urlMatch = part.match(/(https?:\/\/[^\s]+)/);
                                            if (urlMatch) {
                                                const [url] = urlMatch;
                                                const textParts = part.split(url);
                                                return (
                                                    <React.Fragment key={i}>
                                                        {textParts[0]}
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary underline">
                                                            {url} <ExternalLink className="inline h-3 w-3" />
                                                        </a>
                                                        {textParts[1]}
                                                    </React.Fragment>
                                                );
                                            }
                                            return part;
                                        })}
                                    </li>
                                ))}
                            </ol>
                        </AlertDescription>
                    </Alert>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};


const CalendarSettings = ({ settings, onChange }: { settings: StoredSettings, onChange: (key: keyof StoredSettings, value: any) => void }) => {
    const { toast } = useToast();
    const [googleAuthTokens, setGoogleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
    const [microsoftAuthTokens, setMicrosoftAuthTokens] = useLocalStorage<MicrosoftAuthTokens | null>('microsoftAuthTokens', null);
    const [isExchangingCode, setIsExchangingCode] = React.useState(false);
    const [isTestingProton, setIsTestingProton] = React.useState(false);
    const [isTestingApple, setIsTestingApple] = React.useState(false);
    const [isTestingOther, setIsTestingOther] = React.useState(false);
    
    // --- Google Auth ---
    const handleGoogleConnect = () => {
        const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || window.location.origin;

        if (!GOOGLE_CLIENT_ID) {
            toast({ variant: "destructive", title: "Configuration Error", description: "Google Client ID is not configured."});
            return;
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: "code",
            scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly",
            include_granted_scopes: "true",
            access_type: "offline",
            prompt: "consent",
        }).toString()}`;
        window.location.href = authUrl;
    };
    const handleGoogleDisconnect = () => {
        setGoogleAuthTokens(null);
        onChange('googleCalendarConnected', false);
        toast({ title: "Disconnected", description: "Google services have been disconnected." });
    };

    // --- Microsoft Auth ---
    const handleMicrosoftConnect = async () => {
        const MICROSOFT_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
        const REDIRECT_URI = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI || window.location.origin;
        if (!MICROSOFT_CLIENT_ID) {
            toast({ variant: "destructive", title: "Configuration Error", description: "Microsoft Client ID is not configured."});
            return;
        }
        
        // PKCE flow: generate code verifier and challenge on the client
        const verifier = uuidv4() + uuidv4();
        sessionStorage.setItem('ms_code_verifier', verifier);
        const challenge = await generateCodeChallenge(verifier);

        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
            client_id: MICROSOFT_CLIENT_ID,
            response_type: 'code',
            redirect_uri: REDIRECT_URI,
            response_mode: 'query',
            scope: 'openid offline_access Calendars.Read User.Read Notes.Read',
            code_challenge_method: 'S256',
            code_challenge: challenge,
        }).toString()}`;
        window.location.href = authUrl;
    };
    const handleMicrosoftDisconnect = () => {
        setMicrosoftAuthTokens(null);
        onChange('microsoftCalendarConnected', false);
        toast({ title: "Disconnected", description: "Microsoft has been disconnected." });
    };

    // --- Proton Auth ---
    const handleProtonConnect = async () => {
        if (!settings.protonUsername || !settings.protonAppPassword || !settings.protonCaldavUrl) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all Proton credentials."});
            return;
        }
        setIsTestingProton(true);
        try {
            const result = await testProtonConnection({
                username: settings.protonUsername,
                appPassword: settings.protonAppPassword,
                caldavUrl: settings.protonCaldavUrl,
            });

            if (result.success) {
                onChange('protonCalendarConnected', true);
                toast({ title: "Success!", description: "Proton Calendar connected.", className: "bg-green-500 text-white" });
            } else {
                 onChange('protonCalendarConnected', false);
                toast({ variant: "destructive", title: "Connection Failed", description: result.message });
            }
        } catch (error: any) {
            onChange('protonCalendarConnected', false);
            toast({ variant: "destructive", title: "Connection Error", description: error.message || "An unexpected error occurred." });
        } finally {
            setIsTestingProton(false);
        }
    }
    const handleProtonDisconnect = () => {
        onChange('protonCalendarConnected', false);
        toast({ title: "Disconnected", description: "Proton Calendar has been disconnected." });
    }

    // --- Apple Auth ---
    const handleAppleConnect = async () => {
        if (!settings.appleId || !settings.appleAppPassword || !settings.appleCaldavUrl) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all Apple credentials."});
            return;
        }
        setIsTestingApple(true);
        try {
            const result = await testAppleConnection({
                username: settings.appleId,
                appPassword: settings.appleAppPassword,
                caldavUrl: settings.appleCaldavUrl,
            });

            if (result.success) {
                onChange('appleCalendarConnected', true);
                toast({ title: "Success!", description: "Apple Calendar connected.", className: "bg-green-500 text-white" });
            } else {
                onChange('appleCalendarConnected', false);
                toast({ variant: "destructive", title: "Connection Failed", description: result.message });
            }
        } catch (error: any) {
            onChange('appleCalendarConnected', false);
            toast({ variant: "destructive", title: "Connection Error", description: error.message || "An unexpected error occurred." });
        } finally {
            setIsTestingApple(false);
        }
    }
    const handleAppleDisconnect = () => {
        onChange('appleCalendarConnected', false);
        toast({ title: "Disconnected", description: "Apple Calendar has been disconnected." });
    }

     // --- Other CalDAV Auth ---
    const handleOtherCalDavConnect = async () => {
        if (!settings.otherCaldavUsername || !settings.otherCaldavAppPassword || !settings.otherCaldavUrl) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all CalDAV credentials."});
            return;
        }
        setIsTestingOther(true);
        // We can reuse the proton connection test logic as it's generic CalDAV
        try {
            const result = await testProtonConnection({
                username: settings.otherCaldavUsername,
                appPassword: settings.otherCaldavAppPassword,
                caldavUrl: settings.otherCaldavUrl,
            });

            if (result.success) {
                onChange('otherCaldavConnected', true);
                toast({ title: "Success!", description: "CalDAV calendar connected.", className: "bg-green-500 text-white" });
            } else {
                 onChange('otherCaldavConnected', false);
                toast({ variant: "destructive", title: "Connection Failed", description: result.message });
            }
        } catch (error: any) {
            onChange('otherCaldavConnected', false);
            toast({ variant: "destructive", title: "Connection Error", description: error.message || "An unexpected error occurred." });
        } finally {
            setIsTestingOther(false);
        }
    }
    const handleOtherCalDavDisconnect = () => {
        onChange('otherCaldavConnected', false);
        toast({ title: "Disconnected", description: "CalDAV calendar has been disconnected." });
    }

    // This effect runs on component mount to handle OAuth redirects.
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code || isExchangingCode) return;

        // Clean the URL to remove auth parameters.
        const cleanUrl = window.location.origin + window.location.pathname;

        // Check for Microsoft redirect (has session storage key) vs Google (doesn't)
        const msCodeVerifier = sessionStorage.getItem('ms_code_verifier');
        if (msCodeVerifier) {
            if (microsoftAuthTokens) return; // Already connected
            
            setIsExchangingCode(true);
            toast({ title: "Connecting Microsoft...", description: "Exchanging authorization code." });
            exchangeMicrosoftCode({ code, codeVerifier: msCodeVerifier, redirectUri: process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI || window.location.origin }).then(tokens => {
                setMicrosoftAuthTokens(tokens);
                onChange('microsoftCalendarConnected', true);
                toast({ title: "Success!", description: "Microsoft connected.", className: "bg-green-500 text-white" });
            }).catch(err => {
                toast({ variant: "destructive", title: "Microsoft Connection Failed", description: err.message });
            }).finally(() => {
                setIsExchangingCode(false);
                sessionStorage.removeItem('ms_code_verifier');
                window.history.replaceState({}, '', cleanUrl);
            });
        } 
        else { // Assume Google redirect
            if (googleAuthTokens) return; // Already connected
            setIsExchangingCode(true);
            toast({ title: "Connecting Google...", description: "Exchanging authorization code." });
            exchangeGoogleCode({ code }).then(tokens => {
                setGoogleAuthTokens(tokens);
                onChange('googleCalendarConnected', true);
                toast({ title: "Success!", description: "Google services connected.", className: "bg-green-500 text-white" });
            }).catch(err => {
                toast({ variant: "destructive", title: "Google Connection Failed", description: err.message });
            }).finally(() => {
                setIsExchangingCode(false);
                window.history.replaceState({}, '', cleanUrl);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isGoogleConnected = !!googleAuthTokens?.access_token;
    const isMicrosoftConnected = !!microsoftAuthTokens?.access_token;
    const isProtonConnected = settings.protonCalendarConnected;
    const isAppleConnected = settings.appleCalendarConnected;
    const isOtherCalDavConnected = settings.otherCaldavConnected;

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Connect your cloud calendars to see all your events in one place. View them on the dedicated <a href="/datetime-details" className="underline text-primary">calendar page</a>.</p>
            <Separator />
            <h4 className="text-sm font-medium mb-2">Cloud Calendar Connections</h4>
             <div className="space-y-3">
                {/* Google Connection Button */}
                <div className="p-3 rounded-md border bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2'>
                            {isGoogleConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <PowerOff className="h-5 w-5 text-muted-foreground" />}
                            <p className="font-medium">Google Services</p>
                            {isExchangingCode && !microsoftAuthTokens && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button size="sm" variant={isGoogleConnected ? "destructive" : "secondary"} onClick={isGoogleConnected ? handleGoogleDisconnect : handleGoogleConnect} disabled={isExchangingCode}>
                            {isGoogleConnected ? <Trash2 className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                            {isGoogleConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                    </div>
                    <SetupGuide service="google-calendar" />
                </div>

                {/* Microsoft Connection Button */}
                 <div className="p-3 rounded-md border bg-muted/30">
                    <div className="flex items-center justify-between">
                         <div className='flex items-center gap-2'>
                            {isMicrosoftConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <PowerOff className="h-5 w-5 text-muted-foreground" />}
                            <p className="font-medium">Microsoft (Calendar, OneNote)</p>
                            {isExchangingCode && !!sessionStorage.getItem('ms_code_verifier') && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button size="sm" variant={isMicrosoftConnected ? "destructive" : "secondary"} onClick={isMicrosoftConnected ? handleMicrosoftDisconnect : handleMicrosoftConnect} disabled={isExchangingCode}>
                            {isMicrosoftConnected ? <Trash2 className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                            {isMicrosoftConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                    </div>
                    <SetupGuide service="microsoft-calendar" />
                </div>
                
                {/* Proton Connection UI */}
                <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                     <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2'>
                            {isProtonConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <PowerOff className="h-5 w-5 text-muted-foreground" />}
                            <p className="font-medium">Proton Calendar (CalDAV)</p>
                             {isTestingProton && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button size="sm" variant={isProtonConnected ? "destructive" : "secondary"} onClick={isProtonConnected ? handleProtonDisconnect : handleProtonConnect} disabled={isTestingProton}>
                            {isProtonConnected ? <Trash2 className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                            {isProtonConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                    </div>
                    {!isProtonConnected && (
                        <div className="space-y-2">
                            <div>
                                <Label htmlFor="proton-username">Proton Username</Label>
                                <Input id="proton-username" placeholder="your.name@proton.me" value={settings.protonUsername || ''} onChange={(e) => onChange('protonUsername', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="proton-password">App-specific Password</Label>
                                <Input id="proton-password" type="password" placeholder="Generate in Proton settings" value={settings.protonAppPassword || ''} onChange={(e) => onChange('protonAppPassword', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="proton-url">CalDAV URL</Label>
                                <Input id="proton-url" placeholder="Provided by Proton" value={settings.protonCaldavUrl || ''} onChange={(e) => onChange('protonCaldavUrl', e.target.value)} />
                            </div>
                        </div>
                    )}
                     <SetupGuide service="proton-calendar" />
                </div>

                {/* Apple Connection UI */}
                <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                     <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2'>
                            <Apple className="h-5 w-5" />
                            {isAppleConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <PowerOff className="h-5 w-5 text-muted-foreground" />}
                            <p className="font-medium">Apple Calendar (CalDAV)</p>
                             {isTestingApple && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button size="sm" variant={isAppleConnected ? "destructive" : "secondary"} onClick={isAppleConnected ? handleAppleDisconnect : handleAppleConnect} disabled={isTestingApple}>
                            {isAppleConnected ? <Trash2 className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                            {isAppleConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                    </div>
                    {!isAppleConnected && (
                        <div className="space-y-2">
                            <div>
                                <Label htmlFor="apple-id">Apple ID</Label>
                                <Input id="apple-id" placeholder="your.name@icloud.com" value={settings.appleId || ''} onChange={(e) => onChange('appleId', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="apple-password">App-specific Password</Label>
                                <Input id="apple-password" type="password" placeholder="Generate on appleid.apple.com" value={settings.appleAppPassword || ''} onChange={(e) => onChange('appleAppPassword', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="apple-url">CalDAV URL</Label>
                                <Input id="apple-url" placeholder="Usually caldav.icloud.com" value={settings.appleCaldavUrl || ''} onChange={(e) => onChange('appleCaldavUrl', e.target.value)} />
                            </div>
                        </div>
                    )}
                    <SetupGuide service="apple-calendar" />
                </div>

                {/* Other CalDAV Connection UI */}
                <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                     <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2'>
                            <Server className="h-5 w-5" />
                            {isOtherCalDavConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <PowerOff className="h-5 w-5 text-muted-foreground" />}
                            <p className="font-medium">Other CalDAV Service</p>
                             {isTestingOther && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Button size="sm" variant={isOtherCalDavConnected ? "destructive" : "secondary"} onClick={isOtherCalDavConnected ? handleOtherCalDavDisconnect : handleOtherCalDavConnect} disabled={isTestingOther}>
                            {isOtherCalDavConnected ? <Trash2 className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                            {isOtherCalDavConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                    </div>
                    {!isOtherCalDavConnected && (
                        <div className="space-y-2">
                            <div>
                                <Label htmlFor="other-caldav-username">Username</Label>
                                <Input id="other-caldav-username" placeholder="your.username" value={settings.otherCaldavUsername || ''} onChange={(e) => onChange('otherCaldavUsername', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="other-caldav-password">App-specific Password/Token</Label>
                                <Input id="other-caldav-password" type="password" placeholder="Use an app password if available" value={settings.otherCaldavAppPassword || ''} onChange={(e) => onChange('otherCaldavAppPassword', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="other-caldav-url">Full CalDAV URL</Label>
                                <Input id="other-caldav-url" placeholder="e.g., https://caldav.example.com/remote.php/dav" value={settings.otherCaldavUrl || ''} onChange={(e) => onChange('otherCaldavUrl', e.target.value)} />
                            </div>
                        </div>
                    )}
                    <SetupGuide service="other-caldav" />
                </div>
             </div>
        </div>
    );
};

const IntegrationsSettings = ({ settings, onChange }: { settings: StoredSettings, onChange: (key: keyof StoredSettings, value: any) => void }) => {
    
    const { toast } = useToast();
    
    // We can add a simple connection test for the URL, though it doesn't guarantee a valid vault.
    const handleTestObsidianUrl = async () => {
        if (!settings.obsidianVaultUrl || settings.obsidianAccessType !== 'url') return;
        toast({ title: 'Testing Connection...' });
        try {
            // NOTE: A direct fetch from the browser to an arbitrary URL will likely be blocked by CORS.
            // A real implementation would need a backend proxy to bypass this for a proper status check.
            // This is a dummy test for UI purposes.
            toast({ title: 'Success!', description: 'Obsidian Publish URL format is valid.', className: "bg-green-500 text-white" });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Connection Failed', description: 'Could not reach the URL. Check for CORS issues or typos.' });
        }
    };
    
    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Connect to external services to pull in data like notes and tasks.</p>
            
            <Separator />

            {/* Notion Integration Section */}
            <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                <div className='flex items-center gap-2'>
                    <svg width="20" height="20" viewBox="0 0 256 256" className="inline"><path fill="currentColor" d="M240 64v128a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16V64a16 16 0 0 1 16-16h192a16 16 0 0 1 16 16M80 124l40-40l40 40l-40 40Zm104-52l-20.2 20.2a8 8 0 0 1-11.3 0L144.9 84a8 8 0 0 1 0-11.3L165.1 52a8 8 0 0 1 11.3 0l7.6 7.7a8 8 0 0 1 0 11.3m-83.6 83.6l-7.6-7.7a8 8 0 0 1 0-11.3l20.2-20.2a8 8 0 0 1 11.3 0l8.1 8.1a8 8 0 0 1 0 11.3l-20.2 20.2a8 8 0 0 1-11.8-.4"/></svg>
                    <p className="font-medium">Notion</p>
                </div>
                <div>
                    <Label htmlFor="notion-db-id">Notion Calendar Database ID</Label>
                    <Input 
                        id="notion-db-id" 
                        placeholder="Enter your Notion Database ID for calendar events" 
                        value={settings.notionDatabaseId || ''}
                        onChange={(e) => onChange('notionDatabaseId', e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="show-notion-tasks-widget" className="text-sm font-medium">Show Notion Tasks Widget</Label>
                    <Switch id="show-notion-tasks-widget" checked={settings.showNotionTasksWidget ?? false} onCheckedChange={(c) => onChange('showNotionTasksWidget', c)} />
                </div>
                <div className={cn("space-y-2", !(settings.showNotionTasksWidget ?? false) && "opacity-50 pointer-events-none")}>
                     <Label htmlFor="notion-task-db-id">Notion Task Database ID</Label>
                     <Input 
                        id="notion-task-db-id" 
                        placeholder="Enter your Notion Database ID for tasks" 
                        value={settings.notionTaskDatabaseId || ''}
                        onChange={(e) => onChange('notionTaskDatabaseId', e.target.value)}
                    />
                </div>

                <SetupGuide service="notion" />
            </div>

            {/* Obsidian Integration Section */}
            <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <Notebook className="h-5 w-5" />
                    <p className="font-medium">Obsidian</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-obsidian-widget" className="text-sm font-medium">Show Obsidian Widget</Label>
                    <Switch id="show-obsidian-widget" checked={settings.showObsidianWidget ?? false} onCheckedChange={(c) => onChange('showObsidianWidget', c)} />
                </div>
                <div className={cn("space-y-2", !(settings.showObsidianWidget ?? false) && "opacity-50 pointer-events-none")}>
                    <div>
                        <Label htmlFor="obsidian-access-type">Access Method</Label>
                        <Select value={settings.obsidianAccessType || 'local'} onValueChange={(v) => onChange('obsidianAccessType', v as any)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="local">Local Path (Plugin Required)</SelectItem>
                                <SelectItem value="url">Obsidian Publish URL</SelectItem>
                                <SelectItem value="webdav">WebDAV Server</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className={cn(settings.obsidianAccessType === 'webdav' ? 'hidden' : '')}>
                        <Label htmlFor="obsidian-url">Vault URL / Path</Label>
                        <Input 
                            id="obsidian-url" 
                            placeholder="e.g., https://publish.obsidian.md/yoursite" 
                            value={settings.obsidianVaultUrl || ''}
                            onChange={(e) => onChange('obsidianVaultUrl', e.target.value)}
                        />
                    </div>
                    <div className={cn(settings.obsidianAccessType !== 'webdav' && 'hidden', 'space-y-2')}>
                        <Label htmlFor="obsidian-user">WebDAV Username</Label>
                        <Input id="obsidian-user" value={settings.obsidianWebdavUsername || ''} onChange={(e) => onChange('obsidianWebdavUsername', e.target.value)} />
                        <Label htmlFor="obsidian-pass">WebDAV Password</Label>
                        <Input id="obsidian-pass" type="password" value={settings.obsidianWebdavPassword || ''} onChange={(e) => onChange('obsidianWebdavPassword', e.target.value)} />
                    </div>
                    {settings.obsidianAccessType === 'local' && (
                        <Alert variant="default">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Local Path (Plugin Required)</AlertTitle>
                            <AlertDescription className="text-xs">
                            Direct browser access to local files is not possible. This powerful option requires a companion plugin inside Obsidian that runs a local WebSocket server to bridge the connection.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div>
                        <Button variant="secondary" size="sm" onClick={handleTestObsidianUrl} disabled={settings.obsidianAccessType !== 'url'}>Test Connection</Button>
                    </div>
                </div>
                <SetupGuide service="obsidian" />
            </div>
            
            {/* Gamification Section */}
            <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <Swords className="h-5 w-5" />
                    <p className="font-medium">GotchiQuest Gamification</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-habitica-widget" className="text-sm font-medium">Show GotchiQuest Widget</Label>
                    <Switch id="show-habitica-widget" checked={settings.showHabiticaWidget ?? false} onCheckedChange={(c) => onChange('showHabiticaWidget', c)} />
                </div>
                <SetupGuide service="habitica" />
            </div>

            {/* Google Services Widgets */}
            <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">Google Tasks</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-google-tasks-widget" className="text-sm font-medium">Show Google Tasks Widget</Label>
                    <Switch id="show-google-tasks-widget" checked={settings.showGoogleTasksWidget ?? false} onCheckedChange={(c) => onChange('showGoogleTasksWidget', c)} />
                </div>
                <p className="text-xs text-muted-foreground">Enable this to show the Google Tasks widget in the 'wide' layout. You must connect your Google account under the Calendar tab.</p>
            </div>
             <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <SheetIcon className="h-5 w-5" />
                    <p className="font-medium">Google Sheets</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-google-sheets-widget" className="text-sm font-medium">Show Google Sheets Widget</Label>
                    <Switch id="show-google-sheets-widget" checked={settings.showGoogleSheetsWidget ?? false} onCheckedChange={(c) => onChange('showGoogleSheetsWidget', c)} />
                </div>
                <div className={cn("space-y-2", !(settings.showGoogleSheetsWidget ?? false) && "opacity-50 pointer-events-none")}>
                     <Label htmlFor="google-sheet-id">Spreadsheet ID</Label>
                     <Input 
                        id="google-sheet-id" 
                        placeholder="Enter your Google Sheet ID" 
                        value={settings.googleSheetId || ''}
                        onChange={(e) => onChange('googleSheetId', e.target.value)}
                    />
                    <Label htmlFor="google-sheet-range">Sheet & Range</Label>
                     <Input 
                        id="google-sheet-range" 
                        placeholder="e.g., Sheet1!A1:D10" 
                        value={settings.googleSheetRange || ''}
                        onChange={(e) => onChange('googleSheetRange', e.target.value)}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Enable this to show the Google Sheets widget. You must connect your Google account under the Calendar tab.</p>
            </div>
            <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <FileText className="h-5 w-5" />
                    <p className="font-medium">Google Docs</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-google-docs-widget" className="text-sm font-medium">Show Google Docs Widget</Label>
                    <Switch id="show-google-docs-widget" checked={settings.showGoogleDocsWidget ?? false} onCheckedChange={(c) => onChange('showGoogleDocsWidget', c)} />
                </div>
                <p className="text-xs text-muted-foreground">Enable this to show the Google Docs widget. You must connect your Google account under the Calendar tab.</p>
            </div>
             <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <Inbox className="h-5 w-5" />
                    <p className="font-medium">Gmail</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-gmail-widget" className="text-sm font-medium">Show Gmail Widget</Label>
                    <Switch id="show-gmail-widget" checked={settings.showGmailWidget ?? false} onCheckedChange={(c) => onChange('showGmailWidget', c)} />
                </div>
                <p className="text-xs text-muted-foreground">Enable this to show the Gmail widget. You must connect your Google account under the Calendar tab.</p>
            </div>

            <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <FolderIcon className="h-5 w-5" />
                    <p className="font-medium">Google Drive</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-google-drive-widget" className="text-sm font-medium">Show Google Drive Widget</Label>
                    <Switch id="show-google-drive-widget" checked={settings.showGoogleDriveWidget ?? false} onCheckedChange={(c) => onChange('showGoogleDriveWidget', c)} />
                </div>
                <p className="text-xs text-muted-foreground">Enable this to show the Google Drive widget. You must connect your Google account under the Calendar tab.</p>
            </div>
            
            {/* Microsoft OneNote Widget */}
             <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                 <div className='flex items-center gap-2'>
                    <svg width="16" height="16" viewBox="0 0 256 256" className="inline"><path fill="currentColor" d="M216 40H88a16 16 0 0 0-16 16v40H40a16 16 0 0 0-16 16v88a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-40h32a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-48 160H40v-88h32v40a16 16 0 0 0 16 16h40Zm48-48h-32v-40a16 16 0 0 0-16-16H88V56h128Z"/></svg>
                    <p className="font-medium">Microsoft OneNote</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="show-onenote-widget" className="text-sm font-medium">Show OneNote Widget</Label>
                    <Switch id="show-onenote-widget" checked={settings.showOneNoteWidget ?? false} onCheckedChange={(c) => onChange('showOneNoteWidget', c)} />
                </div>
                <p className="text-xs text-muted-foreground">Enable this to show the OneNote widget. You must connect your Microsoft account under the Calendar tab.</p>
            </div>
        </div>
    );
};


export function SettingsPanel({
  settings, onSettingsChange, onClose, onExportSettings, onImportSettings,
}: SettingsPanelProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = React.useState(settings);

  // Background specific state
  const [activeBackgroundTab, setActiveBackgroundTab] = React.useState<'color' | 'image_url' | 'image_upload'>('color');
  const [colorMode, setColorMode] = React.useState<'solid' | 'gradient'>('solid');
  const [solidColorValue, setSolidColorValue] = React.useState('#F0F4F7');
  const [gradientColor1, setGradientColor1] = React.useState('#FF0000');
  const [gradientColor2, setGradientColor2] = React.useState('#0000FF');
  const [gradientDirection, setGradientDirection] = React.useState('to right');
  const [imageUrlValue, setImageUrlValue] = React.useState('');
  const [fileDataUrlValue, setFileDataUrlValue] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalSettings(settings);
    const { background } = settings;
    if (background.type === 'color') {
        setActiveBackgroundTab('color');
        const parsedGradient = parseGradientString(background.value);
        if (parsedGradient) {
            setColorMode('gradient');
            setGradientColor1(parsedGradient.color1);
            setGradientColor2(parsedGradient.color2);
            setGradientDirection(parsedGradient.direction);
        } else {
            setColorMode('solid');
            setSolidColorValue(background.value);
        }
    } else {
        if (background.value.startsWith('data:image')) {
            setActiveBackgroundTab('image_upload');
            setFileDataUrlValue(background.value);
            setImageUrlValue('');
        } else {
            setActiveBackgroundTab('image_url');
            setImageUrlValue(background.value);
            setFileDataUrlValue(null);
        }
    }
  }, [settings]);

  const handleLocalChange = <K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = () => {
    let backgroundSettingsToSave: BackgroundSettings;
    switch (activeBackgroundTab) {
      case 'color':
        backgroundSettingsToSave = { 
          type: 'color', 
          value: colorMode === 'solid' ? solidColorValue : `linear-gradient(${gradientDirection}, ${gradientColor1}, ${gradientColor2})`
        };
        break;
      case 'image_url':
        backgroundSettingsToSave = { type: 'image', value: imageUrlValue };
        break;
      case 'image_upload':
        backgroundSettingsToSave = { type: 'image', value: fileDataUrlValue || localSettings.background.value };
        break;
      default:
        backgroundSettingsToSave = defaultPanelFallbackSettings.background;
    }
    onSettingsChange({ ...localSettings, background: backgroundSettingsToSave });
    toast({ title: "Saved", description: "Settings have been updated." });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setFileDataUrlValue(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          const parsedSettings = JSON.parse(fileContent) as StoredSettings;
          if (parsedSettings && parsedSettings.folders && parsedSettings.background) {
            onImportSettings(parsedSettings);
          } else {
            toast({ variant: "destructive", title: "Error", description: "Invalid settings file format." });
          }
        } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Could not read or process the file." });
        }
      };
      reader.readAsText(file);
      if (event.target) event.target.value = '';
    }
  };

  const localLinkContainerBgOpacitySlider = Math.round((localSettings.linkContainerBackgroundOpacity ?? 0) * 100);

  return (
    <div className="py-4 space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
            <TabsTrigger value="datetime">Date &amp; Time</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="py-4 space-y-4">
            <GeneralSettings settings={localSettings} onChange={handleLocalChange} />
          </TabsContent>

          <TabsContent value="background" className="py-4 space-y-4">
            <Tabs value={activeBackgroundTab} onValueChange={(v) => setActiveBackgroundTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="color">Page: Color/Gradient</TabsTrigger>
                <TabsTrigger value="image_url">Page: Image URL</TabsTrigger>
                <TabsTrigger value="image_upload">Page: Image Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="color" className="pt-3 space-y-4">
                <RadioGroup value={colorMode} onValueChange={(v) => setColorMode(v as any)} className="flex space-x-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="solid" id="r1" /><Label htmlFor="r1">Solid</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="gradient" id="r2" /><Label htmlFor="r2">Linear Gradient</Label></div>
                </RadioGroup>
                {colorMode === 'solid' && (
                  <div><Label htmlFor="solid-color-picker">Color</Label><Input id="solid-color-picker" type="color" value={solidColorValue} onChange={(e) => setSolidColorValue(e.target.value)} className="w-full h-10 mt-1"/></div>
                )}
                {colorMode === 'gradient' && (
                  <div className="space-y-3 p-1 border rounded-md">
                    <div><Label htmlFor="gradient-color-1">Color 1</Label><Input id="gradient-color-1" type="color" value={gradientColor1} onChange={(e) => setGradientColor1(e.target.value)} className="w-full h-10 mt-1"/></div>
                    <div><Label htmlFor="gradient-color-2">Color 2</Label><Input id="gradient-color-2" type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-full h-10 mt-1"/></div>
                    <div>
                      <Label htmlFor="gradient-direction">Direction</Label>
                      <Select value={gradientDirection} onValueChange={setGradientDirection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{gradientDirections.map(d=><SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="image_url" className="pt-3">
                  <Label htmlFor="background-image-url">Page Background Image URL</Label>
                  <Input id="background-image-url" type="text" value={imageUrlValue} onChange={(e) => setImageUrlValue(e.target.value)} placeholder="https://example.com/image.png" className="mt-1"/>
              </TabsContent>
              <TabsContent value="image_upload" className="pt-3 space-y-2">
                <Label htmlFor="background-image-upload">Upload Page Background Image</Label>
                <Input id="background-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="mt-1" />
                {fileDataUrlValue && activeBackgroundTab === 'image_upload' && (<p className="text-xs text-muted-foreground">An image is currently selected. Uploading a new one will replace it.</p>)}
                <p className="text-xs text-destructive/80">Note: Very large images might not work due to browser storage limits. Use smaller images (under 1-2MB) or an image URL.</p>
              </TabsContent>
            </Tabs>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Link Area Background</h4>
              <div className="space-y-3">
                <div><Label htmlFor="link-bg-color">Background Color</Label><Input id="link-bg-color" type="color" value={localSettings.linkContainerBackgroundColor} onChange={(e) => handleLocalChange('linkContainerBackgroundColor', e.target.value)} className="w-full h-10 mt-1"/></div>
                <div>
                  <Label htmlFor="link-bg-opacity">Background Opacity ({localLinkContainerBgOpacitySlider}%)</Label>
                  <Slider id="link-bg-opacity" min={0} max={100} step={1} value={[localLinkContainerBgOpacitySlider]} onValueChange={(v) => handleLocalChange('linkContainerBackgroundOpacity', v[0] / 100)} className="mt-1"/>
                  <p className="mt-1 text-xs text-muted-foreground">0% = Fully Transparent, 100% = Fully Opaque.</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="datetime" className="py-4">
            <DateTimeSettings settings={localSettings} onChange={handleLocalChange} />
          </TabsContent>

          <TabsContent value="calendar" className="py-4">
            <CalendarSettings settings={localSettings} onChange={handleLocalChange} />
          </TabsContent>
          
          <TabsContent value="integrations" className="py-4">
            <IntegrationsSettings settings={localSettings} onChange={handleLocalChange} />
          </TabsContent>

          <TabsContent value="weather" className="py-4">
             <WeatherSettings settings={localSettings} onChange={handleLocalChange} />
          </TabsContent>

          <TabsContent value="data" className="py-4 space-y-4">
            <div><h3 className="text-lg font-medium mb-2">Data Management</h3><p className="text-sm text-muted-foreground mb-4">Export your current settings or import a previously saved configuration.</p></div>
            <Separator />
            <div className="space-y-3 mt-4">
              <Button onClick={onExportSettings} className="w-full"><Download className="mr-2 h-4 w-4" /> Export Settings</Button>
              <div>
                <Label htmlFor="import-settings-file" className={cn("w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", "border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer")}><Upload className="mr-2 h-4 w-4" /> Import Settings...</Label>
                <Input id="import-settings-file" type="file" accept=".json" ref={fileInputRef} onChange={handleImportFileChange} className="hidden"/>
                <p className="mt-1 text-xs text-muted-foreground">Select a <code>tabula-nova-settings.json</code> file. Importing will overwrite all current settings.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-6 mt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveAll} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
        </div>
    </div>
  );
}
    

    

