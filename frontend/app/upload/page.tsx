"use client"
import { createClient } from '@supabase/supabase-js'
import { UploadCloud } from "lucide-react";
import axios from 'axios'
import { supabase } from '@/lib/src/supabase';
import { ChangeEvent, useState } from 'react';
export default function UploadPage() {
  
  interface FileWithPath extends File {
  path: string;
}
  
  type upload_status = 'idle' | 'uploading' | 'success' | 'error';
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<upload_status>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // saves selected file into the state when a user selects a file
  function handleFileChange(e: ChangeEvent<HTMLInputElement>){
    if (e.target.files){
      setFile(e.target.files[0]);
    }
  }
    async function handleFileUpload() {
    if (!file) return;

    setStatus('uploading');
    setUploadProgress(0);

    const filePath = `${Date.now()}_${file.name}`;
    try {
    const {data,error}  = await supabase.storage.from('user-documents').upload(filePath, file)
      if (error) throw error;
      setStatus('success');
      setUploadProgress(100);
    } catch (err){
      console.error("Supabase upload error:", err);
      setUploadProgress(0);
      setStatus('error');
    }
  }



  async function uploadFile(file: File) {
    const { data, error } = await supabase.storage.from('user-documents').upload('file_path', file)
    if (error) {
      console.log("error")
    } else {
      console.log("success")
    }
  }
  return (
    <main className="p-10">

      <div className="mx-auto max-w-3xl">

        <h1 className="text-3xl font-bold">
          Upload Paper
        </h1>

        <p className="text-muted mt-2">
          Upload PDFs to your research database.
        </p>

        <div className="mt-10 rounded-3xl border-2 border-dashed border-primary bg-surface p-16 text-center">

          <UploadCloud
            size={60}
            className="mx-auto text-primary"
          />

          <h2 className="mt-6 text-xl font-semibold">
            Drag & Drop PDF
          </h2>

          <p className="mt-2 text-muted">
            or click below to browse files
          </p>
          <div className="space-y-2">
      <input className="mt-8 rounded-xl bg-primary px-6 py-3 text-white" type="file" onChange={handleFileChange} />

      {file && (
        <div className="mb-4 text-sm">
          <p>File name: {file.name}</p>
          <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
          <p>Type: {file.type}</p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
        </div>
      )}

      {file && status !== 'uploading' && (
        <button onClick={handleFileUpload} className="mt-8 rounded-xl bg-primary px-6 py-3 text-white">Upload</button>
      )}

      {status === 'success' && (
        <p className="text-sm text-green-600">File uploaded successfully!</p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-600">Upload failed. Please try again.</p>
      )}
    </div>
        

        </div>

      </div>

    </main>
  );
}