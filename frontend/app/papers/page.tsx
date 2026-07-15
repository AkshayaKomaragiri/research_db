import { FileText, Search } from "lucide-react";

const papers = [
  {
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: "2017",
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: "Devlin et al.",
    year: "2018",
  },
];

export default function PapersPage() {
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
              placeholder="Search papers..."
              className="bg-transparent outline-none"
            />

          </div>

        </div>

        <div className="grid gap-5">

          {papers.map((paper) => (
            <div
              key={paper.title}
              className="rounded-2xl border border-border bg-surface p-6 hover:shadow-md"
            >
              <div className="flex items-start gap-4">

                <FileText className="text-primary mt-1" />

                <div>

                  <h2 className="text-xl font-semibold">
                    {paper.title}
                  </h2>

                  <p className="text-muted mt-1">
                    {paper.authors}
                  </p>

                  <span className="text-sm text-primary">
                    {paper.year}
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