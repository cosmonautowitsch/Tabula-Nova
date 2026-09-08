"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { getGotchiQuestState, scoreGotchiQuestTask } from '@/ai/flows/habitica-flow';
import type { GotchiQuestUserStats, GotchiQuestTask, GotchiQuestTaskType } from '@/types';
import { Loader2, Swords, Heart, Star, Coins } from 'lucide-react';

interface DebugPanelFlyoutProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function DebugPanelFlyout({ isOpen, onOpenChange }: DebugPanelFlyoutProps) {
    const { toast } = useToast();
    const [player, setPlayer] = useState<GotchiQuestUserStats | null>(null);
    const [tasks, setTasks] = useState<GotchiQuestTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadState = useCallback(async () => {
        setIsLoading(true);
        try {
            const state = await getGotchiQuestState();
            setPlayer(state.player);
            setTasks(state.tasks);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error loading debug data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isOpen) {
            loadState();
        }
    }, [isOpen, loadState]);

    const handleAction = async (taskId: string, type: GotchiQuestTaskType, direction?: 'up' | 'down') => {
        try {
            const newState = await scoreGotchiQuestTask({ taskId, type, direction });
            setPlayer(newState.player);
            setTasks(newState.tasks);
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Action failed', description: error.message });
             loadState(); // Re-sync on error
        }
    };
    
    const renderTaskList = (type: GotchiQuestTaskType) => {
        const filteredTasks = tasks.filter(t => t.type === type);
        if (filteredTasks.length === 0) return null;

        return (
            <div className="space-y-2 p-2 border rounded-md">
                <h2 className="font-semibold capitalize">{type}s</h2>
                {filteredTasks.map(task => (
                    <div key={task.id} className="flex gap-2 items-center text-sm">
                        <span className="flex-1">
                            {(task.type === 'todo' || task.type === 'daily') && task.completed ? '✅ ' : ''}{task.text}
                        </span>
                        {task.type === 'habit' && (
                            <>
                             <Button size="sm" onClick={() => handleAction(task.id, 'habit', 'up')}>+</Button>
                             <Button size="sm" onClick={() => handleAction(task.id, 'habit', 'down')}>-</Button>
                            </>
                        )}
                        {(task.type === 'todo' || task.type === 'daily') && !task.completed && (
                            <Button size="sm" onClick={() => handleAction(task.id, task.type)}>✔</Button>
                        )}
                         {task.type === 'reward' && (
                            <Button size="sm" onClick={() => handleAction(task.id, 'reward')}>🎁 ({task.cost}G)</Button>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>🧪 GotchiQuest Debug Panel</SheetTitle>
                    <SheetDescription>
                        Interact with the gamification engine in real-time.
                    </SheetDescription>
                </SheetHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100%-80px)] pr-4 mt-4">
                        <div className="space-y-4">
                            {player && (
                                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                                    <div className="flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /><strong>Level:</strong> {player.level}</div>
                                    <div className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /><strong>XP:</strong> {player.xp} / {player.level * 100}</div>
                                    <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-red-500" /><strong>HP:</strong> {player.hp} / 100</div>
                                    <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" /><strong>Gold:</strong> {player.gold}</div>
                                </div>
                            )}
                            
                            {renderTaskList('todo')}
                            {renderTaskList('daily')}
                            {renderTaskList('habit')}
                            {renderTaskList('reward')}
                        </div>
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    );
}
