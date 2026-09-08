
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, FileText } from 'lucide-react';
import type { StoredSettings, GoogleAuthTokens, GoogleDoc } from '@/types';
import { listDocuments } from '@/ai/flows/google-docs-flow';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GoogleDocsWidgetProps {
    settings: StoredSettings;
}

export function GoogleDocsWidget({ settings }: GoogleDocsWidgetProps) {
    const { toast } = useToast();
    const [googleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
    
    const [docs, setDocs] = useState<GoogleDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!googleAuthTokens?.access_token;
    const accessToken = googleAuthTokens?.access_token;

    const loadDocs = useCallback(async () => {
        if (!isConfigured || !accessToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fetchedDocs = await listDocuments(accessToken);
            setDocs(fetchedDocs);
        } catch (e: any) {
            setError(e.message || "Failed to fetch Google Docs.");
            toast({ variant: 'destructive', title: 'Error fetching Google Docs', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, toast]);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Google Docs</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3 pt-0 min-h-0">
                 {!isConfigured ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Connect your Google Account in Settings to use this widget.</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-destructive">
                        <AlertTriangle className="h-5 w-5 mr-2" /> {error}
                    </div>
                ) : (
                    <ScrollArea className="flex-grow pr-2 h-48">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                            </div>
                        ) : docs.length > 0 ? (
                            <ul className="space-y-1">
                                {docs.map(doc => (
                                    <li key={doc.id}>
                                         <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" asChild>
                                            <a href={doc.webViewLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                                <FileText className="h-3 w-3" />
                                                <span className="truncate">{doc.name}</span>
                                            </a>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-xs text-muted-foreground py-4">No documents found.</div>
                        )}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
