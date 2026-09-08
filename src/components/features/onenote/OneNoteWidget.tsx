
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Notebook } from 'lucide-react';
import type { StoredSettings, MicrosoftAuthTokens, OneNoteNotebook, OneNoteSection, OneNotePage } from '@/types';
import { listNotebooks, listSections, listPages } from '@/ai/flows/microsoft-onenote-flow';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OneNoteWidgetProps {
    settings: StoredSettings;
}

export function OneNoteWidget({ settings }: OneNoteWidgetProps) {
    const { toast } = useToast();
    const [microsoftAuthTokens] = useLocalStorage<MicrosoftAuthTokens | null>('microsoftAuthTokens', null);
    
    const [notebooks, setNotebooks] = useState<OneNoteNotebook[]>([]);
    const [sections, setSections] = useState<OneNoteSection[]>([]);
    const [pages, setPages] = useState<OneNotePage[]>([]);

    const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState<'notebooks' | 'sections' | 'pages' | false>(false);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!microsoftAuthTokens?.access_token;
    const accessToken = microsoftAuthTokens?.access_token;

    const handleFetchNotebooks = useCallback(async () => {
        if (!isConfigured || !accessToken) return;
        setIsLoading('notebooks');
        setError(null);
        try {
            const fetchedNotebooks = await listNotebooks(accessToken);
            setNotebooks(fetchedNotebooks);
        } catch (e: any) {
            setError(e.message || "Failed to fetch notebooks.");
            toast({ variant: 'destructive', title: 'Error fetching OneNote Notebooks', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, toast]);

    const handleFetchSections = useCallback(async (notebookId: string) => {
        if (!isConfigured || !accessToken) return;
        setSelectedNotebookId(notebookId);
        setSelectedSectionId(null);
        setPages([]);
        setIsLoading('sections');
        setError(null);
        try {
            const fetchedSections = await listSections(accessToken, notebookId);
            setSections(fetchedSections);
        } catch (e: any) {
            setError(e.message || "Failed to fetch sections.");
            toast({ variant: 'destructive', title: 'Error fetching OneNote Sections', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, toast]);
    
    const handleFetchPages = useCallback(async (sectionId: string) => {
        if (!isConfigured || !accessToken) return;
        setSelectedSectionId(sectionId);
        setIsLoading('pages');
        setError(null);
        try {
            const fetchedPages = await listPages(accessToken, sectionId);
            setPages(fetchedPages);
        } catch(e: any) {
            setError(e.message || "Failed to fetch pages.");
            toast({ variant: 'destructive', title: 'Error fetching OneNote Pages', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, toast]);


    useEffect(() => {
        handleFetchNotebooks();
    }, [handleFetchNotebooks]);
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 256 256" className="inline"><path fill="currentColor" d="M216 40H88a16 16 0 0 0-16 16v40H40a16 16 0 0 0-16 16v88a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-40h32a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-48 160H40v-88h32v40a16 16 0 0 0 16 16h40Zm48-48h-32v-40a16 16 0 0 0-16-16H88V56h128Z"/></svg>
                        <span>OneNote</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3 pt-0 min-h-0">
                 {!isConfigured ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Connect your Microsoft Account in Settings {'>'} Calendar to use this widget.</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-destructive">
                        <AlertTriangle className="h-5 w-5 mr-2" /> {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 flex-grow min-h-0">
                        {/* Notebooks Column */}
                        <div className="flex flex-col">
                            <h4 className="text-xs font-semibold mb-1 truncate">Notebooks</h4>
                            <ScrollArea className="flex-grow border rounded-md p-1">
                                {isLoading === 'notebooks' ? <Loader2 className="h-4 w-4 animate-spin mx-auto mt-4" /> : (
                                    notebooks.map(nb => (
                                        <Button key={nb.id} variant="ghost" size="sm" className={cn("w-full justify-start text-xs h-7", selectedNotebookId === nb.id && "bg-muted font-bold")} onClick={() => handleFetchSections(nb.id)}>
                                            <span className="truncate">{nb.displayName}</span>
                                        </Button>
                                    ))
                                )}
                            </ScrollArea>
                        </div>
                         {/* Sections Column */}
                        <div className="flex flex-col">
                            <h4 className="text-xs font-semibold mb-1 truncate">Sections</h4>
                            <ScrollArea className="flex-grow border rounded-md p-1">
                                {isLoading === 'sections' ? <Loader2 className="h-4 w-4 animate-spin mx-auto mt-4" /> : (
                                    sections.map(sec => (
                                        <Button key={sec.id} variant="ghost" size="sm" className={cn("w-full justify-start text-xs h-7", selectedSectionId === sec.id && "bg-muted font-bold")} onClick={() => handleFetchPages(sec.id)}>
                                             <span className="truncate">{sec.displayName}</span>
                                        </Button>
                                    ))
                                )}
                            </ScrollArea>
                        </div>
                         {/* Pages Column */}
                        <div className="flex flex-col">
                            <h4 className="text-xs font-semibold mb-1 truncate">Pages</h4>
                            <ScrollArea className="flex-grow border rounded-md p-1">
                                {isLoading === 'pages' ? <Loader2 className="h-4 w-4 animate-spin mx-auto mt-4" /> : (
                                    pages.map(p => (
                                        <Button key={p.id} variant="ghost" size="sm" className="w-full justify-start text-xs h-7" asChild>
                                            <a href={p.links.oneNoteWebUrl.href} target="_blank" rel="noopener noreferrer">
                                                <span className="truncate">{p.title}</span>
                                            </a>
                                        </Button>
                                    ))
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
