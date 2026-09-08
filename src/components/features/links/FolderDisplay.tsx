
"use client";

import React from 'react';
import type { Folder as FolderType, LinkItem as LinkItemType, StoredSettings } from '@/types';
import { LinkItemDisplay, LinkListItemDisplay } from './LinkItemDisplay';
import { PlusCircle, ArrowDownUp, SearchX } from 'lucide-react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MasonryGrid } from './layouts/MasonryGrid';
import { Carousel } from './layouts/Carousel';
import { Wallboard } from './layouts/Wallboard';

interface SortableLinkItemProps {
  link: LinkItemType;
  folderId: string;
  onEditLink: (link: LinkItemType, folderId: string) => void;
  onDeleteLink: (linkId: string, folderId: string) => void;
  
  editingTagsFor: string | null;
  tagInput: string;
  setTagInput: (value: string) => void;
  onStartEditingTags: (link: LinkItemType) => void;
  saveTags: (linkId: string) => void;
  layout: 'grid' | 'list' | 'masonry' | 'carousel' | 'wallboard';
}

const SortableLinkItem = ({ 
    link, 
    folderId, 
    onEditLink, 
    onDeleteLink, 
    editingTagsFor, 
    tagInput, 
    setTagInput, 
    onStartEditingTags, 
    saveTags,
    layout
}: SortableLinkItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
    height: '100%', // Ensure the item fills its container in wallboard
  };

  const isGridLayout = layout === 'grid' || layout === 'masonry' || layout === 'carousel' || layout === 'wallboard';

  // For Wallboard, we might want a different display component entirely in the future
  // For now, it reuses LinkItemDisplay.
  const DisplayComponent = layout === 'list' ? LinkListItemDisplay : LinkItemDisplay;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab touch-manipulation h-full", 
        isDragging && isGridLayout && "bg-muted/20 rounded-xl",
        isDragging && layout === 'list' && "bg-muted/20 rounded-lg",
      )}
      data-testid={`sortable-link-${link.id}`}
    >
        <DisplayComponent
            link={link}
            folderId={folderId}
            onEditLink={onEditLink}
            onDeleteLink={onDeleteLink}
            // Pass tag editing props only to components that support it
            {...(DisplayComponent === LinkItemDisplay && {
              isEditingTags: editingTagsFor === link.id,
              tagInput: tagInput,
              setTagInput: setTagInput,
              onStartEditingTags: onStartEditingTags,
              onSaveTags: saveTags,
              layout: layout,
            })}
        />
    </div>
  );
};

interface FolderDisplayProps {
  folder: FolderType | null;
  onAddLink: (folderId: string) => void;
  onEditLink: (link: LinkItemType, folderId: string) => void;
  onDeleteLink: (linkId: string, folderId: string) => void;
  onReorderLinks: (folderId: string, newLinks: LinkItemType[]) => void;
  appLayout: 'standard' | 'wide';
  storedSettings: StoredSettings;
  isFiltered: boolean;
  
  editingTagsFor: string | null;
  tagInput: string;
  setTagInput: (value: string) => void;
  onStartEditingTags: (link: LinkItemType) => void;
  saveTags: (linkId: string) => void;
}

