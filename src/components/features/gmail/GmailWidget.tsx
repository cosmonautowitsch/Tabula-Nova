
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Inbox, Mail } from 'lucide-react';
import type { StoredSettings, GoogleAuthTokens, GmailMessage } from '@/types';
import { listEmails, getEmail } from '@/ai/flows/gmail-flow';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GmailWidgetProps {
    settings: StoredSettings;
}

const getHeaderValue = (headers: { name: string, value: string }[], name: string) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : 'N/A';
};

export function GmailWidget({ settings }: GmailWidgetProps) {
    const { toast } = useToast();
    const [googleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
    
    const [emails, setEmails] = useState<GmailMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!googleAuthTokens?.access_token;
    const accessToken = googleAuthTokens?.access_token;

    const loadEmails = useCallback(async () => {
        if (!isConfigured || !accessToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const emailIds = await listEmails(accessToken);
            const emailPromises = emailIds.map(e => getEmail(accessToken, e.id));
            const fetchedEmails = await Promise.all(emailPromises);
            setEmails(fetchedEmails);
        } catch (e: any) {
            setError(e.message || "Failed to fetch emails.");
            toast({ variant: 'destructive', title: 'Error fetching Gmail', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, toast]);

    useEffect(() => {
        loadEmails();
    }, [loadEmails]);
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        <span>Gmail Inbox</span>
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
                        ) : emails.length > 0 ? (
                            <ul className="space-y-2">
                                {emails.map(email => (
                                    <li key={email.id} className="p-2 border-b border-border/10">
                                        <p className="font-semibold text-xs truncate">{getHeaderValue(email.payload.headers, 'Subject')}</p>
                                        <p className="text-xs text-muted-foreground truncate">{getHeaderValue(email.payload.headers, 'From')}</p>
                                        <p className="text-xs text-muted-foreground/80 mt-1 truncate">{email.snippet}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-xs text-muted-foreground py-4">No recent emails found.</div>
                        )}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
