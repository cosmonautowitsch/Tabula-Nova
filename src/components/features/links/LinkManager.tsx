
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Folder as FolderType, LinkItem as LinkItemType, StoredSettings } from '@/types';
import { PlusCircle, Trash2, Edit3, LayoutGrid, List, Columns, Square, Tv2 } from 'lucide-react';
import { AddFolderModal } from './AddFolderModal';
import { AddLinkModal } from './AddLinkModal';
import { FolderDisplay } from './FolderDisplay';
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { isColorDark } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';

interface LinkManagerProps {
  storedSettings: StoredSettings;
  setStoredSettings: (value: StoredSettings | ((prev: StoredSettings) => StoredSettings)) => void;
  appLayout: 'standard' | 'wide';
  onReorderLinksInFolder: (folderId: string, newLinks: LinkItemType[]) => void;
  searchQuery: string;
}

interface SortableFolderTabItemProps {
  folder: FolderType;
  isActive: boolean;
  textColorClass: string;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  contextMenuFolderId: string | null;
  setContextMenuFolderId: (id: string | null) => void;
}

function SortableFolderTabItem({
  folder,
  isActive,
  textColorClass,
  onActivate,
  onEdit,
  onDelete,
  contextMenuFolderId,
  setContextMenuFolderId,
}: SortableFolderTabItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setContextMenuFolderId(null);
    }
  };

  const handleButtonContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuFolderId(folder.id);
    onActivate();
  };

  const handleButtonClick = () => {
    if (contextMenuFolderId !== folder.id) {
        onActivate();
    }
  };
  

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative shrink-0", isDragging && "cursor-grabbing")}
      {...attributes}
    >
      <DropdownMenu open={contextMenuFolderId === folder.id} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            {...listeners}
            onClick={handleButtonClick}
            onContextMenu={handleButtonContextMenu}
            className={cn(
              "select-none px-3 py-1 rounded-md text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-150 ease-in-out cursor-grab",
              isActive
                ? 'bg-muted text-muted-foreground hover:bg-muted/80 font-semibold shadow-sm'
                : `bg-secondary/30 ${textColorClass} hover:bg-secondary/60 hover:shadow-sm`,
            )}
            aria-label={`Folder ${folder.name}`}
          >
            <span>{folder.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-40"
        >
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive-foreground focus:bg-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


export function LinkManager({
  storedSettings,
  setStoredSettings,
  appLayout,
  onReorderLinksInFolder,
  searchQuery,
}: LinkManagerProps) {
  const { folders, background: currentBg } = storedSettings;

  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItemType | null>(null);
  const [targetFolderIdForNewLink, setTargetFolderIdForNewLink] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const [contextMenuFolderId, setContextMenuFolderId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, 
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (folders.length > 0) {
      const currentActiveFolderExists = folders.some(f => f.id === activeFolderId);
      if (!activeFolderId || !currentActiveFolderExists) {
        setActiveFolderId(folders[0].id);
      }
    } else {
      setActiveFolderId(null);
    }
  }, [folders, activeFolderId]);

  const saveFolders = (updatedFolders: FolderType[]) => {
    setStoredSettings(prev => ({ ...prev, folders: updatedFolders }));
  };

  const handleAddOrEditFolder = (folderName: string, iconId: string | null, folderIdToEdit?: string) => {
    let updatedFolders;
    if (folderIdToEdit) {
      updatedFolders = folders.map(f =>
        f.id === folderIdToEdit ? { ...f, name: folderName, iconId: iconId || undefined } : f
      );
    } else {
      const newFolder: FolderType = { id: uuidv4(), name: folderName, links: [], isOpen: true, iconId: iconId || undefined, layout: 'grid' };
      updatedFolders = [...folders, newFolder];
      setActiveFolderId(newFolder.id);
    }
    saveFolders(updatedFolders);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;

    if (window.confirm(`Are you sure you want to delete the folder "${folderToDelete.name}" and all its links?`)) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      saveFolders(updatedFolders);
      if (activeFolderId === folderId) {
        setActiveFolderId(updatedFolders.length > 0 ? updatedFolders[0].id : null);
      }
    }
  };

  const handleAddOrEditLink = (linkData: Omit<LinkItemType, 'id'>, linkIdToEdit?: string) => {
    const folderId = editingLink ? findFolderIdForLink(editingLink.id) : targetFolderIdForNewLink;
    if (!folderId) return;

    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        let updatedLinks: LinkItemType[];
        if (linkIdToEdit) {
          updatedLinks = folder.links.map(l =>
            l.id === linkIdToEdit ? { ...l, ...linkData, favicon: linkData.favicon || undefined, tags: linkData.tags || [] } : l
          );
        } else {
          const newLink: LinkItemType = { ...linkData, id: uuidv4(), favicon: linkData.favicon || undefined, tags: linkData.tags || [] };
          updatedLinks = [...folder.links, newLink];
        }
        return { ...folder, links: updatedLinks };
      }
      return folder;
    });
    saveFolders(updatedFolders);
    setEditingLink(null);
    setTargetFolderIdForNewLink(null);
  };

  const handleDeleteLink = (linkId: string, folderId: string) => {
    if (!window.confirm(`Are you sure you want to delete this link?`)) return;
    const updatedFolders = folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, links: folder.links.filter(l => l.id !== linkId) };
        }
        return folder;
      });
    saveFolders(updatedFolders);
  };

  const findFolderIdForLink = (linkId: string): string | null => {
    for (const folder of folders) {
      if (folder.links.some(link => link.id === linkId)) {
        return folder.id;
      }
    }
    return null;
  };
  
  const handleStartEditingTags = (link: LinkItemType) => {
    setEditingTagsFor(link.id);
    setTagInput(link.tags?.join(', ') ?? '');
  };

  const saveTags = (linkId: string) => {
    const folderId = findFolderIdForLink(linkId);
    if (!folderId) return;
  
    const newTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
  
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const updatedLinks = folder.links.map(link => 
          link.id === linkId ? { ...link, tags: newTags } : link
        );
        return { ...folder, links: updatedLinks };
      }
      return folder;
    });
  
    saveFolders(updatedFolders);
    setEditingTagsFor(null);
    setTagInput('');
  };

  const openAddFolderModal = (folderToEdit?: FolderType) => {
    setEditingFolder(folderToEdit || null);
    setIsAddFolderModalOpen(true);
  };

  const openAddLinkModal = (folderId: string, link?: LinkItemType) => {
    setTargetFolderIdForNewLink(folderId);
    setEditingLink(link || null);
    setIsAddLinkModalOpen(true);
  };

  const handleFolderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = folders.findIndex((f) => f.id === active.id);
      const newIndex = folders.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFolders = arrayMove(folders, oldIndex, newIndex);
        saveFolders(newFolders);
      }
    }
  };

  const targetFolderForModal = targetFolderIdForNewLink ? folders.find(f => f.id === targetFolderIdForNewLink) : undefined;
  
  const activeFolder = useMemo(() => {
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) return null;
    if (!searchQuery.trim()) return folder;

    const lowerCaseQuery = searchQuery.toLowerCase();
    const filteredLinks = folder.links.filter(link => {
      const inTitle = link.title.toLowerCase().includes(lowerCaseQuery);
      const inUrl = link.url.toLowerCase().includes(lowerCaseQuery);
      const inTags = link.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery)) ?? false;
      return inTitle || inUrl || inTags;
    });

    return { ...folder, links: filteredLinks };
  }, [folders, activeFolderId, searchQuery]);

  const handleLayoutChange = (newLayout: 'grid' | 'list' | 'masonry' | 'carousel' | 'wallboard') => {
    if (!activeFolderId) return;
    const updatedFolders = folders.map(f =>
      f.id === activeFolderId ? { ...f, layout: newLayout } : f
    );
    saveFolders(updatedFolders);
  };

  const isEffectiveBgDark = currentBg.type === 'image' || (currentBg.type === 'color' && isColorDark(currentBg.value));
  const textColorClass = isEffectiveBgDark ? 'text-white' : 'text-neutral-700';
  
  const layoutIcons = {
    grid: <LayoutGrid className="h-4 w-4" />,
    list: <List className="h-4 w-4" />,
    masonry: <Columns className="h-4 w-4" />,
    carousel: <Square className="h-4 w-4" />,
    wallboard: <Tv2 className="h-4 w-4" />,
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="flex items-center space-x-2">
        <div className="flex-grow overflow-x-auto py-1 flex items-center">
            <div className="flex items-center space-x-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFolderDragEnd}>
                  <SortableContext items={folders.map(f => f.id)} strategy={horizontalListSortingStrategy}>
                  {folders.map((folder) => (
                      <SortableFolderTabItem
                      key={folder.id}
                      folder={folder}
                      isActive={folder.id === activeFolderId}
                      textColorClass={textColorClass}
                      onActivate={() => setActiveFolderId(folder.id)}
                      onEdit={() => openAddFolderModal(folder)}
                      onDelete={() => handleDeleteFolder(folder.id)}
                      contextMenuFolderId={contextMenuFolderId}
                      setContextMenuFolderId={setContextMenuFolderId}
                      />
                  ))}
                  </SortableContext>
              </DndContext>
              <button
                type="button"
                onClick={() => openAddFolderModal()}
                aria-label="Add new folder"
                className={cn(
                  "h-8 w-8 flex items-center justify-center shrink-0 ml-2 rounded-md",
                  "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
                  textColorClass
                )}
              >
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>
        </div>
        {activeFolder && (
          <div className="shrink-0">
             <Select value={activeFolder.layout || 'grid'} onValueChange={(v) => handleLayoutChange(v as any)}>
              <SelectTrigger className={cn("w-auto h-8 px-2 space-x-2", textColorClass)} aria-label="Folder layout">
                 {layoutIcons[activeFolder.layout || 'grid']}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid"><div className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Grid</div></SelectItem>
                <SelectItem value="list"><div className="flex items-center gap-2"><List className="h-4 w-4" /> List</div></SelectItem>
                <SelectItem value="masonry"><div className="flex items-center gap-2"><Columns className="h-4 w-4" /> Masonry</div></SelectItem>
                <SelectItem value="carousel"><div className="flex items-center gap-2"><Square className="h-4 w-4" /> Carousel</div></SelectItem>
                <SelectItem value="wallboard"><div className="flex items-center gap-2"><Tv2 className="h-4 w-4" /> Wallboard</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <div className="w-full mt-2">
        {folders.length === 0 ? (
          <div className="min-h-[200px] flex flex-col justify-center items-center text-center text-muted-foreground p-10 rounded-lg bg-muted/20">
            <h2 className="text-2xl font-semibold mb-2">Start organizing your links!</h2>
            <p className="mb-4">Click the "+" icon in the bar above to add your first folder.</p>
            <Image src="https://placehold.co/300x200.png" data-ai-hint="organize links" alt="Empty state illustration - Add folders and links" width={300} height={200} className="mx-auto rounded-lg shadow-md" />
          </div>
        ) : (
          activeFolder && (
            <FolderDisplay
              key={activeFolder.id}
              folder={activeFolder}
              onAddLink={(folderId) => openAddLinkModal(folderId)}
              onEditLink={(link, folderId) => openAddLinkModal(folderId, link)}
              onDeleteLink={handleDeleteLink}
              storedSettings={storedSettings}
              appLayout={appLayout}
              onReorderLinks={onReorderLinksInFolder}
              isFiltered={searchQuery.length > 0}
              editingTagsFor={editingTagsFor}
              tagInput={tagInput}
              setTagInput={setTagInput}
              onStartEditingTags={handleStartEditingTags}
              saveTags={saveTags}
            />
          )
        )}
      </div>

      <AddFolderModal
        isOpen={isAddFolderModalOpen}
        onClose={() => { setIsAddFolderModalOpen(false); setEditingFolder(null); }}
        onSave={handleAddOrEditFolder}
        existingFolder={editingFolder}
      />

      <AddLinkModal
        isOpen={isAddLinkModalOpen}
        onClose={() => { setIsAddLinkModalOpen(false); setEditingLink(null); setTargetFolderIdForNewLink(null); }}
        onSave={handleAddOrEditLink}
        existingLink={editingLink}
        folderName={targetFolderForModal?.name}
      />
    </div>
  );
}
