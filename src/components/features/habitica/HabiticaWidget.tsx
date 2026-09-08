
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Heart, Star, Shield, Swords, Coins, Diamond, Repeat, CheckSquare, Plus, Minus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { StoredSettings, GotchiQuestTask, GotchiQuestUserStats, GotchiQuestTaskType } from '@/types';
import { getGotchiQuestState, scoreGotchiQuestTask } from '@/ai/flows/habitica-flow';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';

interface HabiticaWidgetProps {
    settings: StoredSettings;
}

export function HabiticaWidget({ settings }: HabiticaWidgetProps) {
    const { toast } = useToast();
    const [stats, setStats] = useState<GotchiQuestUserStats | null>(null);
    const [tasks, setTasks] = useState<GotchiQuestTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isEnabled = settings.showHabiticaWidget ?? false;

    const loadData = useCallback(async () => {
        if (!isEnabled) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const state = await getGotchiQuestState();
            setStats(state.player);
            setTasks(state.tasks);
        } catch (e: any) {
            setError(e.message || "Failed to fetch GotchiQuest data.");
            toast({ variant: 'destructive', title: 'Error fetching GotchiQuest data', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isEnabled, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleTaskClick = async (taskId: string, type: GotchiQuestTaskType, direction?: 'up' | 'down') => {
        try {
            const newState = await scoreGotchiQuestTask({ taskId, type, direction });
            setStats(newState.player);
            setTasks(newState.tasks);
            
            // UI Feedback Toasts
            if (type === 'todo' || type === 'daily') {
                toast({ title: "Task Completed!", description: `Great work!`, className: "bg-green-500 text-white" });
            } else if (type === 'reward') {
                 toast({ title: "Reward Claimed!", description: `Enjoy!`, className: "bg-purple-500 text-white" });
            } else { // habit
                 toast({ title: "Habit Tracked!", description: `Progress noted!`, className: "bg-blue-500 text-white" });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
            loadData(); // Re-fetch data on error to ensure consistency
        }
    };

    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";

    const getTaskIcon = (type: GotchiQuestTaskType) => {
        switch(type) {
            case 'habit': return <Repeat className="h-4 w-4 text-blue-400" />;
            case 'daily': return <Shield className="h-4 w-4 text-green-500" />;
            case 'todo': return <CheckSquare className="h-4 w-4 text-orange-500" />;
            case 'reward': return <Diamond className="h-4 w-4 text-purple-500" />;
            default: return null;
        }
    }

    const renderTaskList = (type: GotchiQuestTaskType, title: string) => {
        const filteredTasks = tasks.filter(t => t.type === type);
        if (filteredTasks.length === 0) return null;

        return (
            <div>
                <h4 className="font-semibold text-xs mb-1 flex items-center gap-1.5">{getTaskIcon(type)} {title}</h4>
                <ul className="space-y-1">
                    {filteredTasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between group p-1 rounded hover:bg-black/10">
                            <span className={cn("truncate text-xs", task.completed && "line-through text-muted-foreground")}>{task.text}</span>
                            <div className="flex items-center gap-1 shrink-0">
                                {task.type === 'todo' && !task.completed && (
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleTaskClick(task.id, 'todo')}>
                                        <CheckSquare className="h-4 w-4 text-green-500" />
                                     </Button>
                                )}
                                 {task.type === 'daily' && !task.completed && (
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleTaskClick(task.id, 'daily')}>
                                        <CheckSquare className="h-4 w-4 text-green-500" />
                                     </Button>
                                )}
                                {task.type === 'habit' && (
                                    <>
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleTaskClick(task.id, 'habit', 'up')}>
                                        <Plus className="h-4 w-4 text-green-500" />
                                     </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleTaskClick(task.id, 'habit', 'down')}>
                                        <Minus className="h-4 w-4 text-red-500" />
                                     </Button>
                                    </>
                                )}
                                {task.type === 'reward' && (
                                     <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleTaskClick(task.id, 'reward')}>
                                        Buy ({task.cost}G)
                                     </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )
    };

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Swords className="h-4 w-4" />
                        <span>GotchiQuest</span>
                    </div>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadData} disabled={isLoading}><Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} /></Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3 pt-0 min-h-0">
                {!isEnabled ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Enable GotchiQuest in settings to start your adventure.</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-destructive">
                        <AlertTriangle className="h-5 w-5 mr-2" /> {error}
                    </div>
                ) : isLoading && !stats ? (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                    </div>
                ) : stats && (
                    <TooltipProvider>
                    <div className="space-y-2">
                        {/* Stats Bars */}
                        <div className="space-y-1.5">
                             <Tooltip>
                                <TooltipTrigger className="w-full text-left">
                                    <div className="flex items-center text-xs gap-1">
                                        <Heart className="h-3 w-3 text-red-500" />
                                        <span className="w-4">HP</span>
                                        <Progress value={stats.hp} className="h-1.5 flex-grow" />
                                        <span className="w-10 text-right">{stats.hp}/100</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Health Points</TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger className="w-full text-left">
                                    <div className="flex items-center text-xs gap-1">
                                        <Star className="h-3 w-3 text-yellow-400" />
                                         <span className="w-4">XP</span>
                                        <Progress value={(stats.xp / (stats.level * 100)) * 100} className="h-1.5 flex-grow" />
                                        <span className="w-10 text-right">{stats.xp}/{stats.level * 100}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Experience Points to next level</TooltipContent>
                            </Tooltip>
                        </div>
                        {/* Gold and Level */}
                        <div className="flex justify-between text-xs font-semibold px-1">
                            <div className="flex items-center gap-1">
                                <Shield className="h-4 w-4 text-blue-400" />
                                <span>Level: {stats.level}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Coins className="h-4 w-4 text-amber-500" />
                                <span>Gold: {stats.gold.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Task Lists */}
                        <ScrollArea className="h-40 pr-2 space-y-3 mt-2">
                            {renderTaskList('todo', 'Todos')}
                            {renderTaskList('daily', 'Dailies')}
                            {renderTaskList('habit', 'Habits')}
                            {renderTaskList('reward', 'Rewards')}
                        </ScrollArea>
                    </div>
                    </TooltipProvider>
                )}
            </CardContent>
        </Card>
    );
}

    