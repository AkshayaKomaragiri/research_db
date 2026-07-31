"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/src/supabase";
import { useAuth } from "@/app/components/AuthProvider";

type CollectionOption = {
  id: string;
  title: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");

  useEffect(() => {
    if (!user) {
      setCollections([]);
      return;
    }

    const loadCollections = async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, title")
        .eq("user_id", user.id)
        .order("title", { ascending: true });

      if (!error) {
        setCollections(data ?? []);
      }
    };

    void loadCollections();
  }, [user]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  }

  async function handleFileUpload() {
    if (!file || !user) {
      setMessage("Please select a file and sign in before uploading.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setUploadProgress(20);
    setMessage(null);

    const filePath = `${user.id}/${file.name}`;

    try {
      // 1. Upload raw PDF file to Supabase Storage bucket ('user-documents')
      const { error: storageError } = await supabase.storage
        .from("user-documents")
        .upload(filePath, file, { upsert: true });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      setUploadProgress(50);

      // 2. If a collection is selected, link paper to collection_papers table
      if (selectedCollectionId) {
        const { error: relationError } = await supabase
          .from("collection_papers")
          .upsert(
            {
              user_id: user.id,
              collection_id: selectedCollectionId,
              paper_name: file.name,
              paper_path: filePath,
            },
            { onConflict: "user_id,collection_id,paper_path" }
          );

        if (relationError) {
          console.error("Failed to link paper to collection:", relationError.message);
        }
      }

      setUploadProgress(70);

      // 3. Send file + metadata to backend vector endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.id);
      formData.append("paper_path", filePath);
      if (selectedCollectionId) {
        formData.append("collection_id", selectedCollectionId);
      }

      const backendResponse = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        throw new Error(`Vector ingestion failed: ${errorText}`);
      }

      setStatus("success");
      setUploadProgress(100);
      setMessage("File uploaded successfully. Redirecting to My Papers...");
      setFile(null);
      router.push("/papers");
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setUploadProgress(0);

      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("Upload failed.");
      }
    }
  }

  if (!user) {
    return (
      <main className="p-10">
        <div className="mx-auto max-w-3xl text-center py-20">
          Loading user session...
        </div>
      </main>
    );
  }

  const displayName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name
      ? user.user_metadata.full_name
      : user.email?.split("@")[0] ?? "User";

  return (
    <main className="p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Upload Paper</h1>
            <p className="text-muted mt-2">Upload PDFs to your research database.</p>
            <p className="mt-3 text-sm text-gray-600">
              Signed in as <strong>{displayName}</strong>
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border-2 border-dashed border-primary bg-surface p-16 text-center">
          <UploadCloud size={60} className="mx-auto text-primary" />
          <h2 className="mt-6 text-xl font-semibold">Drag & Drop PDF</h2>
          <p className="mt-2 text-muted">or click below to browse files</p>

          <div className="space-y-4">
            <label className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-6 py-3 text-white transition hover:bg-primary/90">
              <span>Select PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {file && (
              <div className="mb-4 text-sm text-left rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium">Selected file</p>
                <p>Name: {file.name}</p>
                <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
                <p>Type: {file.type || "PDF"}</p>
              </div>
            )}

            {status === "uploading" && (
              <div className="space-y-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
              </div>
            )}

            {file && status !== "uploading" && (
              <div className="space-y-3">
                <div className="text-left">
                  <label className="mb-2 block text-sm font-medium">
                    Choose collection for this upload
                  </label>
                  <select
                    value={selectedCollectionId}
                    onChange={(event) => setSelectedCollectionId(event.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <option value="">No collection (upload only)</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleFileUpload}
                  className="rounded-xl bg-primary px-6 py-3 text-white"
                >
                  Upload
                </button>
              </div>
            )}

            {message && (
              <p className={`text-sm ${status === "success" ? "text-green-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}