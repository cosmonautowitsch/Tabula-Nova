
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Folder } from '@/types';
import { cn } from '@/lib/utils';
// import { ImageIcon } from 'lucide-react'; // Or any other generic icon

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderName: string, iconId: string | null, folderIdToEdit?: string) => void;
  existingFolder?: Folder | null;
}

// This list remains for the selection logic, but icons won't be rendered from SVG sprite
const availableIcons: { id: string; name: string }[] = [
  { id: 'icon-home', name: 'Home' },
  { id: 'icon-news', name: 'News' },
  { id: 'icon-musik', name: 'Music' },
  { id: 'icon-film', name: 'Film' },
  { id: 'icon-arbeit', name: 'Work' },
  { id: 'icon-unterhaltung', name: 'Entertainment' },
  { id: 'icon-shopping', name: 'Shopping' },
  { id: 'icon-bilder', name: 'Images' },
  { id: 'icon-sport', name: 'Sport' },
  { id: 'icon-pause', name: 'Pause' },
  { id: 'icon-diverses', name: 'Misc' },
  { id: 'icon-info', name: 'Info' },
  { id: 'icon-code', name: 'Code' },
  { id: 'icon-platzhalter', name: 'Placeholder' },
];

export function AddFolderModal({ isOpen, onClose, onSave, existingFolder }: AddFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingFolder) {
        setFolderName(existingFolder.name);
        setSelectedIconId(existingFolder.iconId || null);
      } else {
        setFolderName('');
        setSelectedIconId(null);
      }
    }
  }, [existingFolder, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onSave(folderName.trim(), selectedIconId, existingFolder?.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {existingFolder ? 'Edit Folder' : 'Add New Folder'}
          </DialogTitle>
          <DialogDescription>
            {existingFolder ? `Update the name and icon for "${existingFolder.name}".` : "Create a new folder to organize your links. You can also select an icon."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="folder-icon" className="mb-2 block">Icon (Optional)</Label>
              <div className="grid grid-cols-5 gap-2 p-2 border rounded-md bg-muted/30 max-h-32 overflow-y-auto">
                {availableIcons.map((icon) => (
                  <button
                    type="button"
                    key={icon.id}
                    title={icon.name}
                    onClick={() => setSelectedIconId(icon.id === selectedIconId ? null : icon.id)}
                    className={cn(
                      "p-2 rounded-md flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors text-xs h-10 w-10 border",
                      selectedIconId === icon.id ? "ring-2 ring-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted"
                    )}
                  >
                    {/* Placeholder: Displaying first 3 letters of icon name */}
                    {icon.name.substring(0, 3)}
                    {/* Alternatively, use a generic Lucide icon as placeholder:
                    <ImageIcon className="h-5 w-5 text-muted-foreground" /> 
                    */}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-name" className="text-right col-span-1">
                Name
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Favorites, Work, News"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {existingFolder ? 'Save Changes' : 'Add Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
