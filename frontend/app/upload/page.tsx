import { UploadCloud } from "lucide-react";

export default function UploadPage() {
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

          <button className="mt-8 rounded-xl bg-primary px-6 py-3 text-white">
            Select PDF
          </button>

        </div>

      </div>

    </main>
  );
}