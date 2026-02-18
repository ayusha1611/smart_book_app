"use client";

import { useRef } from "react";
import AddBookmarkForm from "./AddBookmarkForm";
import BookmarkList from "./BookmarkList";
import LogoutButton from "./LogoutButton";

interface Bookmark {
  id: string; url: string; title: string; created_at: string; user_id: string;
}

interface Props {
  user: { id: string; name: string; avatar: string | null };
  initialBookmarks: Bookmark[];
}

export default function BookmarkDashboard({ user, initialBookmarks }: Props) {
  // Use a ref-based callback so BookmarkList can receive new bookmarks
  // from AddBookmarkForm WITHOUT BookmarkList re-rendering from prop changes
  const addToListRef = useRef<((b: Bookmark) => void) | null>(null);

  const handleOptimisticAdd = (bookmark: Bookmark) => {
    addToListRef.current?.(bookmark);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(ellipse 60% 50% at 100% 0%, rgba(196,97,43,0.08) 0%, transparent 60%)"
      }}/>

      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur-sm border-b border-cream">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">◈</span>
            <span className="font-display font-semibold text-lg tracking-tight">Marks</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {user.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full border border-cream"/>
              )}
              <span className="text-sm text-muted font-body">{user.name.split(" ")[0]}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-xs text-accent uppercase tracking-[0.2em] mb-1">Your collection</p>
          <h2 className="font-display text-4xl font-bold">Bookmarks</h2>
        </div>

        <AddBookmarkForm userId={user.id} onOptimisticAdd={handleOptimisticAdd} />
        <BookmarkList
          initialBookmarks={initialBookmarks}
          userId={user.id}
          addToListRef={addToListRef}
        />
      </div>
    </main>
  );
}
