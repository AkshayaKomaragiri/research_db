"use client";

import { Search } from "lucide-react";

export default function ChatWindow() {
  return (
    <main className="flex-1 overflow-y-auto p-10">

      <div className="mx-auto max-w-5xl">

        {/* Search */}

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <Search className="text-primary" />

            <input
              placeholder="Ask a question about your research papers..."
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
            />

          </div>

        </div>

        {/* Messages */}

        <div className="mt-10 space-y-8">

          {/* User */}

          <div className="flex justify-end">

            <div className="max-w-xl rounded-2xl bg-primary px-5 py-4 text-white">

              Summarize the methodology section.

            </div>

          </div>

          {/* AI */}

          <div className="flex">

            <div className="max-w-3xl rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">

              <h3 className="mb-2 font-semibold">
                Summary
              </h3>

              <p className="leading-8 text-muted">
                The methodology introduces a transformer-based architecture
                trained using supervised fine-tuning followed by reinforcement
                learning. Experimental evaluation demonstrates improved
                performance across multiple benchmark datasets while reducing
                inference latency.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}