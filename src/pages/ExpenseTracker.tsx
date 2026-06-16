import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Expense {
  id: number;
  profile_id: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
}

const CATEGORIES = [
  "Accommodation",
  "Food & Drink",
  "Transport",
  "Activities",
  "Shopping",
  "Health",
  "Communications",
  "Visa & Admin",
  "Other",
];

const CURRENCIES = ["USD", "CAD", "MXN", "GBP", "EUR", "THB", "VND", "KRW", "TRY", "DKK", "GEL", "KHR", "CRC", "PAB"];

const FX_RATES: Record<string, number> = {
  USD: 1.0, CAD: 1.36, MXN: 17.15, CRC: 518.0, PAB: 1.0,
  GBP: 0.79, EUR: 0.92, GEL: 2.72, TRY: 32.5, DKK: 6.88,
  THB: 35.1, VND: 25200.0, KHR: 4100.0, KRW: 1340.0,
};

function toUSD(amount: number, currency: string): number {
  const rate = FX_RATES[currency] ?? 1;
  return amount / rate;
}

interface Props {
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

export default function ExpenseTracker({ onUnsavedChange }: Props) {
  const profileId = 1;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<[string, number][]>([]);
  const [view, setView] = useState<"list" | "add" | "summary">("list");

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  async function loadExpenses() {
    try {
      const result = await invoke<Expense[]>("list_expenses", { profileId });
      setExpenses(result);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSummary() {
    try {
      const result = await invoke<[string, number][]>("get_expense_summary", { profileId });
      setSummary(result);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    if (view === "summary") loadSummary();
  }, [view]);

  useEffect(() => {
    const hasDraft = view === "add" && (amount.trim() !== "" || description.trim() !== "");
    onUnsavedChange?.(hasDraft);
    return () => onUnsavedChange?.(false);
  }, [view, amount, description, onUnsavedChange]);

  async function handleAdd() {
    setError("");
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      await invoke("add_expense", {
        profileId,
        amount: parsed,
        currency,
        category,
        description,
        date,
      });
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      await loadExpenses();
      setView("list");
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(id: number) {
    try {
      await invoke("delete_expense", { id });
      await loadExpenses();
    } catch (e) {
      console.error(e);
    }
  }

async function handleExportCSV() {
    if (expenses.length === 0) return;
    try {
      const savedPath = await invoke<string>("export_expenses_csv", { profileId });
      alert(`Exported to:\n${savedPath}`);
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
  }

  const totalUSD = expenses.reduce((sum, e) => sum + toUSD(e.amount, e.currency), 0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gold mb-1">💰 Expense Tracker</h1>
      <p className="text-sm text-gray-400 mb-6">Track spending across currencies. All data stays local.</p>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {(["list", "add", "summary"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              view === v
                ? "bg-gold text-navy"
                : "bg-navy-light text-gray-300 hover:text-white"
            }`}
          >
            {v === "list" ? "All Expenses" : v === "add" ? "+ Add" : "Summary"}
          </button>
        ))}
        {expenses.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="ml-auto px-4 py-2 rounded text-sm font-medium bg-navy-light text-gray-300 hover:text-white transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* List view */}
      {view === "list" && (
        <div>
          {expenses.length === 0 ? (
            <p className="text-gray-400 text-sm">No expenses yet. Add your first one.</p>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">
                Total: <span className="text-gold font-semibold">${totalUSD.toFixed(2)} USD</span> across {expenses.length} entries
              </p>
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between bg-navy-light rounded px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{e.category}</p>
                      {e.description && (
                        <p className="text-xs text-gray-400">{e.description}</p>
                      )}
                      <p className="text-xs text-gray-500">{e.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gold">
                          {e.amount.toFixed(2)} {e.currency}
                        </p>
                        {e.currency !== "USD" && (
                          <p className="text-xs text-gray-500">
                            ≈ ${toUSD(e.amount, e.currency).toFixed(2)} USD
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add view */}
      {view === "add" && (
        <div className="space-y-4 max-w-md">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-navy-light border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-navy-light border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-navy-light border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grab from airport"
              className="w-full bg-navy-light border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-navy-light border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-gold text-navy font-semibold py-2 rounded hover:opacity-90 transition-opacity"
          >
            Save Expense
          </button>
        </div>
      )}

      {/* Summary view */}
      {view === "summary" && (
        <div>
          {summary.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                All amounts converted to USD using offline FX rates.
              </p>
              {summary.map(([cat, total]) => {
                const pct = totalUSD > 0 ? (toUSD(total, "USD") / totalUSD) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{cat}</span>
                      <span className="text-gold font-semibold">${total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-navy-light rounded-full h-2">
                      <div
                        className="bg-gold h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-sm text-gray-400 pt-2 border-t border-gray-700">
                Total: <span className="text-gold font-semibold">${totalUSD.toFixed(2)} USD</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}