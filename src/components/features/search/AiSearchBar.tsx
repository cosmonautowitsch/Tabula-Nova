
"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { chatGptSearch, type ChatGptSearchInput, type ChatGptSearchOutput } from '@/ai/flows/chat-gpt-search';

const SEARCH_ENGINES: Record<string, string> = {
  ai_assistant: 'ai_assistant',
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
  you: "https://you.com/search?q=",
};

interface AiSearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function AiSearchBar({ searchQuery, onSearchQueryChange }: AiSearchBarProps) {
  const [searchEngine, setSearchEngine] = useState('ai_assistant');
  const [searchResult, setSearchResult] = useState<ChatGptSearchOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    // Do not filter favorites when submitting the form, only on AI or web search
    if (searchEngine === 'ai_assistant') {
      setIsLoading(true);
      setError(null);
      setSearchResult(null);
      try {
        const input: ChatGptSearchInput = { query: searchQuery.trim() };
        const result = await chatGptSearch(input);
        setSearchResult(result);
      } catch (err: any) {
        console.error("AI Search Error:", err);
        setError(err.message || "An error occurred while searching.");
      } finally {
        setIsLoading(false);
      }
    } else {
      const searchUrl = SEARCH_ENGINES[searchEngine] + encodeURIComponent(searchQuery.trim());
      window.open(searchUrl, "_blank", "noopener,noreferrer");
    }
  };

    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <form onSubmit={handleSearch} className="w-full">
          <div className="flex items-center space-x-0 w-full shadow-sm rounded-full bg-background border border-border">
            <Select value={searchEngine} onValueChange={setSearchEngine}>
              <SelectTrigger
                className="w-auto pl-4 pr-2 shrink-0 rounded-l-full rounded-r-none border-0 focus:ring-0 focus:ring-offset-0 bg-background h-10"
                aria-label="Select search engine"
              >
                <SelectValue asChild>
                  {searchEngine === 'ai_assistant' ? <Sparkles className="h-4 w-4 text-accent" /> : <Search className="h-4 w-4 text-muted-foreground"/>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai_assistant">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" /> AI/Filter
                  </div>
                </SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                <SelectItem value="bing">Bing</SelectItem>
                <SelectItem value="you">You.com</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={searchEngine === 'ai_assistant' ? 'Filter favorites or ask AI...' : 'Search the web...'}
              className="flex-grow min-w-0 rounded-none border-0 focus:ring-0 focus:ring-offset-0 h-10 bg-transparent"
              aria-label="Search Query"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !searchQuery.trim()}
              className="rounded-r-full rounded-l-none focus:ring-0 focus:ring-offset-0 bg-transparent hover:bg-muted/50 h-10 w-12"
              aria-label="Search button"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="sr-only">Search</span>
            </Button>
          </div>
        </form>
        {(isLoading || searchResult || error) && (
          <div className="mt-4 p-4 rounded-md bg-secondary/50 w-full shadow">
            {isLoading && !searchResult && !error && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
            {error && (
              <div className="text-destructive">
                <div className="flex items-center">
                   <AlertTriangle className="mr-2 h-5 w-5" />
                   <strong>Error:</strong>
                </div>
                <p className="text-sm ml-7">{error}</p>
              </div>
            )}
            {searchResult && !error && (
                <>
                <h3 className="text-md font-semibold text-foreground">AI Response:</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{searchResult.answer}</p>
                </>
              )}
          </div>
          )}
      </div>
    );
}
