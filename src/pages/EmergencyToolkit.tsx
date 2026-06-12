import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  isDark: boolean;
  profileId: number;
}

interface ContactMeta {
  id: number;
  label: string;
  created_at: string;
}

interface ContactDetail extends ContactMeta {
  body: string;
}

interface ChecklistItem {
  id: number;
  category: string;
  label: string;
  completed: boolean;
  sort_order: number;
}

const DEFAULT_CHECKLIST: { category: string; label: string }[] = [
  { category: "digital", label: "Back up encrypted journal to USB drive" },
  { category: "digital", label: "Log out of all cloud services" },
  { category: "digital", label: "Enable full-disk encryption (BitLocker / FileVault)" },
  { category: "digital", label: "Remove saved Wi-Fi networks" },
  { category: "digital", label: "Clear browser history and cookies" },
  { category: "financial", label: "Notify bank of travel destination" },
  { category: "financial", label: "Note local emergency cash amount and location" },
  { category: "financial", label: "Screenshot or print crypto wallet recovery phrase (store separately)" },
  { category: "documents", label: "Photograph all travel documents (passport, visa, insurance)" },
  { category: "documents", label: "Store document copies in encrypted journal" },
  { category: "documents", label: "Note nearest embassy address and phone number" },
  { category: "emergency", label: "Share itinerary with trusted contact at home" },
  { category: "emergency", label: "Confirm emergency contact details are up to date" },
  { category: "emergency", label: "Know local emergency number (not always 911)" },
  { category: "emergency", label: "Identify nearest hospital to accommodation" },
];

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "digital", label: "Digital Security", icon: "💻" },
  { key: "financial", label: "Financial", icon: "💰" },
  { key: "documents", label: "Documents", icon: "📄" },
  { key: "emergency", label: "Emergency", icon: "🚨" },
  { key: "general", label: "General", icon: "📋" },
];

