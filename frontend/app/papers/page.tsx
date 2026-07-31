"use client";

import { FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/src/supabase";
import { useAuth } from "@/app/components/AuthProvider";

type PaperFile = {
  id: string;
  name: string;
  path: string;
  updated_at: string | null;
  size: number | null;
};

export default function PapersPage() {
  const { user } = useAuth();
  const [papers, setPapers] = useState<PaperFile[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPapers([]);
      setIsLoading(false);
      return;
    }

    async function loadPapers() {
      const currentUserId = user?.id;
      if (!currentUserId) {
        setPapers([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.storage.from("user-documents").list(currentUserId, {
        limit: 200,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        setError(error.message);
        setPapers([]);
      } else {
        setPapers(
          (data ?? [])
            .filter((file): file is typeof file & { id: string } => typeof file.id === "string")
            .map((file) => {
              // Construct path explicitly from storage folder + name
              const fullPath = `${currentUserId}/${file.name}`;

              return {
                id: file.id,
                name: file.name,
                path: fullPath,
                updated_at: file.updated_at ?? null,
                size: file.metadata?.size ?? null,
              };
            })
        );
      }

      setIsLoading(false);
    }

    void loadPapers();
  }, [user]);

  const filteredPapers = useMemo(
    () =>
      papers.filter((paper) =>
        paper.name.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [papers, searchValue]
  );

  return (
    <main className="flex-1 p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Papers</h1>
            <p className="text-muted">Browse all uploaded research papers.</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            <Search size={18} />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search papers..."
              className="bg-transparent outline-none"
            />
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

        {isLoading ? (
          <p className="text-muted">Loading papers…</p>
        ) : (
          <div className="grid gap-5">
            {filteredPapers.map((paper) => (
              <div key={paper.id} className="rounded-2xl border border-border bg-surface p-6 hover:shadow-md">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-1 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">{paper.name}</h2>
                      <span className="text-sm text-primary">
                        {paper.updated_at ? new Date(paper.updated_at).toLocaleString() : "Unknown date"}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}