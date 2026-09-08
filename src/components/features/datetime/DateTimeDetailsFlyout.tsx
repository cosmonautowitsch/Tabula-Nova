
// src/components/features/datetime/DateTimeDetailsFlyout.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlarmClock, Cog, Calendar as CalendarIcon, Loader2, AlertTriangle, Briefcase, ExternalLink, ShieldCheck, Apple, Server, Notebook, Link2, Trash2, PlusCircle } from 'lucide-react';
import { syncAllCalendars } from '@/ai/flows/calendar-sync-flow';
import { createGoogleEvent, deleteGoogleEvent } from '@/ai/flows/google-calendar-flow';
import useLocalStorage from '@/hooks/useLocalStorage';
import { StoredSettings, CalendarEvent, GoogleAuthTokens, MicrosoftAuthTokens, NoteMeta, MatchResult } from '@/types';
import { format, parseISO, isSameDay, startOfDay, addHours } from 'date-fns';
import Image from 'next/image';
import { VaultBridgeClient } from '@/lib/obsidian';
import { ObsidianCalendarLinker } from '@/lib/calendar-linker';
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';

type GroupedEventsByDay = {
  [dateISO: string]: MatchResult[];
};

function groupEventsByDay(events: MatchResult[]): GroupedEventsByDay {
  return events.reduce((acc, eventMatch) => {
    if (!eventMatch.event.start) return acc;
    const startDate = typeof eventMatch.event.start === 'string' ? parseISO(eventMatch.event.start) : eventMatch.event.start;
    const dateKey = format(startOfDay(startDate), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(eventMatch);
    return acc;
  }, {} as GroupedEventsByDay);
}

const UnifiedEventList = ({ 
    events, 
    isLoading, 
    error,
    onLinkNote,
    isLinkingNoteId,
    onDeleteEvent,
    isDeletingEventId
}: { 
    events: MatchResult[], 
    isLoading: boolean, 
    error: string | null,
    onLinkNote: (event: CalendarEvent) => void,
    isLinkingNoteId: string | null,
    onDeleteEvent: (event: CalendarEvent) => void,
    isDeletingEventId: string | null
}) => {
    
    const groupedEvents = useMemo(() => groupEventsByDay(events), [events]);
    const sortedDateKeys = useMemo(() => Object.keys(groupedEvents).sort(), [groupedEvents]);

    const getProviderIcon = (provider: CalendarEvent['calendarSource']) => {
        switch(provider) {
            case 'notion':
                return <Briefcase className="h-4 w-4 text-muted-foreground" title="Notion Event" />;
            case 'google':
                return <Image src="/google-calendar-icon.png" alt="Google Calendar" width={16} height={16} />;
            case 'proton':
                 return <ShieldCheck className="h-4 w-4 text-blue-500" title="Proton Calendar Event" />;
            case 'microsoft':
                return <Image src="/microsoft-icon.png" alt="Microsoft Calendar" width={16} height={16} />;
            case 'apple':
                return <Apple className="h-4 w-4" title="Apple Calendar Event" />;
            case 'custom':
                 return <Server className="h-4 w-4 text-gray-500" title="Custom CalDAV Event" />;
            default:
                return null;
        }
    }

    if (isLoading) {
        return <div className="flex items-center justify-center space-x-2"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading all calendar events...</span></div>;
    }

    if (error) {
        return <div className="text-destructive flex items-start space-x-2"><AlertTriangle className="h-5 w-5 mt-0.5" /><div><p className="font-semibold">Error loading calendar events</p><p className="text-xs">{error}</p></div></div>;
    }

    if (events.length === 0 && !isLoading) {
        return <p className="text-sm text-muted-foreground">No upcoming events found in any connected calendars, or no calendars are connected. Go to settings to connect a calendar.</p>;
    }


    return (
        <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
            {sortedDateKeys.map(dateKey => {
                const dayEventsSorted = [...groupedEvents[dateKey]].sort((a, b) => {
                    if (a.event.isAllDay && !b.event.isAllDay) return -1;
                    if (!a.event.isAllDay && b.event.isAllDay) return 1;

                    const aDate = typeof a.event.start === 'string' ? parseISO(a.event.start) : a.event.start;
                    const bDate = typeof b.event.start === 'string' ? parseISO(b.event.start) : b.event.start;
                    return aDate.getTime() - bDate.getTime();
                });

                return (
                    <div key={dateKey}>
                        <h3 className="font-semibold text-md mb-2 sticky top-0 bg-card py-1">
                            {format(parseISO(dateKey), 'EEEE, MMMM d')}
                        </h3>
                        <div className="space-y-3">
                            {dayEventsSorted.map(({ event, matchedNote }) => {
                                return (
                                    <div key={event.id} className="flex items-start space-x-3 pl-2 border-l-2 group" style={{ borderColor: event.color || 'var(--border)' }}>
                                        <div className="w-28 text-sm font-medium shrink-0">
                                            {event.isAllDay ? 'All Day' : `${format(parseISO(event.start), 'HH:mm')}`}
                                        </div>
                                        <div className="w-full">
                                            <p className="font-medium flex items-center gap-2">
                                                {getProviderIcon(event.calendarSource)}
                                                <span className="truncate">{event.title}</span>
                                            </p>
                                            <div className="flex items-center gap-2 text-xs flex-wrap">
                                                {event.htmlLink && (
                                                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                        Open in Source Calendar <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                                {matchedNote ? (
                                                     <a href={`obsidian://open?path=${encodeURIComponent(matchedNote.path)}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline flex items-center gap-1">
                                                        <Notebook className="h-3 w-3" />
                                                        <span className="truncate">Open Note: {matchedNote.name}</span>
                                                     </a>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-auto px-1 py-0 text-xs text-muted-foreground hover:bg-muted" onClick={() => onLinkNote(event)} disabled={isLinkingNoteId === event.id}>
                                                        {isLinkingNoteId === event.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                                                        Link Note
                                                    </Button>
                                                )}
                                                 <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDeleteEvent(event)} disabled={isDeletingEventId === event.id}>
                                                    {isDeletingEventId === event.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface DateTimeDetailsFlyoutProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function DateTimeDetailsFlyout({ isOpen, onOpenChange }: DateTimeDetailsFlyoutProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [settings] = useLocalStorage<StoredSettings>('tabulaNovaSettings', {} as StoredSettings);
  const [googleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
  const [microsoftAuthTokens, setMicrosoftAuthTokens] = useLocalStorage<MicrosoftAuthTokens | null>('microsoftAuthTokens', null);
  const { toast } = useToast();
  
  const [obsidianNotes, setObsidianNotes] = useState<NoteMeta[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<MatchResult[]>([]);
  const [isLinkingNoteId, setIsLinkingNoteId] = useState<string | null>(null);
  const [isDeletingEventId, setIsDeletingEventId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const vaultClientRef = React.useRef<VaultBridgeClient | null>(null);

  const fetchObsidianNotes = useCallback(() => {
    return new Promise<NoteMeta[]>((resolve, reject) => {
        if (settings.obsidianAccessType !== 'local' || !settings.showObsidianWidget) {
            resolve([]);
            return;
        }
        if (!vaultClientRef.current) {
            vaultClientRef.current = new VaultBridgeClient();
            vaultClientRef.current.onVaultMessage((msg) => {
                if (msg.type === 'notes') {
                    setObsidianNotes(msg.payload);
                    resolve(msg.payload);
                }
                if (msg.type === 'noteCreated' || msg.type === 'noteUpdated') {
                    toast({ title: 'Obsidian Note Updated', description: `Note '${msg.payload.name}' was successfully handled.` });
                    fetchObsidianNotes(); // Refresh note list
                }
            });
            vaultClientRef.current.onStatusChange((status) => {
                if (status === 'error' || status === 'disconnected') {
                    reject(new Error('Could not connect to Obsidian VaultBridge.'));
                }
            });
        }
        vaultClientRef.current.fetchAllNotes();
    });
  }, [settings.obsidianAccessType, settings.showObsidianWidget, toast]);


  const fetchAndLinkData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const calendarResponse = await syncAllCalendars({
            settings,
            tokens: { google: googleAuthTokens, microsoft: microsoftAuthTokens }
        });

        if (calendarResponse.updatedTokens?.microsoft) {
            setMicrosoftAuthTokens(calendarResponse.updatedTokens.microsoft);
        }

        const notes = await fetchObsidianNotes();
        setObsidianNotes(notes);
        
        const events = calendarResponse.events || [];

        if (events.length > 0 && notes.length > 0) {
            const linker = new ObsidianCalendarLinker();
            const results = linker.matchEventsToNotes(events, notes);
            setLinkedEvents(results);
        } else if (events.length > 0) {
            setLinkedEvents(events.map(event => ({ event, reason: 'no match' })));
        } else {
            setLinkedEvents([]);
        }

    } catch (err: any) {
        console.error("Error syncing data:", err);
        setError(err.message || "An unknown error occurred during sync.");
    } finally {
        setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, googleAuthTokens, microsoftAuthTokens, fetchObsidianNotes]);

  useEffect(() => {
    if (isOpen) {
        fetchAndLinkData();
    }

    return () => {
        if (vaultClientRef.current) {
            vaultClientRef.current.close();
            vaultClientRef.current = null;
        }
    }
  }, [isOpen, fetchAndLinkData]);
  
  const handleLinkOrCreateNote = useCallback(async (event: CalendarEvent) => {
    if (!vaultClientRef.current) {
        toast({ variant: 'destructive', title: 'Obsidian Not Connected', description: 'Cannot link note without a VaultBridge connection.' });
        return;
    }
    
    setIsLinkingNoteId(event.id);
    const linker = new ObsidianCalendarLinker();
    const matches = linker.matchEventsToNotes([event], obsidianNotes);
    const match = matches[0];

    try {
        if (match.matchedNote) {
            toast({ title: 'Linking Note...', description: `Found existing note: ${match.matchedNote.name}` });
            const linkText = `\n\n[[event:${event.id}]]`;
            vaultClientRef.current.updateNote(match.matchedNote.path, linkText);
        } else {
            const titleSlug = event.title.replace(/[\s\/\\?%*:|"<>]/g, '-');
            const date = event.start.split('T')[0];
            const path = `Calendar/${date}-${titleSlug}.md`;
            const content = `# ${event.title}\n\n*   **📅 Date:** ${date}\n*   **⏰ Time:** ${format(parseISO(event.start), 'HH:mm')} - ${format(parseISO(event.end), 'HH:mm')}\n\n[[event:${event.id}]]`;
            
            toast({ title: 'Creating Note...', description: `Creating new note at: ${path}` });
            vaultClientRef.current.createNote(path, content);
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error Linking Note', description: e.message });
    } finally {
        setTimeout(() => {
            fetchAndLinkData();
            setIsLinkingNoteId(null);
        }, 2000);
    }
  }, [obsidianNotes, fetchAndLinkData, toast]);

  const handleDeleteEvent = useCallback(async (event: CalendarEvent) => {
    if (!window.confirm(`Are you sure you want to delete the event "${event.title}"?`)) return;

    setIsDeletingEventId(event.id);
    try {
        if (event.calendarSource === 'google' && googleAuthTokens?.access_token) {
            await deleteGoogleEvent({ eventId: event.id, accessToken: googleAuthTokens.access_token });
            toast({ title: 'Event Deleted', description: 'The event has been removed from your Google Calendar.' });
            fetchAndLinkData();
        } else {
            toast({ variant: 'destructive', title: 'Not Supported', description: `Deleting events from ${event.calendarSource} is not yet supported.` });
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error Deleting Event', description: e.message });
    } finally {
        setIsDeletingEventId(null);
    }
  }, [googleAuthTokens, fetchAndLinkData, toast]);
  
  const handleCreateEvent = useCallback(async () => {
    const title = prompt("Enter a title for the new event:", "New Focus Session");
    if (!title) return;

    if (!googleAuthTokens?.access_token) {
        toast({ variant: 'destructive', title: 'Not Connected', description: `You must connect a Google account to create events.` });
        return;
    }

    setIsCreatingEvent(true);
    try {
        const now = new Date();
        const start = now.toISOString();
        const end = addHours(now, 1).toISOString();

        await createGoogleEvent({ accessToken: googleAuthTokens.access_token, title, start, end });
        toast({ title: 'Event Created', description: `"${title}" was added to your Google Calendar.` });
        fetchAndLinkData();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error Creating Event', description: e.message });
    } finally {
        setIsCreatingEvent(false);
    }
  }, [googleAuthTokens, fetchAndLinkData, toast]);


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <ScrollArea className="h-full pr-6">
          <SheetHeader>
            <SheetTitle className="text-2xl">Calendar & Events</SheetTitle>
            <SheetDescription>
              View and manage all your events from connected calendars in one place.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-8">
            <Card className="shadow-lg">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0 mx-auto md:p-0">
                   <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                  />
                </div>
                <Separator orientation="vertical" className="hidden md:block h-auto" />
                <Separator orientation="horizontal" className="block md:hidden" />
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-4">
                     <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        <span>Upcoming Events</span>
                     </h2>
                     <Button size="sm" onClick={handleCreateEvent} disabled={isCreatingEvent}>
                        {isCreatingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add Event
                     </Button>
                  </div>

                  <UnifiedEventList 
                    events={linkedEvents} 
                    isLoading={isLoading} 
                    error={error}
                    onLinkNote={handleLinkOrCreateNote}
                    isLinkingNoteId={isLinkingNoteId}
                    onDeleteEvent={handleDeleteEvent}
                    isDeletingEventId={isDeletingEventId}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlarmClock className="h-6 w-6" />
                        <span>Clock & Alarm Settings</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">
                        Timezone, alarm, and clock options can be configured in the main settings panel.
                    </p>
                    <Button variant="secondary" disabled>
                        <Cog className="mr-2 h-4 w-4" />
                        Configure Alarms (Coming Soon)
                    </Button>
                </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
