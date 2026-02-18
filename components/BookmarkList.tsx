"use client";

import { MutableRefObject, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Bookmark {
  id: string; url: string; title: string; created_at: string; user_id: string;
}
interface Props {
  initialBookmarks: Bookmark[];
  userId: string;
  addToListRef: MutableRefObject<((b: Bookmark) => void) | null>;
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}
function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).origin}&sz=32`; } catch { return null; }
}
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function BookmarkList({ initialBookmarks, userId, addToListRef }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [deleting, setDeleting]   = useState<Set<string>>(new Set());
  const [rtStatus, setRtStatus]   = useState<"connecting" | "connected" | "error">("connecting");
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  // IDs already handled locally — skip realtime echo
  const handled = useRef<Set<string>>(new Set());

  // ── Register add fn with parent ref ─────────────────────────────────────
  useEffect(() => {
    addToListRef.current = (bookmark: Bookmark) => {
      handled.current.add(bookmark.id);
      setBookmarks((prev) => {
        if (prev.some((b) => b.id === bookmark.id)) return prev;
        return [bookmark, ...prev];
      });
    };
    return () => { addToListRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // APPROACH: Subscribe to ALL changes on the bookmarks table.
    // No server-side filter — we filter client-side by user_id.
    // This is the most reliable approach because:
    //   - Server-side DELETE filters need REPLICA IDENTITY FULL
    //   - Client-side filtering is always guaranteed to work
    const channel = supabase
      .channel("bookmarks_global", {
        config: {
          broadcast: { ack: true },
          presence:  { key: userId },
        },
      })
      // ── INSERT ───────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookmarks" },
        (payload) => {
          const row = payload.new as Bookmark;
          console.log("[RT] INSERT received", row);

          if (row.user_id !== userId) return;

          // Already added optimistically from this tab
          if (handled.current.has(row.id)) {
            handled.current.delete(row.id);
            return;
          }

          // ✅ From ANOTHER TAB — add to list
          console.log("[RT] Adding from other tab:", row.title);
          setBookmarks((prev) => {
            if (prev.some((b) => b.id === row.id)) return prev;
            return [row, ...prev];
          });
        }
      )
      // ── DELETE ───────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "bookmarks" },
        (payload) => {
          const id = payload.old.id as string;
          console.log("[RT] DELETE received", id);

          // Already removed optimistically from this tab
          if (handled.current.has(id)) {
            handled.current.delete(id);
            return;
          }

          // ✅ From ANOTHER TAB — remove from list
          console.log("[RT] Removing from other tab:", id);
          setBookmarks((prev) => prev.filter((b) => b.id !== id));
        }
      )
      .subscribe((status, err) => {
        console.log("[RT] Channel status:", status, err || "");
        if (status === "SUBSCRIBED") {
          setRtStatus("connected");
          console.log("[RT] ✅ Realtime connected and listening");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[RT] ❌ Realtime error:", err);
          setRtStatus("error");
        }
      });

    return () => {
      console.log("[RT] Cleaning up channel");
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    handled.current.add(id);
    setDeleting((p) => new Set(p).add(id));
    setBookmarks((prev) => prev.filter((b) => b.id !== id));

    const supabase = createClient();
    const { error } = await supabase
      .from("bookmarks").delete().eq("id", id).eq("user_id", userId);

    if (error) {
      console.error("Delete failed:", error);
      handled.current.delete(id);
      const { data } = await supabase.from("bookmarks").select("*")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (data) setBookmarks(data);
    }
    setDeleting((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            rtStatus === "connected" ? "bg-green-500 animate-pulse" :
            rtStatus === "error"     ? "bg-red-400" : "bg-yellow-400 animate-pulse"
          }`}/>
          <span className="font-mono text-xs text-muted">
            {rtStatus === "connected" ? "Live — syncs across all open tabs" :
             rtStatus === "error"     ? "Realtime error — check browser console" :
                                        "Connecting…"}
          </span>
        </div>
        {rtStatus === "error" && (
          <a href="/debug" target="_blank"
            className="font-mono text-xs text-accent underline">
            Open debug →
          </a>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">◈</p>
          <p className="font-display text-xl text-muted mb-1">Your archive is empty</p>
          <p className="text-sm text-muted/70">Add your first bookmark above</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bookmarks.map((bm, i) => {
            const favicon = getFavicon(bm.url);
            const isDel   = deleting.has(bm.id);
            return (
              <li key={bm.id}
                className={`bookmark-item group flex items-start gap-4 px-5 py-4 rounded-2xl bg-cream/40 border border-cream hover:border-muted/40 hover:bg-cream/70 transition-all duration-200 ${isDel ? "opacity-40 pointer-events-none" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}>

                <div className="mt-0.5 w-8 h-8 rounded-lg bg-paper border border-cream flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {favicon
                    ? <img src={favicon} alt="" className="w-4 h-4" // eslint-disable-line @next/next/no-img-element
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : <span className="text-muted text-xs">◈</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <a href={bm.url} target="_blank" rel="noopener noreferrer"
                    className="block font-body font-medium text-sm text-ink hover:text-accent transition-colors truncate">
                    {bm.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-muted truncate">{getDomain(bm.url)}</span>
                    <span className="text-cream select-none">·</span>
                    <span className="font-mono text-xs text-muted/60 flex-shrink-0">{timeAgo(bm.created_at)}</span>
                  </div>
                </div>

                <button onClick={() => handleDelete(bm.id)} disabled={isDel}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-150 mt-0.5"
                  title="Delete">
                  {isDel
                    ? <span className="text-xs">…</span>
                    : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M1 1l11 11M12 1L1 12" />
                      </svg>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
