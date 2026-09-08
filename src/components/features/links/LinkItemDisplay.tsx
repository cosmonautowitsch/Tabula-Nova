
"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, Edit3, Trash2, Globe, Tag, Pencil } from 'lucide-react';
import type { LinkItem as LinkItemType } from '@/types';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';


interface LinkItemDisplayProps {
  link: LinkItemType;
  folderId: string;
  onEditLink: (link: LinkItemType, folderId: string) => void;
  onDeleteLink: (linkId: string, folderId: string) => void;
  isEditingTags: boolean;
  tagInput: string;
  setTagInput: (value: string) => void;
  onStartEditingTags: (link: LinkItemType) => void;
  onSaveTags: (linkId: string) => void;
  layout?: 'grid' | 'list' | 'masonry' | 'carousel' | 'wallboard';
}

export function LinkItemDisplay({
  link,
  folderId,
  onEditLink,
  onDeleteLink,
  isEditingTags,
  tagInput,
  setTagInput,
  onStartEditingTags,
  onSaveTags,
  layout,
}: LinkItemDisplayProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const effectiveFaviconUrl = React.useMemo(() => {
    if (link.favicon) return link.favicon;
    try {
      return `https://icon.horse/icon/${new URL(link.url).hostname}`;
    } catch (e) {
      try {
        return `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=64`;
      } catch (e2) {
        return '';
      }
    }
  }, [link.favicon, link.url]);

  const handleInteraction = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('input, button, a[data-menu-item]')) {
        return;
    }
    event.preventDefault();
    if (event.button === 0 && !isMenuOpen) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(true);
  };

  const handleEdit = () => {
    onEditLink(link, folderId);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    onDeleteLink(link.id, folderId);
    setIsMenuOpen(false);
  };

  const handleOpenInNewTab = () => {
    if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
    setIsMenuOpen(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSaveTags(link.id);
    }
    if (e.key === 'Escape') {
      // Find a way to cancel editing without saving
    }
  };

  const containerClasses = cn(
    "flex flex-col items-center p-2 w-full h-full cursor-pointer hover:bg-muted/50 rounded-lg transition-all group",
    layout === 'wallboard' ? 'bg-card shadow-sm border' : 'w-28 h-28',
  );

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <div
          onClick={handleInteraction}
          onContextMenu={handleContextMenu}
          className={containerClasses}
        >
          <div className="w-12 h-12 mb-2 flex items-center justify-center flex-shrink-0">
            <Image
              src={effectiveFaviconUrl}
              alt={`${link.title} favicon`}
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg"
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('google.com')) {
                  try {
                    target.src = `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=64`;
                  } catch {
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.fallback-icon');
                    fallback?.removeAttribute('hidden');
                  }
                } else {
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.fallback-icon');
                  fallback?.removeAttribute('hidden');
                }
              }}
            />
            <div hidden className="fallback-icon">
              <Globe className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>
          <span className="text-xs text-center line-clamp-2 text-foreground mb-auto">
            {link.title}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem onClick={handleOpenInNewTab} data-menu-item>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Open in new tab</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEdit} data-menu-item>
          <Edit3 className="mr-2 h-4 w-4" />
          <span>Edit Link</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive-foreground focus:bg-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground" data-menu-item>
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete Link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


interface LinkListItemDisplayProps {
  link: LinkItemType;
  folderId: string;
  onEditLink: (link: LinkItemType, folderId: string) => void;
  onDeleteLink: (linkId: string, folderId: string) => void;
}

export function LinkListItemDisplay({ link, folderId, onEditLink, onDeleteLink }: LinkListItemDisplayProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleOpenLink = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };
  
  const handleEdit = () => onEditLink(link, folderId);
  const handleDelete = () => onDeleteLink(link.id, folderId);

  return (
    <div 
        onContextMenu={(e) => { e.preventDefault(); setIsMenuOpen(true); }} 
        className="w-full"
    >
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
            <div className="flex items-center p-2 rounded-md hover:bg-muted transition-colors cursor-pointer justify-between w-full">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{link.title}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenLink}>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onClick={handleOpenLink}>
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Open in new tab</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
                <Edit3 className="mr-2 h-4 w-4" />
                <span>Edit Link</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive-foreground focus:bg-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Link</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
