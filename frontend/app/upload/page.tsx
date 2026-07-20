"use client"
import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/src/supabase';
import { ChangeEvent, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  }

  async function handleFileUpload() {
    if (!file || !user) {
      setMessage('Please select a file and sign in before uploading.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setUploadProgress(0);
    setMessage(null);

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    try {
      const { error } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      setStatus('success');
      setUploadProgress(100);
      setMessage('File uploaded successfully. Redirecting to My Papers...');
      setFile(null);
      router.push('/papers');
    } catch (err) {
      console.error('Supabase upload error:', err);
      setStatus('error');
      setUploadProgress(0);

      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage('Upload failed.');
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
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name
      ? user.user_metadata.full_name
      : user.email?.split('@')[0] ?? 'User';

  return (
    <main className="p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Upload Paper</h1>
            <p className="text-muted mt-2">Upload PDFs to your research database.</p>
            <p className="mt-3 text-sm text-gray-600">Signed in as <strong>{displayName}</strong></p>
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
                <p>Type: {file.type || 'PDF'}</p>
              </div>
            )}

            {status === 'uploading' && (
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

            {file && status !== 'uploading' && (
              <button
                onClick={handleFileUpload}
                className="rounded-xl bg-primary px-6 py-3 text-white"
              >
                Upload
              </button>
            )}

            {message && (
              <p className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
