import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmojiSelectorProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const emojiCategories = {
  recent: {
    name: "Recent",
    icon: "⏱️",
    emojis: [] as string[], // Will be populated from localStorage
  },
  smileys: {
    name: "Smileys & People",
    icon: "😊",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
      "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛",
      "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄",
      "😬", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒"
    ]
  },
  gestures: {
    name: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟",
      "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲",
      "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿"
    ]
  },
  objects: {
    name: "Objects",
    icon: "🎁",
    emojis: [
      "💼", "📱", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾",
      "📞", "☎️", "📧", "📨", "📩", "📤", "📥", "📮",
      "🗳️", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🔍", "🔎",
      "📝", "📄", "📃", "📑", "📊", "📈", "📉", "🗒️",
      "🗓️", "📅", "📆", "🗑️", "📇", "🗃️", "🗄️", "📋"
    ]
  },
  symbols: {
    name: "Symbols",
    icon: "💯",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️",
      "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈",
      "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐"
    ]
  }
};

export function EmojiSelector({ onEmojiSelect, className }: EmojiSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("smileys");

  // Get recent emojis from localStorage
  const recentEmojis = useMemo(() => {
    try {
      const recent = localStorage.getItem("recent-emojis");
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }, []);

  // Update recent emojis in localStorage
  const updateRecentEmojis = (emoji: string) => {
    try {
      let recent = [...recentEmojis];
      // Remove if already exists
      recent = recent.filter(e => e !== emoji);
      // Add to beginning
      recent.unshift(emoji);
      // Keep only last 32
      recent = recent.slice(0, 32);
      localStorage.setItem("recent-emojis", JSON.stringify(recent));
    } catch {
      // Silently fail if localStorage is not available
    }
  };

  // Filter emojis based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        ...emojiCategories,
        recent: { ...emojiCategories.recent, emojis: recentEmojis }
      };
    }

    const query = searchQuery.toLowerCase();
    const filtered = Object.entries(emojiCategories).reduce((acc, [key, category]) => {
      if (key === "recent") {
        acc[key] = { ...category, emojis: recentEmojis };
      } else {
        // Simple emoji filtering - in a real app, you'd want emoji names/descriptions
        acc[key] = { ...category, emojis: category.emojis };
      }
      return acc;
    }, {} as typeof emojiCategories);

    return filtered;
  }, [searchQuery, recentEmojis]);

  const handleEmojiClick = (emoji: string) => {
    updateRecentEmojis(emoji);
    onEmojiSelect(emoji);
  };

  return (
    <div className={cn(
      "w-72 h-80 glass-dropdown border-border/40",
      "flex flex-col overflow-hidden shadow-xl",
      className
    )}>
      {/* Search Header */}
      <div className="p-3 border-b border-border/20 bg-background/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs glass-input border-border/30 focus:border-primary/40"
          />
        </div>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Category Tabs */}
        <TabsList className="grid grid-cols-5 gap-0.5 p-1.5 bg-background/30 h-auto border-b border-border/20">
          {recentEmojis.length > 0 && (
            <TabsTrigger
              value="recent"
              className={cn(
                "h-7 w-full text-xs p-0 data-[state=active]:bg-primary/15 data-[state=active]:text-primary",
                "transition-all duration-200 hover:bg-accent/50 rounded-md"
              )}
              title="Recent"
            >
              <Clock className="h-3.5 w-3.5" />
            </TabsTrigger>
          )}
          {Object.entries(emojiCategories).map(([key, category]) => {
            if (key === "recent") return null;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "h-7 w-full text-sm p-0 data-[state=active]:bg-primary/15 data-[state=active]:text-primary",
                  "transition-all duration-200 hover:bg-accent/50 rounded-md"
                )}
                title={category.name}
              >
                {category.icon}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Emoji Grid */}
        <div className="flex-1 min-h-0 p-2">
          {recentEmojis.length > 0 && (
            <TabsContent value="recent" className="mt-0 h-full">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-8 gap-1">
                  {recentEmojis.slice(0, 24).map((emoji: string, index: number) => (
                    <Button
                      key={index}
                      onClick={() => handleEmojiClick(emoji)}
                      variant="ghost"
                      className={cn(
                        "h-7 w-7 p-0 text-base rounded-md",
                        "hover:bg-accent/60 transition-all duration-150",
                        "hover:scale-105 active:scale-95"
                      )}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {Object.entries(emojiCategories).map(([key, category]) => {
            if (key === "recent") return null;
            return (
              <TabsContent key={key} value={key} className="mt-0 h-full">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-8 gap-1">
                    {category.emojis.map((emoji, index) => (
                      <Button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        variant="ghost"
                        className={cn(
                          "h-7 w-7 p-0 text-base rounded-md",
                          "hover:bg-accent/60 transition-all duration-150",
                          "hover:scale-105 active:scale-95"
                        )}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
