import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginButton from "@/components/LoginButton";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const hasError = params.error === "auth";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Decorative background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,97,43,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-cream">
        <div className="flex items-center gap-3">
          <span className="text-2xl">◈</span>
          <span className="font-display font-semibold text-xl tracking-tight">
            Marks
          </span>
        </div>
        <span className="font-mono text-xs text-muted uppercase tracking-widest">
          v1.0
        </span>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
          <p className="font-mono text-xs text-accent uppercase tracking-[0.2em] mb-6">
            Your personal archive
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <h1 className="font-display text-6xl md:text-8xl font-bold leading-none tracking-tight mb-4">
            Keep what
            <br />
            <em className="italic text-accent">matters.</em>
          </h1>
        </div>

        <div
          className="animate-fade-up max-w-md mx-auto"
          style={{ animationDelay: "160ms" }}
        >
          <p className="text-muted font-body font-light text-lg mb-10 leading-relaxed">
            A quiet place for your bookmarks. Private, real-time, and elegantly
            simple.
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
          {hasError && (
            <p className="text-red-600 text-sm mb-4 font-mono">
              Authentication failed. Please try again.
            </p>
          )}
          <LoginButton />
        </div>

        {/* Feature pills */}
        <div
          className="animate-fade-up flex flex-wrap gap-3 justify-center mt-12"
          style={{ animationDelay: "320ms" }}
        >
          {[
            "Real-time sync",
            "Private by default",
            "No ads, ever",
          ].map((f) => (
            <span
              key={f}
              className="px-4 py-1.5 rounded-full border border-cream bg-cream/60 text-muted text-xs font-mono tracking-wide"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-5 border-t border-cream text-center">
        <p className="text-muted font-mono text-xs tracking-wide">
          Built with Next.js, Supabase & Tailwind CSS
        </p>
      </footer>
    </main>
  );
}
