"use client";

import { Folder, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/src/supabase";
import { useAuth } from "@/app/components/AuthProvider";

type Collection = {
  id: string;
  title: string;
  created_at: string | null;
  paper_count?: number;
};

export default function CollectionsPage() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadCollections = async () => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch collections strictly matching schema: id, title, created_at, user_id
    const { data, error: collectionsError } = await supabase
      .from("collections")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (collectionsError) {
      setError(collectionsError.message);
      setCollections([]);
      setLoading(false);
      return;
    }

    // Fetch paper counts for each collection
    const { data: papersData, error: papersError } = await supabase
      .from("collection_papers")
      .select("collection_id")
      .eq("user_id", user.id);

    if (papersError) {
      setError(papersError.message);
      setCollections([]);
      setLoading(false);
      return;
    }

    const counts = (papersData ?? []).reduce<Record<string, number>>((acc, paper) => {
      acc[paper.collection_id] = (acc[paper.collection_id] ?? 0) + 1;
      return acc;
    }, {});

    setCollections(
      (data ?? []).map((collection) => ({
        ...collection,
        paper_count: counts[collection.id] ?? 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadCollections();
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Collection title is required.");
      return;
    }

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("collections")
          .update({
            title: trimmedTitle,
          })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
        setStatusMessage("Collection updated.");
      } else {
        const { error: insertError } = await supabase.from("collections").insert({
          user_id: user.id,
          title: trimmedTitle,
        });

        if (insertError) throw insertError;
        setStatusMessage("Collection created.");
      }

      resetForm();
      await loadCollections();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save collection.");
    }
  };

  const handleEdit = (collection: Collection) => {
    setEditingId(collection.id);
    setTitle(collection.title);
  };

  const handleDelete = async (collectionId: string) => {
    if (!user || !window.confirm("Delete this collection and its papers?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
      setStatusMessage("Collection deleted.");
      await loadCollections();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete collection.");
    }
  };

  return (
    <main className="p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">Collections</h1>
            <p className="text-muted mt-2">Organize your papers into research collections.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Plus className="text-primary" size={18} />
            <h2 className="text-lg font-semibold">{editingId ? "Update collection" : "Create collection"}</h2>
          </div>

          <div className="mt-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Collection title"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 font-medium text-white">
              {editingId ? "Save changes" : "Create collection"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-border px-4 py-2">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
        {statusMessage ? <p className="mt-4 text-sm text-primary">{statusMessage}</p> : null}

        {loading ? (
          <p className="mt-8 text-muted">Loading collections…</p>
        ) : collections.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted">
            No collections yet. Create one to start organizing papers.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {collections.map((collection) => (
              <div key={collection.id} className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/collections/${collection.id}`} className="block rounded-xl transition hover:opacity-90">
                      <Folder className="mb-4 text-primary" />
                      <h2 className="text-xl font-semibold">{collection.title}</h2>
                      <p className="mt-3 text-sm text-primary">{collection.paper_count ?? 0} papers</p>
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleEdit(collection)} className="rounded-lg border border-border p-2">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(collection.id)} className="rounded-lg border border-border p-2">
                      <Trash2 size={16} />
                    </button>
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