"use client";

import { Search } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/src/supabase";
import { useAuth } from "@/app/components/AuthProvider";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CollectionOption = {
  id: string;
  title: string;
};

export default function ChatWindow() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);

  // Mention Dropdown States
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentUserId = user?.id;
    if (!currentUserId) {
      setCollections([]);
      return;
    }

    async function loadCollections() {
      // Adjusted select & order to use 'title' column from schema
      const { data, error } = await supabase
        .from("collections")
        .select("id, title")
        .eq("user_id", currentUserId)
        .order("title", { ascending: true });

      if (!error) {
        setCollections(data ?? []);
      }
    }

    void loadCollections();
  }, [user]);

  // Filter collections based on text after @
  const filteredCollections = collections.filter((c) =>
    c.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPrompt(value);

    // Detect `@` at cursor position or end of text
    const cursorPosition = event.target.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9 _-]*)$/);

    if (mentionMatch) {
      setShowDropdown(true);
      setFilterQuery(mentionMatch[1]);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  };

  const selectCollection = (collection: CollectionOption) => {
    // Replace typed @searchTerm with @CollectionTitle
    const cursorPosition = inputRef.current?.selectionStart || prompt.length;
    const textBeforeCursor = prompt.slice(0, cursorPosition);
    const textAfterCursor = prompt.slice(cursorPosition);

    const updatedTextBefore = textBeforeCursor.replace(/@([A-Za-z0-9 _-]*)$/, `@${collection.title} `);
    setPrompt(updatedTextBefore + textAfterCursor);
    setShowDropdown(false);

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredCollections.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCollections.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCollections.length) % filteredCollections.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      selectCollection(filteredCollections[selectedIndex]);
    } else if (event.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;

    // Match typed collection title after `@`
    const mentionMatch = trimmedPrompt.match(/@([A-Za-z0-9 _-]+)/i);
    const matchedCollection = mentionMatch
      ? collections.find((collection) =>
          collection.title.toLowerCase().includes(mentionMatch[1].trim().toLowerCase())
        )
      : undefined;

    const request = {
      question: trimmedPrompt,
      collection_id: matchedCollection?.id ?? null,
      user_id: user?.id ?? null,
    };

    const userMessageID = Date.now().toString();
    const assistantMessageID = `${Date.now()}-assistant`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageID, role: "user", content: trimmedPrompt },
      { id: assistantMessageID, role: "assistant", content: "" },
    ]);
    setPrompt("");
    setShowDropdown(false);

    try {
      setLoading(true);
      const result = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!result.ok) {
        throw new Error(`Chat request failed with ${result.status}`);
      }

      if (!result.body) throw new Error("No body");

      const reader = result.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageID ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error fetching stream", error);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageID
            ? { ...msg, content: "Sorry, I could not reach the assistant service." }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-8">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-xl rounded-2xl bg-primary px-5 py-4 text-white">{msg.content}</div>
              </div>
            ) : (
              (msg.content || loading) && (
                <div key={msg.id} className="flex">
                  <div className="max-w-3xl rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">
                    <h3 className="mb-2 font-semibold">Answer</h3>
                    <p className="leading-8 whitespace-pre-wrap text-muted">{msg.content || "Thinking..."}</p>
                  </div>
                </div>
              )
            )
          )}
        </div>

        {/* Input area wrapper with relative positioning for dropdown */}
        <div className="relative rounded-2xl border border-border bg-surface p-5 shadow-sm">
          {/* Collection Dropdown Popup */}
          {showDropdown && filteredCollections.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 max-h-48 w-72 overflow-y-auto rounded-xl border border-border bg-white shadow-lg z-50 p-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-muted border-b border-border">
                Collections
              </div>
              {filteredCollections.map((collection, index) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => selectCollection(collection)}
                  className={`flex w-full items-center px-3 py-2 text-sm rounded-lg text-left transition ${
                    index === selectedIndex ? "bg-primary text-white" : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  @{collection.title}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Search className="text-primary" />
            <form onSubmit={handleSubmit} className="flex-1">
              <input
                ref={inputRef}
                placeholder="Ask a question about your research papers or mention a collection with @"
                className="w-full bg-transparent text-lg outline-none placeholder:text-muted"
                value={prompt}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}