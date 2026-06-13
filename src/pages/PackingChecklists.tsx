import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  icon: string;
  items: { id: string; label: string; category: string }[];
}

interface UserChecklist {
  id: string;
  name: string;
  icon: string;
  items: ChecklistItem[];
}

export default function PackingChecklists() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activeChecklist, setActiveChecklist] = useState<UserChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTemplates() {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<ChecklistTemplate[]>("get_checklist_templates");
      setTemplates(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplate(id: string) {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<UserChecklist>("load_checklist_template", { templateId: id });
      setActiveChecklist(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(id: string) {
    if (!activeChecklist) return;
    setActiveChecklist({
      ...activeChecklist,
      items: activeChecklist.items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    });
  }

  function resetChecklist() {
    if (!activeChecklist) return;
    setActiveChecklist({
      ...activeChecklist,
      items: activeChecklist.items.map((item) => ({ ...item, checked: false })),
    });
  }

  const categories = activeChecklist
    ? [...new Set(activeChecklist.items.map((i) => i.category))]
    : [];

  const checkedCount = activeChecklist?.items.filter((i) => i.checked).length ?? 0;
  const totalCount = activeChecklist?.items.length ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-gold)] mb-1">📦 Packing Checklists</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Load a template for your trip type and check off items as you pack.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/40 text-red-300 text-sm">{error}</div>
      )}

      {!activeChecklist && (
        <div>
          {templates.length === 0 ? (
            <button
              onClick={loadTemplates}
              disabled={loading}
              className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load Templates"}
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t.id)}
                  disabled={loading}
                  className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold)] text-left transition-colors disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="font-semibold text-[var(--color-text)]">{t.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    {t.items.length} items
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeChecklist && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-lg font-semibold text-[var(--color-text)]">
                {activeChecklist.icon} {activeChecklist.name}
              </span>
              <span className="ml-3 text-sm text-[var(--color-text-muted)]">
                {checkedCount}/{totalCount} packed
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetChecklist}
                className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => { setActiveChecklist(null); setTemplates([]); }}
                className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mb-6">
            <div
              className="bg-[var(--color-gold)] h-1.5 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>

          {categories.map((category) => (
            <div key={category} className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {activeChecklist.items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:border-[var(--color-gold)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleItem(item.id)}
                        className="w-4 h-4 accent-[var(--color-gold)]"
                      />
                      <span
                        className={`text-sm ${
                          item.checked
                            ? "line-through text-[var(--color-text-muted)]"
                            : "text-[var(--color-text)]"
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}