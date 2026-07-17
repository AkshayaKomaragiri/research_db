import { createClient } from '@supabase/supabase-js'
import { UploadCloud } from "lucide-react";
import axios from 'axios'
import { ChangeEvent, useState } from 'React';
export default function UploadPage() {
  const supabase = createClient('your_project_url', 'your_supabase_api_key')
  
  
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('https://httpbin.org/post', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      setStatus('success');
      setUploadProgress(100);
    } catch {
      setStatus('error');
      setUploadProgress(0);
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

          <button onClick={handleFileUpload} className="mt-8 rounded-xl bg-primary px-6 py-3 text-white">
            Select PDF
          </button>

        </div>

      </div>

    </main>
  );
}