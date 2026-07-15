"use client";

import {
  BookOpen,
  Database,
  Upload,
  Settings,
} from "lucide-react";

const items = [
  {
    title: "My Papers",
    icon: BookOpen,
  },
  {
    title: "Collections",
    icon: Database,
  },
  {
    title: "Upload",
    icon: Upload,
  },
  {
    title: "Settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <aside className="w-72 border-r border-border bg-sidebar flex flex-col">

      <div className="p-8">

        <h1 className="text-3xl font-bold text-primary">
          ResearchDB
        </h1>

        <p className="text-muted mt-1 text-sm">
          AI Research Workspace
        </p>

      </div>

      <nav className="flex-1 px-4">

        {items.map((item) => (
          <button
            key={item.title}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-hover"
          >
            <item.icon size={20} />

            <span>{item.title}</span>

          </button>
        ))}

      </nav>

      <div className="border-t border-border p-5 text-sm text-muted">
        ResearchDB v1.0
      </div>

    </aside>
  );
}