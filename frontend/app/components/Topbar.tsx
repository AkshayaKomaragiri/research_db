"use client";

import { Bell, UserCircle2 } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-20 border-b border-border bg-surface flex items-center justify-between px-8">

      <div>

        <h2 className="text-2xl font-semibold">
          Research Assistant
        </h2>

        <p className="text-sm text-muted">
          Chat with your uploaded papers.
        </p>

      </div>

      <div className="flex items-center gap-4">

        <button className="rounded-xl bg-primary px-5 py-3 text-white hover:opacity-90">
          Upload Paper
        </button>

        <Bell className="text-muted" />

        <UserCircle2 size={34} />

      </div>

    </header>
  );
}