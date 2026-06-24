"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FONT } from "@/lib/ui";

/** Renders the streamed answer as markdown, restyled to match the app. */
export function StreamingMarkdown({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: 15, color: "#000", lineHeight: 1.6 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ margin: "0 0 10px" }}>{children}</p>,
          h1: ({ children }) => <h1 style={{ fontSize: 22, fontWeight: 600, margin: "14px 0 8px" }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 19, fontWeight: 600, margin: "14px 0 8px" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 600, margin: "12px 0 6px" }}>{children}</h3>,
          ul: ({ children }) => <ul style={{ margin: "0 0 10px", paddingLeft: 20 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "0 0 10px", paddingLeft: 20 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" style={{ color: "#3D6FB4", textDecoration: "underline" }}>
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 13,
                background: "#f5f5f5",
                borderRadius: 5,
                padding: "1px 5px",
              }}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: "3px solid #ececec", margin: "0 0 10px", padding: "2px 0 2px 12px", color: "rgba(0,0,0,0.6)" }}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: 10 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{ border: "1px solid #ececec", padding: "6px 10px", textAlign: "left", fontWeight: 600, background: "#fafafa" }}>
              {children}
            </th>
          ),
          td: ({ children }) => <td style={{ border: "1px solid #ececec", padding: "6px 10px" }}>{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
