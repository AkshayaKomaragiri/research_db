import { Settings2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <main className="p-10">

      <div className="mx-auto max-w-4xl">

        <div className="flex items-center gap-3 mb-8">

          <Settings2 />

          <h1 className="text-3xl font-bold">
            Settings
          </h1>

        </div>

        <div className="space-y-6">

          <div className="rounded-2xl border border-border bg-surface p-6">

            <h2 className="font-semibold mb-2">
              Profile
            </h2>

            <input
              className="w-full rounded-xl border border-border bg-white p-3"
              placeholder="Your name"
            />

          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">

            <h2 className="font-semibold mb-2">
              Default AI Model
            </h2>

            <select className="w-full rounded-xl border border-border bg-white p-3">
              <option>GPT-4.1</option>
              <option>Claude Sonnet</option>
              <option>Gemini</option>
            </select>

          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">

            <h2 className="font-semibold mb-2">
              Retrieval Settings
            </h2>

            <label className="flex items-center gap-3">

              <input type="checkbox" />

              Show citations

            </label>

          </div>

        </div>

      </div>

    </main>
  );
}