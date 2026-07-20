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
    if (!user) return;

    async function loadPapers() {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.storage.from("user-documents").list(user.id, {
        limit: 200,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        setError(error.message);
        setPapers([]);
      } else {
        setPapers(
          (data ?? []).map((file) => ({
            id: file.id,
            name: file.name,
            path: file.path,
            updated_at: file.updated_at,
            size: file.size,
          }))
        );
      }

      setIsLoading(false);
    }

    loadPapers();
  }, [user]);

  const filteredPapers = useMemo(
    () =>
      papers.filter((paper) =>
        paper.name.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [papers, searchValue]
  );

  const displayName =
    typeof user?.user_metadata?.full_name === "string" && user?.user_metadata.full_name
      ? user.user_metadata.full_name
      : user?.email?.split("@")[0] ?? "User";

  return (
    <main className="flex-1 p-10">

      <div className="mx-auto max-w-6xl">

        <div className="flex items-center justify-between mb-8">

          <div>
            <h1 className="text-3xl font-bold">My Papers</h1>
            <p className="text-muted">
              Browse all uploaded research papers.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">

            <Search size={18} />

            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search papers..."
              className="bg-transparent outline-none"
            />

          </div>

        </div>

        <div className="grid gap-5">

          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="rounded-2xl border border-border bg-surface p-6 hover:shadow-md"
            >
              <div className="flex items-start gap-4">

                <FileText className="text-primary mt-1" />

                <div>

                  <h2 className="text-xl font-semibold">
                    {paper.name}
                  </h2>

                  <p className="text-muted mt-1">
                    Path: {paper.path}
                  </p>

                  <span className="text-sm text-primary">
                    {paper.updated_at ? new Date(paper.updated_at).toLocaleString() : 'Unknown date'}
                  </span>

                </div>

              </div>

            </div>
          ))}

        </div>

      </div>

    </main>
  );
}