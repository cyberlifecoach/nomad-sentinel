import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface CountryItem {
  id: string;
  category: string;
  note: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  risk_level: string;
  items: CountryItem[];
}

const riskColors: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

const riskLabels: Record<string, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

export default function CountryChecklists() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [activeCountry, setActiveCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCountries() {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<Country[]>("get_countries");
      setCountries(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCountry(code: string) {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<Country>("get_country", { code });
      setActiveCountry(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const categories = activeCountry
    ? [...new Set(activeCountry.items.map((i) => i.category))]
    : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-gold)] mb-1">
        🛃 Country Security Checklists
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Border rules, SIM cards, local scams, and cyber risk — by country.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/40 text-red-300 text-sm">{error}</div>
      )}

      {!activeCountry && (
        <div>
          {countries.length === 0 ? (
            <button
              onClick={loadCountries}
              disabled={loading}
              className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load Countries"}
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {countries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => loadCountry(c.code)}
                  disabled={loading}
                  className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold)] text-left transition-colors disabled:opacity-50"
                >
                  <div className="text-2xl mb-1">{c.flag}</div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{c.name}</div>
                  <div className={`text-xs mt-1 ${riskColors[c.risk_level] ?? "text-gray-400"}`}>
                    {riskLabels[c.risk_level] ?? c.risk_level}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeCountry && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeCountry.flag}</span>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                  {activeCountry.name}
                </h2>
                <span
                  className={`text-xs ${riskColors[activeCountry.risk_level] ?? "text-gray-400"}`}
                >
                  {riskLabels[activeCountry.risk_level] ?? activeCountry.risk_level}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveCountry(null)}
              className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category}
                className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold)] mb-2">
                  {category}
                </h3>
                {activeCountry.items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <p key={item.id} className="text-sm text-[var(--color-text)] leading-relaxed">
                      {item.note}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}