
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Folder as FolderIcon } from 'lucide-react';
import type { StoredSettings, GoogleAuthTokens, GoogleDriveFile } from '@/types';
import { listFiles } from '@/ai/flows/google-drive-flow';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface GoogleDriveWidgetProps {
    settings: StoredSettings;
}

export function GoogleDriveWidget({ settings }: GoogleDriveWidgetProps) {
    const { toast } = useToast();
    const [googleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
    
    const [files, setFiles] = useState<GoogleDriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!googleAuthTokens?.access_token;
    const accessToken = googleAuthTokens?.access_token;

    const loadFiles = useCallback(async () => {
        if (!isConfigured || !accessToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fetchedFiles = await listFiles(accessToken);
            setFiles(fetchedFiles);
        } catch (e: any) {
            setError(e.message || "Failed to fetch Google Drive files.");
            toast({ variant: 'destructive', title: 'Error fetching Google Drive', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, toast]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderIcon className="h-4 w-4" />
                        <span>Google Drive</span>
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
                        ) : files.length > 0 ? (
                            <ul className="space-y-1">
                                {files.map(file => (
                                    <li key={file.id}>
                                         <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" asChild>
                                            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                                <Image src={file.iconLink} alt="" width={16} height={16} />
                                                <span className="truncate">{file.name}</span>
                                            </a>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-xs text-muted-foreground py-4">No recent files found.</div>
                        )}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
