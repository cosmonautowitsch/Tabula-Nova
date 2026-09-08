
"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { NoteItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import useLocalStorage from '@/hooks/useLocalStorage';
import { StoredSettings } from '@/types';
import { isColorDark } from '@/lib/utils';

interface NotesWidgetProps {
  note: NoteItem;
  onNoteChange: (noteId: string, newContent: Partial<NoteItem>) => void;
}

export function NotesWidget({ note, onNoteChange }: NotesWidgetProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [storedSettings] = useLocalStorage<StoredSettings>('tabulaNovaSettings', {} as StoredSettings);

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note]);

  const handleTitleBlur = () => {
    if (title !== note.title) {
      onNoteChange(note.id, { title });
    }
  };

  const handleContentBlur = () => {
    if (content !== note.content) {
      onNoteChange(note.id, { content });
    }
  };
  
  const isDarkEffectiveBg = storedSettings.background?.type === 'image' || (storedSettings.background?.type === 'color' && isColorDark(storedSettings.background.value));
  const cardClasses = isDarkEffectiveBg 
    ? "bg-black/20 text-white border-white/20" 
    : "bg-white/50 text-neutral-800";
    
  const inputClasses = isDarkEffectiveBg 
    ? "bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-gray-400" 
    : "bg-transparent border-none focus-visible:ring-0 text-neutral-800";

  return (
    <Card className={cn("w-full h-full flex flex-col", cardClasses)}>
      <CardHeader className="flex-shrink-0 p-3">
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Note Title"
          className={cn("text-sm font-medium border-0 focus-visible:ring-offset-0", inputClasses)}
        />
      </CardHeader>
      <CardContent className="flex-grow p-3 pt-0">
        <Textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleContentBlur}
          placeholder="Type your note here..."
          className={cn("h-full resize-none text-xs leading-relaxed", inputClasses)}
        />
      </CardContent>
    </Card>
  );
}
