
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { SettingsPanel } from '@/components/features/settings/SettingsDialog';
import { AiSearchBar } from '@/components/features/search/AiSearchBar';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { StoredSettings, LinkItem as LinkItemType, NoteItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { EdgeSidebar } from '@/components/features/sidebar/EdgeSidebar';
import { WidgetDock } from '@/components/features/sidebar/WidgetDock';
import { Toaster } from "@/components/ui/toaster";
import dynamic from 'next/dynamic';
import { DateTimeWidget } from '@/components/features/datetime/DateTimeWidget';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotesWidget } from '@/components/features/notes/NotesWidget';
import { ObsidianWidget } from '@/components/features/obsidian/ObsidianWidget';
import { NotionTasksWidget } from '@/components/features/notion/NotionTasksWidget';
import { GoogleTasksWidget } from '@/components/features/tasks/GoogleTasksWidget';
import { GoogleSheetsWidget } from '@/components/features/sheets/GoogleSheetsWidget';
import { OneNoteWidget } from '@/components/features/onenote/OneNoteWidget';
import { GoogleDocsWidget } from '@/components/features/docs/GoogleDocsWidget';
import { GmailWidget } from '@/components/features/gmail/GmailWidget';
import { GoogleDriveWidget } from '@/components/features/drive/GoogleDriveWidget';
import { HabiticaWidget } from '@/components/features/habitica/HabiticaWidget';
import { DateTimeDetailsFlyout } from '@/components/features/datetime/DateTimeDetailsFlyout';
import { DebugPanelFlyout } from '@/components/features/debug/DebugPanelFlyout';


const defaultInitialSettings: StoredSettings = {
  folders: [
    { id: uuidv4(), name: "Favorites", layout: 'grid', links: [
      { id: uuidv4(), title: "ChatGPT", url: "https://chat.openai.com", tags: ["ki", "tools", "chatbot"] },
      { id: uuidv4(), title: "Obsidian", url: "https://obsidian.md", tags: ["notizen", "zweites gehirn", "md"] },
      { id: uuidv4(), title: "Google", url: "https://google.com", tags: ["search", "web"] },
      { id: uuidv4(), title: "Next.js Docs", url: "https://nextjs.org/docs", tags: ["react", "dev", "framework"] },
    ], iconId: undefined },
    { id: uuidv4(), name: "News", layout: 'list', links: [
      { id: uuidv4(), title: "Hacker News", url: "https://news.ycombinator.com", tags: ["tech", "news", "startups"] },
      { id: uuidv4(), title: "The Verge", url: "https://www.theverge.com", tags: ["tech", "news", "gadgets"] },
    ], iconId: undefined },
  ],
  background: { type: 'color', value: '#F0F4F7' },
  weatherCity: 'London',
  openWeatherApiKey: '',
  weatherUnit: 'metric',
  timezoneOffset: 0,
  mainTimezoneDstActive: false,
  showDateTimeWidget: true,
  showWeatherWidget: true,
  additionalTimezones: [],
  showCalendarEvents: false,
  layout: 'standard',
  linkContainerBackgroundColor: '#FFFFFF',
  linkContainerBackgroundOpacity: 0.1,
  timeFormat: '24h',
  showSeconds: true,
  notes: [{ id: uuidv4(), title: "Quick Note", content: "This is a new note.\nYou can edit me!" }],
  notesDefaultTitle: "New Note",
  showObsidianWidget: false,
  showNotionTasksWidget: false,
  showGoogleTasksWidget: false,
  showGoogleSheetsWidget: false,
  showOneNoteWidget: false,
  showGoogleDocsWidget: false,
  showGmailWidget: false,
  showGoogleDriveWidget: false,
  showHabiticaWidget: false,
  showWidgetDock: true,
  widgetDockPosition: 'left',
};

const LinkManager = dynamic(
  () => import('@/components/features/links/LinkManager').then((mod) => mod.LinkManager),
  { ssr: false }
);