export function FolderDisplay({
  folder,
  onAddLink,
  onEditLink,
  onDeleteLink,
  onReorderLinks,
  appLayout,
  storedSettings,
  isFiltered,
  editingTagsFor,
  tagInput,
  setTagInput,
  onStartEditingTags,
  saveTags,
}: FolderDisplayProps) {
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{ x: number; y: number } | null>(null);
  
  const { linkContainerBackgroundColor, linkContainerBackgroundOpacity } = storedSettings;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const hexToRgba = (hex: string, opacity: number): string => {
    if (!hex) return `rgba(255, 255, 255, ${opacity})`;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const folderLayout = folder?.layout || 'grid';

  const containerStyle: React.CSSProperties = {
    padding: '1rem',
    borderRadius: 'var(--radius)',
    display: 'flex',
    flexDirection: 'column',
    height: (folderLayout === 'grid' || folderLayout === 'list') && appLayout === 'standard' 
      ? 'calc(5 * (112px + 8px))' 
      : 'auto',
  };
  
  if (linkContainerBackgroundColor && (linkContainerBackgroundOpacity ?? 0) > 0) {
    containerStyle.backgroundColor = hexToRgba(linkContainerBackgroundColor, linkContainerBackgroundOpacity ?? 0);
  }

  const handleDragEndLinks = (event: DragEndEvent) => {
    const { active, over } = event;
    if (folder && folder.links && active && over && active.id !== over.id) {
      const oldIndex = folder.links.findIndex((link) => link.id === active.id);
      const newIndex = folder.links.findIndex((link) => link.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newLinks = arrayMove(folder.links, oldIndex, newIndex);
        onReorderLinks(folder.id, newLinks);
      }
    }
  };

  const handleSortLinksAlphabetically = () => {
    if (folder && folder.links) {
      const sortedLinks = [...folder.links].sort((a, b) => a.title.localeCompare(b.title));
      onReorderLinks(folder.id, sortedLinks);
    }
    setContextMenuPosition(null);
  };

  const handleBackgroundContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-dndkit-draggable="true"]') || (event.target as HTMLElement).closest('input')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };
  
  if (!folder) {
    return (
      <div 
        className="w-full flex flex-col items-center justify-center text-muted-foreground rounded-lg p-4"
        style={containerStyle}
      >
        <p>No folder selected or folder does not exist.</p>
      </div>
    );
  }

  const renderContent = () => {
    const sortableItems = folder.links.map(link => (
      <SortableLinkItem
        key={link.id}
        link={link}
        folderId={folder.id}
        onEditLink={onEditLink}
        onDeleteLink={onDeleteLink}
        editingTagsFor={editingTagsFor}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onStartEditingTags={onStartEditingTags}
        saveTags={saveTags}
        layout={folderLayout}
      />
    ));

    switch (folderLayout) {
      case 'masonry':
        return <MasonryGrid>{sortableItems}</MasonryGrid>;
      case 'carousel':
        return <Carousel>{sortableItems}</Carousel>;
      case 'wallboard':
        return <Wallboard>{sortableItems}</Wallboard>;
      case 'list':
        return (
          <div className='flex flex-col gap-2'>
            {sortableItems}
          </div>
        );
      case 'grid':
      default:
        return (
          <div className='grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2 content-start'>
            {sortableItems}
          </div>
        );
    }
  }

  const MainWrapperComponent = folderLayout === 'grid' || folderLayout === 'list' ? ScrollArea : 'div';

  return (
    <>
      <div
        className="w-full h-full"
        onContextMenu={handleBackgroundContextMenu}
        onClick={() => setContextMenuPosition(null)}
      >
        <MainWrapperComponent style={containerStyle}>
          {folder.links.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLinks}>
                <SortableContext 
                  items={folder.links.map(link => link.id)} 
                  strategy={folderLayout === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
                >
                  {renderContent()}
                </SortableContext>
            </DndContext>
          ) : (
            <div className="flex-grow flex flex-col justify-center items-center text-center text-muted-foreground h-full min-h-[400px]">
              {isFiltered ? (
                 <>
                  <SearchX className="h-12 w-12 mb-4 text-muted-foreground/50" />
                  <p className="font-semibold">No links match your filter.</p>
                  <p className="text-xs mt-1">Try a different search term.</p>
                 </>
              ) : (
                <>
                  <p>This folder is empty.</p>
                  <p className="text-xs mt-1">Right-click on the background to add a link.</p>
                  <Image
                    src="https://placehold.co/300x150.png"
                    data-ai-hint="empty state folder"
                    alt="Empty folder illustration"
                    width={300}
                    height={150}
                    className="mx-auto rounded-lg shadow-md mt-4 opacity-70"
                  />
                </>
              )}
            </div>
          )}
        </MainWrapperComponent>
      </div>
      
      {contextMenuPosition && (
        <DropdownMenu open={!!contextMenuPosition} onOpenChange={(open) => !open && setContextMenuPosition(null)}>
          <DropdownMenuTrigger asChild>
            <div
              style={{
                position: 'fixed',
                top: contextMenuPosition.y,
                left: contextMenuPosition.x,
              }}
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="w-56" 
          >
            <DropdownMenuItem onClick={() => { onAddLink(folder.id); setContextMenuPosition(null); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Add Link</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSortLinksAlphabetically} disabled={!folder || folder.links.length === 0}>
              <ArrowDownUp className="mr-2 h-4 w-4" />
              <span>Sort links alphabetically</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
