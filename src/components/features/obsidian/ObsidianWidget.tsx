
"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { StoredSettings, NoteMeta } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';
import { Notebook, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { VaultBridgeClient, type VaultBridgeMessage } from '@/lib/obsidian';

interface ObsidianWidgetProps {
    settings: StoredSettings;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function ObsidianWidget({ settings }: ObsidianWidgetProps) {
    const [notes, setNotes] = useState<NoteMeta[]>([]);
    const [selectedNoteContent, setSelectedNoteContent] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const clientRef = useRef<VaultBridgeClient | null>(null);
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
        ? "bg-black/20 text-white border-white/20" 
        : "bg-white/50 text-neutral-800";

    const connect = () => {
        if (!clientRef.current) {
            clientRef.current = new VaultBridgeClient();

            clientRef.current.onStatusChange(setConnectionStatus);

            clientRef.current.onVaultMessage((msg: VaultBridgeMessage) => {
                if (msg.type === 'notes') {
                    setNotes(msg.payload);
                }
                if (msg.type === 'noteContent') {
                    setSelectedNoteContent(msg.payload.content);
                }
            });
        }
        clientRef.current.fetchAllNotes();
    };

    useEffect(() => {
        if (settings.obsidianAccessType === 'local') {
            connect();
        } else {
            clientRef.current?.close();
            setConnectionStatus('disconnected');
        }

        return () => {
            clientRef.current?.close();
            clientRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.obsidianAccessType]);

    const handleNoteClick = (path: string) => {
        if (clientRef.current) {
            setSelectedNoteContent("Loading...");
            clientRef.current.fetchNoteContent(path);
        }
    };
    
    const renderStatusIcon = () => {
        switch(connectionStatus) {
            case 'connected': return <Wifi className="h-4 w-4 text-green-500" title="Connected" />;
            case 'connecting': return <Loader2 className="h-4 w-4 animate-spin" title="Connecting..." />;
            case 'error': return <WifiOff className="h-4 w-4 text-destructive" title="Connection Error"/>;
            case 'disconnected':
            default:
                return <WifiOff className="h-4 w-4 text-muted-foreground" title="Disconnected" />;
        }
    }

    if (settings.obsidianAccessType !== 'local') {
        return (
             <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Notebook className="h-4 w-4" />
                          <span>Obsidian Notes</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-muted-foreground">Obsidian integration via local plugin is not enabled in settings.</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader>
                 <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Notebook className="h-4 w-4" />
                        <span>Obsidian Notes</span>
                    </div>
                    {renderStatusIcon()}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-3 gap-2 min-h-0">
                <div className="col-span-1">
                    <h3 className="text-xs font-semibold mb-2">Notes List</h3>
                    <ScrollArea className="h-48 pr-2">
                        {notes.length > 0 ? (
                             <ul className="space-y-1">
                                {notes.map(note => (
                                    <li key={note.path}>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="w-full justify-start text-xs h-7"
                                            onClick={() => handleNoteClick(note.path)}
                                        >
                                           <span className="truncate">{note.name}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">
                                {connectionStatus === 'connected' ? 'No notes found.' : 'Not connected.'}
                            </p>
                        )}
                    </ScrollArea>
                </div>
                <div className="col-span-2">
                     <h3 className="text-xs font-semibold mb-2">Content</h3>
                     <ScrollArea className="h-48 p-2 border rounded-md bg-background/10">
                        {selectedNoteContent !== null ? (
                            <pre className="text-xs whitespace-pre-wrap font-sans">{selectedNoteContent}</pre>
                        ) : (
                             <p className="text-xs text-muted-foreground italic">Select a note to view its content.</p>
                        )}
                    </ScrollArea>
                </div>
                 {connectionStatus !== 'connected' && (
                    <div className="col-span-3 mt-2">
                        <Button variant="secondary" size="sm" onClick={connect} disabled={connectionStatus === 'connecting'}>
                            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Obsidian'}
                        </Button>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
