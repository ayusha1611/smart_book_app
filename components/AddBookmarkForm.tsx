"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Bookmark {
  id: string; url: string; title: string; created_at: string; user_id: string;
}

interface Props {
  userId: string;
  onOptimisticAdd: (b: Bookmark) => void; // notify BookmarkList to add instantly in THIS tab
}

export default function AddBookmarkForm({ userId, onOptimisticAdd }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!url.trim() || !title.trim()) { setError("Both URL and title are required."); return; }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://"))
      normalizedUrl = `https://${normalizedUrl}`;
    try { new URL(normalizedUrl); } catch { setError("Please enter a valid URL."); return; }

    setLoading(true);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("bookmarks")
      .insert({ user_id: userId, url: normalizedUrl, title: title.trim() })
      .select().single();

    setLoading(false);
    if (dbError) { setError(`Error: ${dbError.message}`); return; }

    // Tell BookmarkList to show it immediately in THIS tab (other tabs get it via realtime)
    if (data) onOptimisticAdd(data);

    setUrl(""); setTitle(""); setOpen(false);
  };

  return (
    <div className="mb-8">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="group w-full flex items-center gap-3 px-5 py-4 border-2 border-dashed border-cream rounded-2xl text-muted hover:border-accent hover:text-accent transition-all duration-200 font-body text-sm">
          <span className="text-xl leading-none transition-transform group-hover:rotate-90 duration-200">+</span>
          Add a new bookmark
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="border border-cream rounded-2xl p-5 bg-cream/40 backdrop-blur-sm">
          <p className="font-display text-lg font-semibold mb-4">New bookmark</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The best article ever" autoFocus
                className="w-full px-4 py-2.5 bg-paper border border-cream rounded-xl text-sm font-body placeholder-muted/60 focus:outline-none focus:border-accent transition-colors"/>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted uppercase tracking-widest mb-1.5">URL</label>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 bg-paper border border-cream rounded-xl text-sm font-mono placeholder-muted/60 focus:outline-none focus:border-accent transition-colors"/>
            </div>
            {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-ink text-paper rounded-xl text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
              {loading ? "Saving…" : "Save bookmark"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(""); setUrl(""); setTitle(""); }}
              className="px-4 py-2.5 border border-cream rounded-xl text-sm text-muted hover:border-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
