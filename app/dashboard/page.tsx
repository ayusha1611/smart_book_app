import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookmarkDashboard from "@/components/BookmarkDashboard";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <BookmarkDashboard
      user={{
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email ?? "User",
        avatar: user.user_metadata?.avatar_url ?? null,
      }}
      initialBookmarks={bookmarks ?? []}
    />
  );
}
