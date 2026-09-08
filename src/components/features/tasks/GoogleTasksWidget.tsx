
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import type { StoredSettings, GoogleTaskList, GoogleTask, GoogleAuthTokens } from '@/types';
import { fetchGoogleTaskLists, fetchTasksFromList, createGoogleTask, deleteGoogleTask } from '@/ai/flows/google-tasks-flow';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/lib/utils';

interface GoogleTasksWidgetProps {
    settings: StoredSettings;
}

export function GoogleTasksWidget({ settings }: GoogleTasksWidgetProps) {
    const { toast } = useToast();
    const [googleAuthTokens] = useLocalStorage<GoogleAuthTokens | null>('googleAuthTokens', null);
    
    const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<GoogleTask[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isConfigured = !!googleAuthTokens?.access_token;
    const accessToken = googleAuthTokens?.access_token;

    const loadTaskLists = useCallback(async () => {
        if (!isConfigured || !accessToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fetchedLists = await fetchGoogleTaskLists(accessToken);
            setTaskLists(fetchedLists);
            if (fetchedLists.length > 0 && !selectedListId) {
                setSelectedListId(fetchedLists[0].id);
            }
        } catch (e: any) {
            setError(e.message || "Failed to fetch task lists.");
            toast({ variant: 'destructive', title: 'Error fetching Google Task Lists', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [isConfigured, accessToken, selectedListId, toast]);
    
    const loadTasks = useCallback(async () => {
        if (!selectedListId || !accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedTasks = await fetchTasksFromList(accessToken, selectedListId);
            setTasks(fetchedTasks.filter(t => t.status !== 'completed'));
        } catch(e: any) {
            setError(e.message || "Failed to fetch tasks.");
            toast({ variant: 'destructive', title: 'Error fetching Google Tasks', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedListId, accessToken, toast]);

    useEffect(() => {
        loadTaskLists();
    }, [loadTaskLists]);
    
    useEffect(() => {
        if (selectedListId) {
            loadTasks();
        }
    }, [selectedListId, loadTasks]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !selectedListId || !accessToken) return;

        setIsAdding(true);
        try {
            await createGoogleTask(accessToken, selectedListId, newTaskTitle.trim());
            toast({ title: "Task Added", description: `"${newTaskTitle}" was added.` });
            setNewTaskTitle("");
            loadTasks(); // Refresh list
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error adding task', description: e.message });
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleDeleteTask = async (taskId: string, taskTitle: string) => {
        if (!selectedListId || !accessToken) return;
        setIsDeleting(taskId);
        try {
            await deleteGoogleTask(accessToken, selectedListId, taskId);
            toast({ title: "Task Deleted", description: `"${taskTitle}" was deleted.` });
            setTasks(prev => prev.filter(t => t.id !== taskId)); // Optimistic update
        } catch(e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error deleting task', description: e.message });
        } finally {
            setIsDeleting(null);
        }
    }
    
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
                        <CheckCircle className="h-4 w-4" />
                        <span>Google Tasks</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-3 pt-0 min-h-0">
                 {!isConfigured ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-muted-foreground">
                        <p>Please connect your Google Account in the settings under the "Calendar" tab.</p>
                    </div>
                ) : error ? (
                    <div className="flex-grow flex items-center justify-center text-center text-xs text-destructive">
                        <AlertTriangle className="h-5 w-5 mr-2" /> {error}
                    </div>
                ) : (
                    <>
                        <Select value={selectedListId || ''} onValueChange={setSelectedListId}>
                            <SelectTrigger className={cn("h-8 text-xs mb-2", inputClasses)} disabled={isLoading}>
                                <SelectValue placeholder="Select a task list..." />
                            </SelectTrigger>
                            <SelectContent>
                                {taskLists.map(list => <SelectItem key={list.id} value={list.id}>{list.title}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <ScrollArea className="flex-grow pr-2 h-32">
                            {isLoading && !isAdding && !isDeleting ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
                                </div>
                            ) : tasks.length > 0 ? (
                                <ul className="space-y-1">
                                    {tasks.map(task => (
                                        <li key={task.id} className="flex items-center justify-between text-xs p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 group">
                                            <span className="truncate pr-2">{task.title}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id, task.title)} disabled={isDeleting === task.id}>
                                                {isDeleting === task.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <Trash2 className="h-3 w-3 text-destructive" />}
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center text-xs text-muted-foreground py-4">No tasks in this list.</div>
                            )}
                        </ScrollArea>
                        <form onSubmit={handleAddTask} className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                            <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Add a new task..."
                                className={cn("h-8 text-xs", inputClasses)}
                                disabled={!selectedListId || isLoading || isAdding}
                            />
                            <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!selectedListId || isLoading || isAdding || !newTaskTitle.trim()}>
                                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
