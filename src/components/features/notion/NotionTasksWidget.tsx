
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, AlertTriangle, Plus } from 'lucide-react';
import type { NotionTask, StoredSettings } from '@/types';
import { fetchNotionTasks, addNotionTask, deleteNotionTask } from '@/ai/flows/notion-tasks-flow';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';

interface NotionTasksWidgetProps {
    settings: StoredSettings;
}

export function NotionTasksWidget({ settings }: NotionTasksWidgetProps) {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<NotionTask[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!settings.notionTaskDatabaseId;

    const loadTasks = useCallback(async () => {
        if (!isConfigured) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fetchedTasks = await fetchNotionTasks(settings.notionTaskDatabaseId!);
            setTasks(fetchedTasks);
        } catch (e: any) {
            setError(e.message || "Failed to fetch tasks.");
            toast({ variant: 'destructive', title: 'Error fetching Notion tasks', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, settings.notionTaskDatabaseId, toast]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !isConfigured) return;

        const optimisticTask: NotionTask = { id: `temp-${Date.now()}`, title: newTaskTitle, status: 'New' };
        setTasks(prev => [optimisticTask, ...prev]);
        setNewTaskTitle("");

        try {
            await addNotionTask({ databaseId: settings.notionTaskDatabaseId!, title: newTaskTitle.trim() });
            toast({ title: "Task Added", description: `"${newTaskTitle}" was added to Notion.` });
            loadTasks(); // Refresh list from source
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error adding task', description: e.message });
            setTasks(prev => prev.filter(t => t.id !== optimisticTask.id)); // Rollback optimistic update
        }
    };

    const handleDeleteTask = async (taskId: string, taskTitle: string) => {
        if (!isConfigured) return;

        const originalTasks = tasks;
        setTasks(prev => prev.filter(t => t.id !== taskId));

        try {
            await deleteNotionTask({ pageId: taskId });
            toast({ title: "Task Deleted", description: `"${taskTitle}" was deleted from Notion.` });
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error deleting task', description: e.message });
            setTasks(originalTasks); // Rollback optimistic update
        }
    };
    
    const isDarkEffectiveBg = settings.background?.type === 'image' || (settings.background?.type === 'color' && isColorDark(settings.background.value));
    const cardClasses = isDarkEffectiveBg 
      ? "bg-black/20 text-white border-white/20" 
      : "bg-white/50 text-neutral-800";
      
    const inputClasses = isDarkEffectiveBg 
      ? "bg-transparent border-white/30 focus-visible:ring-offset-0 text-white placeholder:text-gray-400" 
      : "bg-white/80 border-gray-300 focus-visible:ring-offset-0 text-neutral-800";

    return (
        <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
            <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 256 256" className="inline"><path fill="currentColor" d="M240 64v128a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16V64a16 16 0 0 1 16-16h192a16 16 0 0 1 16 16M80 124l40-40l40 40l-40 40Zm104-52l-20.2 20.2a8 8 0 0 1-11.3 0L144.9 84a8 8 0 0 1 0-11.3L165.1 52a8 8 0 0 1 11.3 0l7.6 7.7a8 8 0 0 1 0 11.3m-83.6 83.6l-7.6-7.7a8 8 0 0 1 0-11.3l20.2-20.2a8 8 0 0 1 11.3 0l8.1 8.1a8 8 0 0 1 0 11.3l-20.2 20.2a8 8 0 0 1-11.8-.4"/></svg>
                        <span>Notion Tasks</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3 pt-0 min-h-0">
                {!isConfigured ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Please configure your Notion Task Database ID in the settings.</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-destructive">
                        <AlertTriangle className="h-5 w-5 mr-2" /> {error}
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-grow pr-2 h-32">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                                </div>
                            ) : tasks.length > 0 ? (
                                <ul className="space-y-1">
                                    {tasks.map(task => (
                                        <li key={task.id} className="flex items-center justify-between text-xs p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 group">
                                            <span className="truncate pr-2">{task.title}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id, task.title)}>
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center text-xs text-muted-foreground py-4">No tasks found.</div>
                            )}
                        </ScrollArea>
                        <form onSubmit={handleAddTask} className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                            <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Add a new task..."
                                className={cn("h-8 text-xs", inputClasses)}
                                disabled={!isConfigured || isLoading}
                            />
                            <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!isConfigured || isLoading || !newTaskTitle.trim()}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
