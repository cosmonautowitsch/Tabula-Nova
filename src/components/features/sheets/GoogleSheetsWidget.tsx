
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Sheet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StoredSettings, GoogleAuthTokens } from '@/types';
import { getSheetData, listSpreadsheets } from '@/ai/flows/google-sheets-flow';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';

interface GoogleSheetsWidgetProps {
    settings: StoredSettings;
}

export function GoogleSheetsWidget({ settings }: GoogleSheetsWidgetProps) {
    const { toast } = useToast();
    const [googleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
    
    const [sheetData, setSheetData] = useState<string[][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!googleAuthTokens?.access_token && !!settings.googleSheetId;
    const accessToken = googleAuthTokens?.access_token;
    const { googleSheetId, googleSheetRange } = settings;

    const loadSheetData = useCallback(async () => {
        if (!isConfigured || !accessToken || !googleSheetId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await getSheetData({ 
                accessToken, 
                spreadsheetId: googleSheetId, 
                range: googleSheetRange || 'A1:Z1000' 
            });
            setSheetData(data.values || []);
        } catch (e: any) {
            setError(e.message || "Failed to fetch sheet data.");
            toast({ variant: 'destructive', title: 'Error fetching Google Sheet', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, googleSheetId, googleSheetRange, toast]);

    useEffect(() => {
        loadSheetData();
    }, [loadSheetData]);
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sheet className="h-4 w-4" />
                        <span>Google Sheets</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3 pt-0 min-h-0">
                 {!isConfigured ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Please connect your Google Account and configure the Spreadsheet ID in settings.</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-destructive">
                        <AlertTriangle className="h-5 w-5 mr-2" /> {error}
                    </div>
                ) : (
                    <ScrollArea className="flex-grow h-48">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                            </div>
                        ) : sheetData.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {sheetData[0].map((header, index) => <TableHead key={index} className="text-xs">{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sheetData.slice(1).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {row.map((cell, cellIndex) => <TableCell key={cellIndex} className="text-xs">{cell}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center text-xs text-muted-foreground py-4">No data found in the specified range.</div>
                        )}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
