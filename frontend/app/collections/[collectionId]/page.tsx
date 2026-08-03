"use client";

import { FileText, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/src/supabase";
import { useAuth } from "@/app/components/AuthProvider";

type CollectionPaper = {
  id: string;
  paper_name: string;
  paper_path: string;
  created_at: string | null;
  signedUrl?: string; // Add temporary signed URL
};

type CollectionDetails = {
  id: string;
  title: string;
};

export default function CollectionDetailPage() {
  const params = useParams<{ collectionId: string }>();
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [papers, setPapers] = useState<CollectionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    if (!user || !params?.collectionId) {
      setCollection(null);
      setPapers([]);
      setLoading(false);
      return;
    }

    const loadCollection = async () => {
      setLoading(true);
      setError(null);

      // 1. Fetch collection details
      const { data: collectionData, error: collectionError } = await supabase
        .from("collections")
        .select("id, title")
        .eq("id", params.collectionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (collectionError || !collectionData) {
        setError(collectionError?.message || "Collection not found.");
        setCollection(null);
        setPapers([]);
        setLoading(false);
        return;
      }

      // 2. Fetch paper metadata from DB
      const { data: papersData, error: papersError } = await supabase
        .from("collection_papers")
        .select("id, paper_name, paper_path, created_at")
        .eq("collection_id", params.collectionId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (papersError) {
        setError(papersError.message);
        setPapers([]);
        setLoading(false);
        return;
      }

      const rawPapers = papersData ?? [];

      // 3. Generate secure signed URLs for each paper (valid for 1 hour / 3600 seconds)
      const papersWithSignedUrls = await Promise.all(
        rawPapers.map(async (paper) => {
          const storagePath = paper.paper_path.replace(/^\//, "");

          const { data, error: signedUrlError } = await supabase.storage
            .from("user-documents")
            .createSignedUrl(storagePath, 3600); // 1 hour expiration

          if (signedUrlError) {
            console.error("Error creating signed URL for:", paper.paper_path, signedUrlError);
          }

          return {
            ...paper,
            signedUrl: data?.signedUrl || undefined,
          };
        })
      );

      setCollection(collectionData);
      setPapers(papersWithSignedUrls);
      setLoading(false);
    };

    void loadCollection();
  }, [params?.collectionId, user]);

  const filteredPapers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return papers;

    return papers.filter((paper) => paper.paper_name.toLowerCase().includes(query));
  }, [papers, searchValue]);

  return (
    <main className="flex-1 p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link href="/collections" className="mb-3 inline-flex items-center gap-2 text-sm text-primary">
              <ArrowLeft size={16} />
              Back to collections
            </Link>
            <h1 className="text-3xl font-bold">{collection?.title ?? "Collection"}</h1>
            <p className="mt-2 text-muted">Preview papers stored in this collection.</p>
          </div>

          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {papers.length} paper{papers.length === 1 ? "" : "s"}
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

        <div className="mb-6 rounded-2xl border border-border bg-surface px-4 py-3">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search papers in this collection..."
            className="w-full bg-transparent outline-none"
          />
        </div>

        {loading ? (
          <p className="text-muted">Loading collection papers…</p>
        ) : filteredPapers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            No papers in this collection yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPapers.map((paper) => (
              <div key={paper.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <FileText className="mt-1 text-primary" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{paper.paper_name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {paper.created_at ? new Date(paper.created_at).toLocaleString() : "Added recently"}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  {paper.signedUrl ? (
                    <iframe
                      src={paper.signedUrl}
                      title={paper.paper_name}
                      className="h-72 w-full"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm text-muted">
                      Unable to load PDF preview
                    </div>
                  )}
                </div>

                {paper.signedUrl && (
                  <a
                    href={paper.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <ExternalLink size={16} />
                    Open PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}