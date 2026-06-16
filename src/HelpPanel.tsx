// src/HelpPanel.tsx
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { helpTopics } from "./helpContent";

interface HelpPanelProps {
  isOpen: boolean;
  activeTopicId: string;
  onSelectTopic: (id: string) => void;
  onClose: () => void;
  isDark: boolean;
}

function getMarkdownComponents(isDark: boolean): Components {
  return {
    h1: ({ children }) => (
      <h1 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 12px" }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "20px 0 8px", color: "#c9922a" }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "16px 0 6px" }}>{children}</h3>
    ),
    p: ({ children }) => (
      <p style={{ margin: "0 0 12px", lineHeight: 1.6 }}>{children}</p>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: "0 0 12px", paddingLeft: "20px" }}>{children}</ul>
    ),
    li: ({ children }) => (
      <li style={{ marginBottom: "4px" }}>{children}</li>
    ),
    strong: ({ children }) => (
      <strong style={{ color: isDark ? "#e8b94a" : "#b07d1a", fontWeight: 600 }}>{children}</strong>
    ),
    code: ({ children }) => (
      <code style={{
        backgroundColor: isDark ? "#162030" : "#e8eef5",
        padding: "2px 5px",
        borderRadius: "4px",
        fontSize: "12.5px",
        fontFamily: "monospace",
      }}>{children}</code>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: "2px solid #c9922a",
        margin: "0 0 12px",
        padding: "4px 12px",
        color: isDark ? "#8fa3b8" : "#4d6278",
      }}>{children}</blockquote>
    ),
    a: ({ href, children }) => (
      <a href={href} style={{ color: "#c9922a" }}>{children}</a>
    ),
  };
}

function HelpPanel({ isOpen, activeTopicId, onSelectTopic, onClose, isDark }: HelpPanelProps) {
  const activeTopic = helpTopics.find((t) => t.id === activeTopicId) ?? helpTopics[0];
  const [searchQuery, setSearchQuery] = useState("");
  const filteredTopics = searchQuery.trim() === ""
    ? helpTopics
    : helpTopics.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.2s ease",
          zIndex: 100,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "640px",
          maxWidth: "90vw",
          backgroundColor: isDark ? "#0f1923" : "#f0f4f8",
          color: isDark ? "#e8edf2" : "#1a2530",
          borderLeft: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gridTemplateRows: "48px 1fr",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          zIndex: 101,
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
        }}
      >
        <div style={{
          gridColumn: "1 / -1",
          backgroundColor: "#1a3a5c",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid #7a541a",
        }}>
          <span style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>❓ Help</span>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.08)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "4px 10px",
              cursor: "pointer",
              color: "#e8edf2",
              fontSize: "13px",
            }}
          >
            Close
          </button>
        </div>

        <div style={{
          backgroundColor: isDark ? "#162030" : "#ffffff",
          borderRight: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
          padding: "12px 0",
          overflowY: "auto",
        }}>
          <div style={{ padding: "0 12px 10px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: isDark ? "#0f1923" : "#f0f4f8",
                border: `0.5px solid ${isDark ? "#243347" : "#ccd8e4"}`,
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "12px",
                color: isDark ? "#e8edf2" : "#1a2530",
                outline: "none",
              }}
            />
          </div>
          {filteredTopics.length === 0 ? (
            <div style={{
              padding: "8px 16px",
              fontSize: "12px",
              color: isDark ? "#8fa3b8" : "#4d6278",
            }}>
              No results for "{searchQuery}"
            </div>
          ) : (
            filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: topic.id === activeTopicId ? "#e8b94a" : (isDark ? "#8fa3b8" : "#4d6278"),
                  borderLeft: topic.id === activeTopicId ? "2px solid #c9922a" : "2px solid transparent",
                  backgroundColor: topic.id === activeTopicId ? (isDark ? "#1d2d3f" : "#e8eef5") : "transparent",
                }}
              >
                {topic.title}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "20px", overflowY: "auto" }}>
          <ReactMarkdown components={getMarkdownComponents(isDark)}>
            {activeTopic.content}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
}

export default HelpPanel;