export default function EmergencyToolkit({ isDark, profileId }: Props) {
  const [activeTab, setActiveTab] = useState<"contacts" | "checklist" | "delete">("checklist");
  const [contacts, setContacts] = useState<ContactMeta[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newBody, setNewBody] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("general");
  const [showNewItem, setShowNewItem] = useState(false);
  const [salt, setSalt] = useState("");
  const seedRan = useRef(false);

  const card = {
    backgroundColor: isDark ? "#162030" : "#ffffff",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "10px",
    padding: "16px",
  };

  const input = {
    width: "100%",
    backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
    border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    borderRadius: "6px",
    padding: "8px 10px",
    color: isDark ? "#e8edf2" : "#1a2530",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  useEffect(() => {
    invoke<[number, string]>("ensure_profile", { name: "Marc" })
      .then(([, s]) => setSalt(s))
      .catch((e) => setError(String(e)));

    invoke<ChecklistItem[]>("list_checklist_items", { profileId })
      .then((items) => {
        if (items.length === 0 && !seedRan.current) {
          seedRan.current = true;
          seedDefaultChecklist();
        } else {
          setChecklist(items);
        }
      })
      .catch((e) => setError(String(e)));
  }, [profileId]);

  async function seedDefaultChecklist() {
    for (const item of DEFAULT_CHECKLIST) {
      await invoke("create_checklist_item", {
        profileId,
        category: item.category,
        label: item.label,
      }).catch(() => {});
    }
    const items = await invoke<ChecklistItem[]>("list_checklist_items", { profileId });
    setChecklist(items);
  }

  async function unlock() {
    if (!passphrase.trim()) return;
    setLoading(true);
    setError("");
    try {
      const list = await invoke<ContactMeta[]>("list_contacts", { profileId });
      setContacts(list);
      setUnlocked(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function viewContact(id: number) {
    setLoading(true);
    setError("");
    try {
      const contact = await invoke<ContactDetail>("get_contact", {
        contactId: id,
        passphrase,
        salt,
      });
      setSelectedContact(contact);
    } catch (e) {
      setError("Could not decrypt contact. Wrong passphrase?");
    } finally {
      setLoading(false);
    }
  }

  async function saveContact() {
    if (!newLabel.trim() || !newBody.trim()) return;
    setLoading(true);
    setError("");
    try {
      await invoke("create_contact", {
        profileId,
        passphrase,
        salt,
        label: newLabel,
        body: newBody,
      });
      const list = await invoke<ContactMeta[]>("list_contacts", { profileId });
      setContacts(list);
      setNewLabel("");
      setNewBody("");
      setShowNewContact(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteContact(id: number) {
    try {
      await invoke("delete_contact", { contactId: id });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch (e) {
      setError(String(e));
    }
  }

  async function toggleItem(id: number, completed: boolean) {
    const nowCompleted = !completed;
    setChecklist((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: nowCompleted } : i))
    );
    try {
      await invoke("toggle_checklist_item", { itemId: id, completed: nowCompleted });
    } catch (e) {
      setChecklist((prev) =>
        prev.map((i) => (i.id === id ? { ...i, completed } : i))
      );
      setError(String(e));
    }
  }

  async function addChecklistItem() {
    if (!newItemLabel.trim()) return;
    try {
      await invoke("create_checklist_item", {
        profileId,
        category: newItemCategory,
        label: newItemLabel,
      });
      const items = await invoke<ChecklistItem[]>("list_checklist_items", { profileId });
      setChecklist(items);
      setNewItemLabel("");
      setShowNewItem(false);
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteChecklistItem(id: number) {
    try {
      await invoke("delete_checklist_item", { itemId: id });
      setChecklist((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }

  async function resetChecklist() {
    try {
      await invoke("reset_checklist", { profileId });
      setChecklist((prev) => prev.map((i) => ({ ...i, completed: false })));
    } catch (e) {
      setError(String(e));
    }
  }

  const completedCount = checklist.filter((i) => i.completed).length;

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: checklist.filter((i) => i.category === cat.key),
  })).filter((g) => g.items.length > 0);

  const tabStyle = (tab: string) => ({
    flex: 1, padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
    cursor: "pointer",
    border: activeTab === tab ? "1.5px solid #c9922a" : `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
    backgroundColor: activeTab === tab ? (isDark ? "#1d2d3f" : "#fdf3e3") : (isDark ? "#162030" : "#ffffff"),
    color: activeTab === tab ? "#c9922a" : (isDark ? "#8fa3b8" : "#4d6278"),
  });

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 500 }}>Emergency Toolkit</div>
        <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginTop: "2px" }}>
          Encrypted contacts, exit checklists, and secure deletion guides
        </div>
      </div>

      {error && <div style={{ fontSize: "12px", color: "#e05c5c", marginBottom: "12px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setActiveTab("checklist")} style={tabStyle("checklist")}>
          Exit Checklist {completedCount > 0 && `(${completedCount}/${checklist.length})`}
        </button>
        <button onClick={() => setActiveTab("contacts")} style={tabStyle("contacts")}>
          Encrypted Contacts
        </button>
        <button onClick={() => setActiveTab("delete")} style={tabStyle("delete")}>
          Secure Delete Guide
        </button>
      </div>

      {/* EXIT CHECKLIST TAB */}
      {activeTab === "checklist" && (
        <div>
          <div style={{ ...card, marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>Pre-departure progress</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#c9922a", fontWeight: 500 }}>
                  {completedCount} / {checklist.length}
                </span>
                <button
                  onClick={resetChecklist}
                  style={{ background: "none", border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`, borderRadius: "4px", padding: "2px 8px", fontSize: "11px", cursor: "pointer", color: isDark ? "#8fa3b8" : "#4d6278" }}
                >
                  Reset
                </button>
              </div>
            </div>
            <div style={{ height: "6px", borderRadius: "3px", backgroundColor: isDark ? "#243347" : "#e0e8f0" }}>
              <div style={{
                height: "100%", borderRadius: "3px",
                backgroundColor: completedCount === checklist.length && checklist.length > 0 ? "#1a7a4a" : "#c9922a",
                width: checklist.length > 0 ? `${Math.round((completedCount / checklist.length) * 100)}%` : "0%",
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>

          {grouped.map((group) => (
            <div key={group.key} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#c9922a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {group.icon} {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id, item.completed)}
                    style={{
                      ...card, padding: "10px 12px",
                      display: "flex", alignItems: "center", gap: "10px",
                      backgroundColor: item.completed ? (isDark ? "rgba(26,122,74,0.1)" : "#f0fdf6") : (isDark ? "#162030" : "#ffffff"),
                      border: `0.5px solid ${item.completed ? (isDark ? "rgba(26,122,74,0.3)" : "#a8e6c4") : (isDark ? "#243347" : "#ccd8e4")}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                      border: item.completed ? "none" : `1.5px solid ${isDark ? "#4d6278" : "#8fa3b8"}`,
                      backgroundColor: item.completed ? "#1a7a4a" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {item.completed && <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{
                      fontSize: "13px", flex: 1,
                      color: item.completed ? (isDark ? "#3ecf8e" : "#1a7a4a") : (isDark ? "#e8edf2" : "#1a2530"),
                      textDecoration: item.completed ? "line-through" : "none",
                    }}>
                      {item.label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChecklistItem(item.id); }}
                      style={{ background: "none", border: "none", color: isDark ? "#4d6278" : "#8fa3b8", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {showNewItem ? (
            <div style={{ ...card, marginTop: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "10px" }}>Add checklist item</div>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                style={{ ...input, marginBottom: "8px" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <input
                placeholder="Item label"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                style={{ ...input, marginBottom: "10px" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={addChecklistItem} style={{ backgroundColor: "#c9922a", color: "#0f1923", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                  Add
                </button>
                <button onClick={() => setShowNewItem(false)} style={{ background: "none", border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`, borderRadius: "6px", padding: "7px 14px", fontSize: "13px", cursor: "pointer", color: isDark ? "#8fa3b8" : "#4d6278" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewItem(true)}
              style={{ marginTop: "8px", background: "none", border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`, borderRadius: "6px", padding: "7px 14px", fontSize: "13px", cursor: "pointer", color: isDark ? "#8fa3b8" : "#4d6278" }}
            >
              + Add item
            </button>
          )}
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === "contacts" && (
        <div>
          {!unlocked ? (
            <div style={{ maxWidth: "360px", margin: "0 auto" }}>
              <div style={card}>
                <div style={{ fontSize: "15px", fontWeight: 500, marginBottom: "4px" }}>Encrypted Contacts</div>
                <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", marginBottom: "16px" }}>
                  Enter your passphrase to view and manage contacts
                </div>
                <input
                  type="password"
                  placeholder="Passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && unlock()}
                  style={input}
                />
                {error && <div style={{ fontSize: "12px", color: "#e05c5c", marginTop: "8px" }}>{error}</div>}
                <button
                  onClick={unlock}
                  disabled={loading}
                  style={{ marginTop: "12px", width: "100%", backgroundColor: "#c9922a", color: "#0f1923", border: "none", borderRadius: "6px", padding: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
                >
                  {loading ? "Unlocking..." : "Unlock Contacts"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {selectedContact ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button onClick={() => setSelectedContact(null)} style={{ background: "none", border: "none", color: "#c9922a", cursor: "pointer", fontSize: "13px" }}>
                        Back
                      </button>
                      <div style={{ fontSize: "16px", fontWeight: 500 }}>{selectedContact.label}</div>
                    </div>
                    <button onClick={() => deleteContact(selectedContact.id)} style={{ background: "none", border: "none", color: "#e05c5c", cursor: "pointer", fontSize: "12px" }}>
                      Delete
                    </button>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginBottom: "12px" }}>{selectedContact.created_at}</div>
                    <div style={{ fontSize: "13px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{selectedContact.body}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ fontSize: "13px", color: isDark ? "#8fa3b8" : "#4d6278" }}>
                      {contacts.length} encrypted {contacts.length === 1 ? "contact" : "contacts"}
                    </div>
                    <button
                      onClick={() => setShowNewContact(true)}
                      style={{ backgroundColor: "#c9922a", color: "#0f1923", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
                    >
                      + New contact
                    </button>
                  </div>

                  {showNewContact && (
                    <div style={{ ...card, marginBottom: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "10px" }}>New encrypted contact</div>
                      <input
                        placeholder="Label (e.g. Embassy Lisbon)"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        style={{ ...input, marginBottom: "8px" }}
                      />
                      <textarea
                        placeholder="Contact details (phone, address, notes)..."
                        value={newBody}
                        onChange={(e) => setNewBody(e.target.value)}
                        rows={6}
                        style={{ ...input, resize: "vertical", lineHeight: 1.6 }}
                      />
                      {error && <div style={{ fontSize: "12px", color: "#e05c5c", marginTop: "8px" }}>{error}</div>}
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button onClick={saveContact} disabled={loading} style={{ backgroundColor: "#c9922a", color: "#0f1923", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                          {loading ? "Saving..." : "Save encrypted"}
                        </button>
                        <button onClick={() => setShowNewContact(false)} style={{ background: "none", border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`, borderRadius: "6px", padding: "7px 14px", fontSize: "13px", cursor: "pointer", color: isDark ? "#8fa3b8" : "#4d6278" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {contacts.length === 0 ? (
                    <div style={{ ...card, textAlign: "center", padding: "40px", color: isDark ? "#4d6278" : "#8fa3b8" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔐</div>
                      <div style={{ fontSize: "13px" }}>No contacts yet. Add embassy numbers, family contacts, and emergency services.</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {contacts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => viewContact(c.id)}
                          style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "2px solid #c9922a" }}
                        >
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 500 }}>{c.label}</div>
                            <div style={{ fontSize: "11px", color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "3px" }}>{c.created_at}</div>
                          </div>
                          <span style={{ fontSize: "11px", color: "#c9922a" }}>🔒</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECURE DELETE GUIDE TAB */}
      {activeTab === "delete" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ ...card, borderLeft: "2px solid #e05c5c" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Windows — Secure file deletion</div>
            <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.7, marginBottom: "10px" }}>
              Windows does not have a built-in secure delete. Use SDelete from Microsoft Sysinternals. Run in PowerShell as Administrator:
            </div>
            <div style={{ backgroundColor: isDark ? "#0f1923" : "#f0f4f8", borderRadius: "6px", padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#3ecf8e" }}>
              <div>sdelete -p 3 -s C:\path\to\folder</div>
              <div style={{ color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "4px" }}># -p 3 = 3 overwrite passes</div>
              <div style={{ color: isDark ? "#4d6278" : "#8fa3b8" }}># -s = include subdirectories</div>
            </div>
          </div>

          <div style={{ ...card, borderLeft: "2px solid #e05c5c" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>macOS — Secure file deletion</div>
            <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.7, marginBottom: "10px" }}>
              Use the srm command or rm with overwrite. For SSDs, full-disk encryption (FileVault) is more effective than file-level deletion.
            </div>
            <div style={{ backgroundColor: isDark ? "#0f1923" : "#f0f4f8", borderRadius: "6px", padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#3ecf8e" }}>
              <div>srm -rf /path/to/folder</div>
              <div style={{ color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "4px" }}># srm = secure remove</div>
              <div style={{ color: isDark ? "#4d6278" : "#8fa3b8" }}># -r = recursive, -f = force</div>
            </div>
          </div>

          <div style={{ ...card, borderLeft: "2px solid #e05c5c" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>Linux — Secure file deletion</div>
            <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.7, marginBottom: "10px" }}>
              Use shred for files or wipe for directories. On SSDs, encryption at rest is the recommended approach.
            </div>
            <div style={{ backgroundColor: isDark ? "#0f1923" : "#f0f4f8", borderRadius: "6px", padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: "#3ecf8e" }}>
              <div>shred -vzu -n 3 filename</div>
              <div style={{ color: isDark ? "#4d6278" : "#8fa3b8", marginTop: "4px" }}># -v = verbose, -z = zero after</div>
              <div style={{ color: isDark ? "#4d6278" : "#8fa3b8" }}># -u = delete after, -n 3 = 3 passes</div>
            </div>
          </div>

          <div style={{ ...card, backgroundColor: isDark ? "rgba(201,146,42,0.08)" : "#fdf3e3", border: `0.5px solid ${isDark ? "#7a541a" : "#e8d5a8"}` }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#c9922a", marginBottom: "6px" }}>SSD note</div>
            <div style={{ fontSize: "12px", color: isDark ? "#8fa3b8" : "#4d6278", lineHeight: 1.7 }}>
              On SSDs, overwrite-based deletion is unreliable due to wear leveling. The most effective protection is full-disk encryption enabled before storing sensitive data. If the drive is encrypted, deletion of the encryption key renders all data unrecoverable.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}