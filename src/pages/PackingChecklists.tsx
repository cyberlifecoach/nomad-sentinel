import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ChecklistTemplate {
  id: string;
  name: string;
  icon: string;
  items: { id: string; label: string; category: string }[];
}

interface SavedChecklistMeta {
  id: number;
  template_id: string;
  name: string;
  icon: string;
  created_at: string;
  total_items: number;
  checked_items: number;
}

interface SavedChecklistItem {
  id: number;
  label: string;
  category: string;
  checked: boolean;
  sort_order: number;
}

interface SavedChecklist {
  id: number;
  template_id: string;
  name: string;
  icon: string;
  created_at: string;
  items: SavedChecklistItem[];
}

type View = "list" | "templates" | "active";

function formatDate(sqliteDatetime: string): string {
  const d = new Date(sqliteDatetime.replace(" ", "T") + "Z");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function PackingChecklists() {
  const profileId = 1;

  const [view, setView] = useState<View>("list");
  const [savedChecklists, setSavedChecklists] = useState<SavedChecklistMeta[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activeChecklist, setActiveChecklist] = useState<SavedChecklist | null>(null);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadSavedChecklists();
  }, []);

  async function loadSavedChecklists() {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<SavedChecklistMeta[]>("list_saved_packing_checklists", {
        profileId,
      });
      setSavedChecklists(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openTemplatePicker() {
    setError("");
    setSuccessMsg("");
    if (templates.length === 0) {
      setLoading(true);
      try {
        const result = await invoke<ChecklistTemplate[]>("get_checklist_templates");
        setTemplates(result);
      } catch (e) {
        setError(String(e));
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setView("templates");
  }

  async function createFromTemplate(templateId: string) {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<SavedChecklist>("save_packing_checklist", {
        profileId,
        templateId,
      });
      setActiveChecklist(result);
      setView("active");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openChecklist(checklistId: number) {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await invoke<SavedChecklist>("get_saved_packing_checklist", {
        checklistId,
      });
      setActiveChecklist(result);
      setView("active");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function backToList() {
    setActiveChecklist(null);
    setSuccessMsg("");
    setView("list");
    loadSavedChecklists();
  }

  async function toggleItem(itemId: number, checked: boolean) {
    if (!activeChecklist) return;
    setActiveChecklist({
      ...activeChecklist,
      items: activeChecklist.items.map((item) =>
        item.id === itemId ? { ...item, checked } : item
      ),
    });
    try {
      await invoke("toggle_packing_checklist_item", { itemId, checked });
    } catch (e) {
      setError(String(e));
    }
  }

  async function addItem() {
    if (!activeChecklist || !newItemLabel.trim()) return;
    const label = newItemLabel.trim();
    setError("");
    try {
      const itemId = await invoke<number>("add_packing_checklist_item", {
        checklistId: activeChecklist.id,
        label,
        category: "general",
      });
      setActiveChecklist({
        ...activeChecklist,
        items: [
          ...activeChecklist.items,
          { id: itemId, label, category: "general", checked: false, sort_order: activeChecklist.items.length },
        ],
      });
      setNewItemLabel("");
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteItem(itemId: number) {
    if (!activeChecklist) return;
    setError("");
    try {
      await invoke("delete_packing_checklist_item", { itemId });
      setActiveChecklist({
        ...activeChecklist,
        items: activeChecklist.items.filter((item) => item.id !== itemId),
      });
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteChecklist(checklistId: number) {
    if (!window.confirm("Delete this checklist? This cannot be undone.")) return;
    setError("");
    try {
      await invoke("delete_saved_packing_checklist", { checklistId });
      setSavedChecklists(savedChecklists.filter((c) => c.id !== checklistId));
    } catch (e) {
      setError(String(e));
    }
  }

  async function exportCsv() {
    if (!activeChecklist) return;
    setError("");
    setSuccessMsg("");
    try {
      const path = await invoke<string>("export_packing_checklist_csv", {
        checklistId: activeChecklist.id,
      });
      setSuccessMsg(`Exported to ${path}`);
    } catch (e) {
      setError(String(e));
    }
  }

  const categories = activeChecklist
    ? [...new Set(activeChecklist.items.map((i) => i.category))]
    : [];

  const checkedCount = activeChecklist?.items.filter((i) => i.checked).length ?? 0;
  const totalCount = activeChecklist?.items.length ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-gold)] mb-1 print:hidden">
        📦 Packing Checklists
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6 print:hidden">
        Load a template for your trip type and check off items as you pack.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/40 text-red-300 text-sm print:hidden">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded bg-[var(--color-gold)]/20 text-[var(--color-gold)] text-sm print:hidden">
          {successMsg}
        </div>
      )}

      {view === "list" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Your Checklists</h2>
            <button
              onClick={openTemplatePicker}
              disabled={loading}
              className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              + New Checklist
            </button>
          </div>

          {loading && savedChecklists.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
          ) : savedChecklists.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No saved checklists yet. Create one to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedChecklists.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold)] transition-colors"
                >
                  <button onClick={() => openChecklist(c.id)} className="text-left w-full">
                    <div className="text-2xl mb-2">{c.icon}</div>
                    <div className="font-semibold text-[var(--color-text)]">{c.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">
                      {formatDate(c.created_at)} · {c.checked_items}/{c.total_items} packed
                    </div>
                  </button>
                  <button
                    onClick={() => deleteChecklist(c.id)}
                    className="mt-3 text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "templates" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Choose a Template</h2>
            <button
              onClick={() => setView("list")}
              className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
            >
              ← Back
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading templates...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => createFromTemplate(t.id)}
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

      {view === "active" && activeChecklist && (
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
            <div className="flex gap-2 print:hidden">
              <button
                onClick={exportCsv}
                className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
              >
                Print
              </button>
              <button
                onClick={backToList}
                className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)] transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mb-6 print:hidden">
            <div
              className="bg-[var(--color-gold)] h-1.5 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>

          <div className="flex gap-2 mb-6 print:hidden">
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              placeholder="Add an item..."
              className="flex-1 px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-gold)]"
            />
            <button
              onClick={addItem}
              disabled={!newItemLabel.trim()}
              className="px-4 py-2 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-semibold hover:opacity-90 disabled:opacity-50 text-sm"
            >
              + Add
            </button>
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
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold)] transition-colors"
                    >
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(item.id, !item.checked)}
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
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs print:hidden"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}