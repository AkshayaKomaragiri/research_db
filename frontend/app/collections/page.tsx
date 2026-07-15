import { Folder } from "lucide-react";

const collections = [
  "Machine Learning",
  "Natural Language Processing",
  "Computer Vision",
  "Distributed Systems",
];

export default function CollectionsPage() {
  return (
    <main className="p-10">

      <div className="mx-auto max-w-6xl">

        <h1 className="text-3xl font-bold">
          Collections
        </h1>

        <p className="text-muted mt-2">
          Organize your papers into research collections.
        </p>

        <div className="grid grid-cols-2 gap-6 mt-10">

          {collections.map((collection) => (
            <div
              key={collection}
              className="rounded-2xl border border-border bg-surface p-8 hover:shadow-md"
            >

              <Folder className="text-primary mb-5" />

              <h2 className="text-xl font-semibold">
                {collection}
              </h2>

              <p className="text-muted mt-2">
                12 Papers
              </p>

            </div>
          ))}

        </div>

      </div>

    </main>
  );
}