"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Database,
  Upload,
  Settings,
  MessageSquare,
} from "lucide-react";

const navigation = [
  {
    name: "Research Assistant",
    href: "/",
    icon: MessageSquare,
  },
  {
    name: "My Papers",
    href: "/papers",
    icon: BookOpen,
  },
  {
    name: "Collections",
    href: "/collections",
    icon: Database,
  },
  {
    name: "Upload Paper",
    href: "/upload",
    icon: Upload,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-8">
        <h1 className="text-3xl font-bold text-primary">
          ResearchDB
        </h1>

        <p className="mt-1 text-sm text-muted">
          AI Research Workspace
        </p>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground hover:bg-hover"
              }`}
            >
              <item.icon size={20} />

              <span className="font-medium">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-5 text-sm text-muted">
        ResearchDB v1.0
      </div>
    </aside>
  );
}