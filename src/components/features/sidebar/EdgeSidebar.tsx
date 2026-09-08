
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, History, Bookmark, Download, Puzzle, Settings as SettingsIcon, LayoutDashboard, CalendarClock, Bug } from 'lucide-react';

const SIDEBAR_WIDTH_PX = 72; 
const ACTIVATION_WIDTH_PX = 15;
const CLOSE_DELAY_MS = 250;

interface EdgeSidebarProps {
  onOpenSettings: () => void;
  currentLayout: 'standard' | 'wide';
  onOpenDateTimeDetails: () => void;
  onOpenDebugPanel: () => void;
}

interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  href?: string; 
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon: Icon, label, onClick, href }) => {
  const content = (
    <Button
      variant="ghost"
      size="icon"
      className="w-12 h-12 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
      onClick={onClick}
      aria-label={label}
      asChild={!!href}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="left" className="bg-black text-white border-gray-700">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export function EdgeSidebar({ onOpenSettings, currentLayout, onOpenDateTimeDetails, onOpenDebugPanel }: EdgeSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const openSidebar = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const requestCloseSidebar = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, CLOSE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const browserFeatures = [
    { icon: Star, label: "Most Used Pages", info: "Functionality to be implemented" },
    { icon: History, label: "Browser History", info: "Functionality to be implemented" },
    { icon: Bookmark, label: "Bookmarks", info: "Functionality to be implemented" },
    { icon: Download, label: "Downloads", info: "Functionality to be implemented" },
    { icon: Puzzle, label: "Extensions", info: "Functionality to be implemented" },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      {/* Activation Zone */}
      <div
        onMouseEnter={openSidebar}
        className="fixed top-0 right-0 h-full z-40"
        style={{ width: `${ACTIVATION_WIDTH_PX}px` }}
      />

      <aside
        className={cn(
          'fixed top-0 right-0 h-full bg-black text-white shadow-xl transition-transform duration-300 ease-in-out z-50 transform flex flex-col items-center py-6 px-0 space-y-3',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: `${SIDEBAR_WIDTH_PX}px` }}
        onMouseEnter={openSidebar}
        onMouseLeave={requestCloseSidebar}
      >
        {browserFeatures.map((feature) => (
          <SidebarButton
            key={feature.label}
            icon={feature.icon}
            label={feature.label}
            onClick={() => console.log(feature.info || `${feature.label} clicked`)} 
          />
        ))}

        <Separator className="bg-gray-600 w-3/4 my-2" />

        <SidebarButton
          icon={SettingsIcon}
          label="Tabula Nova Settings"
          onClick={onOpenSettings}
        />
        <SidebarButton
          icon={CalendarClock}
          label="Calendar & Event Details"
          onClick={onOpenDateTimeDetails}
        />
        <SidebarButton
          icon={Bug}
          label="Debug Panel"
          onClick={onOpenDebugPanel}
        />
      </aside>
    </TooltipProvider>
  );
}
