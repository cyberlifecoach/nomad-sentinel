import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Phrase {
  id: string;
  scenario: string;
  phrase: string;
  translation: string;
  pronunciation: string;
}

interface Language {
  code: string;
  name: string;
  flag: string;
  phrases: Phrase[];
}

export default function Phrasebook() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<Language | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadLanguages() {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<Language[]>("get_languages");
      setLanguages(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadLanguage(code: string) {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<Language>("get_language", { code });
      setActiveLanguage(result);
      setActiveScenario("All");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const scenarios = activeLanguage
    ? ["All", ...new Set(activeLanguage.phrases.map((p) => p.scenario))]
    : [];

  const visiblePhrases = activeLanguage
    ? activeScenario === "All"
      ? activeLanguage.phrases
      : activeLanguage.phrases.filter((p) => p.scenario === activeScenario)
    : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-gold)] mb-1">🗣 Offline Phrasebook</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Essential phrases by language and scenario — no internet required.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/40 text-red-300 text-sm">{error}</div>
      )}

      {!activeLanguage && (
        <div>
          {languages.length === 0 ? (
            <button
              onClick={loadLanguages}
              disabled={loading}
              className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load Languages"}
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => loadLanguage(l.code)}
                  disabled={loading}
                  className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold)] text-left transition-colors disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">{l.flag}</div>
                  <div className="font-semibold text-sm text-[var(--color-text)]">{l.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    {l.phrases.length} phrases
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeLanguage && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeLanguage.flag}</span>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {activeLanguage.name}
              </h2>
            </div>
            <button
              onClick={() => setActiveLanguage(null)}
              className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {scenarios.map((s) => (
              <button
                key={s}
                onClick={() => setActiveScenario(s)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  activeScenario === s
                    ? "bg-[var(--color-gold)] text-[var(--color-navy)] border-[var(--color-gold)] font-semibold"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visiblePhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">{phrase.phrase}</p>
                    <p className="text-base font-semibold text-[var(--color-text)] mt-0.5">
                      {phrase.translation}
                    </p>
                    <p className="text-xs text-[var(--color-gold)] mt-1">
                      🔊 {phrase.pronunciation}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-border)] px-2 py-0.5 rounded-full whitespace-nowrap">
                    {phrase.scenario}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}