export default function TabulaNovaPage() {
  const [storedSettings, setStoredSettings] = useLocalStorage<StoredSettings>('tabulaNovaSettings', defaultInitialSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDateTimeDetailsOpen, setIsDateTimeDetailsOpen] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    background,
    layout,
  } = storedSettings;

  const handleSaveSettings = (newSettings: Partial<StoredSettings>) => {
    setStoredSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const handleReorderLinksInFolder = (folderId: string, newLinks: LinkItemType[]) => {
    setStoredSettings(prev => ({
      ...prev,
      folders: prev.folders.map(f =>
        f.id === folderId ? { ...f, links: newLinks } : f
      ),
    }));
  };

  const handleNoteChange = (noteId: string, newContent: Partial<NoteItem>) => {
    setStoredSettings(prev => ({
      ...prev,
      notes: (prev.notes || []).map(n =>
        n.id === noteId ? { ...n, ...newContent } : n
      ),
    }));
  };

  const handleExportSettings = () => {
    try {
      const settingsJson = JSON.stringify(storedSettings, null, 2);
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tabula-nova-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting settings:", error);
    }
  };

  const handleImportSettings = (importedSettings: StoredSettings) => {
    if (importedSettings && importedSettings.folders && importedSettings.background) {
      setStoredSettings(importedSettings);
      setIsSettingsOpen(false);
    } else {
      console.error("Invalid settings file");
    }
  };

  const backgroundStyle = useMemo(() => {
    if (!isClient || !background) return {}; 

    const style: React.CSSProperties = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh', 
    };

    if (background.type === 'color') {
      style.backgroundImage = background.value.startsWith('linear-gradient') ? background.value : 'none';
      style.backgroundColor = background.value.startsWith('linear-gradient') ? 'transparent' : background.value;
    } else if (background.type === 'image' && background.value) {
      style.backgroundImage = `url('${background.value}')`;
      style.backgroundColor = 'transparent';
    } else {
      style.backgroundColor = defaultInitialSettings.background.value;
      style.backgroundImage = 'none';
    }
    return style;
  }, [background, isClient]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading Tabula Nova...</p>
      </div>
    );
  }

  const firstNote = storedSettings.notes?.[0];

  return (
    <div style={backgroundStyle} className="min-h-screen flex flex-col transition-all duration-500">
      <main className="flex-grow container mx-auto p-4 md:p-6 space-y-8 mt-4">
        {isClient && (
          <>
            {layout === 'standard' && (
              <section id="main-content-standard" className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <div className="md:col-span-1 space-y-6 flex flex-col items-start">
                  {(storedSettings.showDateTimeWidget ?? true) && (
                     <DateTimeWidget
                        timezoneOffset={storedSettings.timezoneOffset ?? 0}
                        mainTimezoneDstActive={storedSettings.mainTimezoneDstActive ?? false}
                        additionalTimezones={storedSettings.additionalTimezones ?? []}
                        timeFormat={storedSettings.timeFormat ?? '24h'}
                        showSeconds={storedSettings.showSeconds ?? false}
                        city={storedSettings.weatherCity}
                        apiKey={storedSettings.openWeatherApiKey}
                        unit={storedSettings.weatherUnit ?? 'metric'}
                      />
                  )}
                </div>
                <div className="md:col-span-3 flex flex-col space-y-6">
                  <AiSearchBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
                  <LinkManager
                    storedSettings={storedSettings}
                    setStoredSettings={setStoredSettings}
                    appLayout={layout ?? 'standard'}
                    onReorderLinksInFolder={handleReorderLinksInFolder}
                    searchQuery={searchQuery}
                  />
                </div>
              </section>
            )}

            {layout === 'wide' && (
              <section id="main-content-wide" className="flex flex-col items-center space-y-10">
                 {/* Center Aligned Container for Header Widgets */}
                 <div className="w-full max-w-3xl flex flex-col items-center gap-6">
                   {(storedSettings.showDateTimeWidget ?? true) && (
                      <DateTimeWidget
                        timezoneOffset={storedSettings.timezoneOffset ?? 0}
                        mainTimezoneDstActive={storedSettings.mainTimezoneDstActive ?? false}
                        additionalTimezones={storedSettings.additionalTimezones ?? []}
                        timeFormat={storedSettings.timeFormat ?? '24h'}
                        showSeconds={storedSettings.showSeconds ?? false}
                        city={storedSettings.weatherCity}
                        apiKey={storedSettings.openWeatherApiKey}
                        unit={storedSettings.weatherUnit ?? 'metric'}
                      />
                   )}
                   <AiSearchBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
                 </div>

                {/* Link Manager Section */}
                <div className="w-full">
                  <LinkManager
                    storedSettings={storedSettings}
                    setStoredSettings={setStoredSettings}
                    appLayout={layout ?? 'wide'}
                    onReorderLinksInFolder={handleReorderLinksInFolder}
                    searchQuery={searchQuery}
                  />
                </div>

                {/* Secondary Widgets Grid */}
                <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
                   {firstNote && (
                      <div className="lg:col-span-1">
                        <NotesWidget 
                          note={firstNote}
                          onNoteChange={handleNoteChange}
                        />
                      </div>
                   )}
                   {(storedSettings.showObsidianWidget ?? false) && (
                     <div className="lg:col-span-1">
                       <ObsidianWidget settings={storedSettings} />
                     </div>
                   )}
                   {(storedSettings.showNotionTasksWidget ?? false) && (
                     <div className="lg:col-span-1">
                       <NotionTasksWidget settings={storedSettings} />
                     </div>
                   )}
                   {(storedSettings.showGoogleTasksWidget ?? false) && (
                     <div className="lg:col-span-1">
                       <GoogleTasksWidget settings={storedSettings} />
                     </div>
                   )}
                   {(storedSettings.showGoogleSheetsWidget ?? false) && (
                     <div className="lg:col-span-1">
                       <GoogleSheetsWidget settings={storedSettings} />
                     </div>
                   )}
                    {(storedSettings.showOneNoteWidget ?? false) && (
                        <div className="lg:col-span-1">
                            <OneNoteWidget settings={storedSettings} />
                        </div>
                    )}
                    {(storedSettings.showGoogleDocsWidget ?? false) && (
                        <div className="lg:col-span-1">
                            <GoogleDocsWidget settings={storedSettings} />
                        </div>
                    )}
                    {(storedSettings.showGmailWidget ?? false) && (
                        <div className="lg:col-span-1">
                            <GmailWidget settings={storedSettings} />
                        </div>
                    )}
                    {(storedSettings.showGoogleDriveWidget ?? false) && (
                        <div className="lg:col-span-1">
                            <GoogleDriveWidget settings={storedSettings} />
                        </div>
                    )}
                    {(storedSettings.showHabiticaWidget ?? false) && (
                        <div className="lg:col-span-1">
                            <HabiticaWidget settings={storedSettings} />
                        </div>
                    )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto p-0">
           <ScrollArea className="h-full">
            <div className="p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl">Settings</SheetTitle>
                <SheetDescription>
                  Customize your Tabula Nova experience. Click save when you're done.
                </SheetDescription>
              </SheetHeader>
              <SettingsPanel
                settings={storedSettings}
                onSettingsChange={handleSaveSettings}
                onClose={() => setIsSettingsOpen(false)}
                onExportSettings={handleExportSettings}
                onImportSettings={handleImportSettings}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      <DateTimeDetailsFlyout 
        isOpen={isDateTimeDetailsOpen} 
        onOpenChange={setIsDateTimeDetailsOpen} 
      />

      <DebugPanelFlyout
        isOpen={isDebugPanelOpen}
        onOpenChange={setIsDebugPanelOpen}
      />
      
      <EdgeSidebar 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        currentLayout={layout ?? 'standard'}
        onOpenDateTimeDetails={() => setIsDateTimeDetailsOpen(true)}
        onOpenDebugPanel={() => setIsDebugPanelOpen(true)}
      />

      {storedSettings.showWidgetDock && (
        <WidgetDock
          position={storedSettings.widgetDockPosition ?? 'left'}
          onOpenCalendar={() => setIsDateTimeDetailsOpen(true)}
        />
      )}

      <Toaster />
    </div>
  );
}
