"use client";

import Link from "next/link";
import { Bell, UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";

export default function Topbar() {
  const { user, signOut } = useAuth();

  const displayName =
    typeof user?.user_metadata?.full_name === "string" && user?.user_metadata.full_name
      ? user.user_metadata.full_name
      : user?.email?.split("@")[0] ?? "User";

  return (
    <header className="h-20 border-b border-border bg-surface flex items-center justify-between px-8">
      <div>
        <h2 className="text-2xl font-semibold">Research Assistant</h2>

        <p className="text-sm text-muted">Chat with your uploaded papers.</p>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/upload"
          className="rounded-xl bg-primary px-5 py-3 text-white hover:opacity-90"
        >
          Upload Paper
        </Link>

        <Bell className="text-muted" />

        <div className="flex items-center gap-3 rounded-3xl border border-border bg-white px-4 py-2">
          <UserCircle2 size={28} className="text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-slate-100"
        >
          <LogOut size={16} className="inline-block" />
        </button>
      </div>
    </header>
  );
}