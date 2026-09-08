// src/components/features/sidebar/WidgetDock.tsx
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarClock, Mail, Notebook, CheckSquare } from 'lucide-react';

interface WidgetDockProps {
  position: 'left' | 'right';
  onOpenCalendar: () => void;
}

const dockWidgets = [
  { id: 'calendar', icon: CalendarClock, label: "Calendar & Events", action: 'onOpenCalendar', color: "text-red-500" },
  { id: 'mail', icon: Mail, label: "Mail", action: 'onOpenMail', color: "text-blue-500" },
  { id: 'notes', icon: Notebook, label: "Notes", action: 'onOpenNotes', color: "text-yellow-500" },
  { id: 'tasks', icon: CheckSquare, label: "Tasks", action: 'onOpenTasks', color: "text-green-500" },
];

const WidgetDockButton: React.FC<{ icon: React.ElementType, label: string, onClick?: () => void, colorClass: string }> = ({ icon: Icon, label, onClick, colorClass }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          onClick={onClick}
          aria-label={label}
        >
          <Icon className={cn("h-7 w-7", colorClass)} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={label === 'right' ? 'left' : 'right'} className="bg-black text-white border-gray-700">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};


export function WidgetDock({ position, onOpenCalendar }: WidgetDockProps) {
  const getAction = (actionName: string) => {
    switch (actionName) {
      case 'onOpenCalendar':
        return onOpenCalendar;
      // Add other actions here as they are implemented
      default:
        return () => console.log(`${actionName} not implemented`);
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'fixed top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-black/30 dark:bg-white/10 backdrop-blur-md rounded-2xl p-1 z-50 shadow-lg border border-white/10 dark:border-black/10',
          position === 'left' ? 'left-1' : 'right-1'
        )}
      >
        {dockWidgets.map((widget) => (
          <WidgetDockButton
            key={widget.id}
            icon={widget.icon}
            label={widget.label}
            onClick={getAction(widget.action)}
            colorClass={widget.color}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
