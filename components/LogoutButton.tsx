"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-1.5 text-xs font-mono text-muted border border-cream rounded-full hover:border-muted hover:text-ink transition-colors"
    >
      Sign out
    </button>
  );
}
