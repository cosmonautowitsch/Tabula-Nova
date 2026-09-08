
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from 'lucide-react';
import type { LinkItem } from '@/types';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (link: Omit<LinkItem, 'id'>, linkId?: string) => void;
  existingLink?: LinkItem | null;
  folderName?: string;
}

export function AddLinkModal({ isOpen, onClose, onSave, existingLink, folderName }: AddLinkModalProps) {
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingLink) {
        setLinkTitle(existingLink.title);
        setLinkUrl(existingLink.url);
        setFaviconUrl(existingLink.favicon || '');
        setTags(existingLink.tags || []);
      } else {
        setLinkTitle('');
        setLinkUrl('');
        setFaviconUrl('');
        setTags([]);
      }
      setTagInput('');
    }
  }, [existingLink, isOpen]);

  const handleTagAdd = () => {
    const cleanTag = tagInput.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkTitle.trim() && linkUrl.trim()) {
      if (!linkUrl.match(/^https?:\/\/.+/)) {
        alert("Please enter a valid URL for the link (starting with http:// or https://).");
        return;
      }
      if (faviconUrl.trim() && !faviconUrl.match(/^https?:\/\/.+/)) {
        alert("Please enter a valid URL for the favicon (starting with http:// or https://), or leave it empty.");
        return;
      }
      onSave({ title: linkTitle.trim(), url: linkUrl.trim(), favicon: faviconUrl.trim() || undefined, tags }, existingLink?.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {existingLink ? 'Edit Link' : `Add New Link${folderName ? ` to ${folderName}` : ''}`}
          </DialogTitle>
           <DialogDescription>
            {existingLink ? `Update the details for "${existingLink.title}".` : "Enter the title, URL, and optional tags for your new link."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g., Google Search"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://www.google.com"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="favicon-url">Favicon URL <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input
                id="favicon-url"
                type="url"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="Auto-detects if empty"
              />
            </div>
            {/* Tag Management UI */}
            <div className="space-y-2">
              <Label htmlFor="link-tags">Tags</Label>
              <div className="flex gap-2 flex-wrap p-2 border rounded-md min-h-[40px] bg-muted/30">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => handleTagRemove(tag)} className="rounded-full hover:bg-destructive/20 p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                id="link-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd(); } }}
                placeholder="Add a tag and press Enter"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {existingLink ? 'Save Changes' : 'Add Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
