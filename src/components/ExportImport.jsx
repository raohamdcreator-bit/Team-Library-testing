// src/components/ExportImport.jsx - Updated to match futuristic AI theme
import { useState } from "react";

export default function ExportImport({ onImport, teamId, teamName, userRole }) {
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  function canImport() {
    return (
      userRole === "owner" || userRole === "admin" || userRole === "member"
    );
  }

  async function handleFileImport(file) {
    if (!canImport()) {
      alert("You don't have permission to import prompts to this team.");
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      let prompts = [];

      if (file.name.toLowerCase().endsWith(".json")) {
        try {
          const data = JSON.parse(text);
          prompts = Array.isArray(data) ? data : [data];
        } catch (e) {
          throw new Error("Invalid JSON format");
        }
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        prompts = parseCSV(text);
      } else if (file.name.toLowerCase().endsWith(".txt")) {
        prompts = parseTXT(text);
      } else {
        throw new Error(
          "Unsupported file format. Please use JSON, CSV, or TXT files."
        );
      }

      const validPrompts = prompts
        .filter((prompt) => prompt && (prompt.title || prompt.text))
        .map((prompt) => ({
          title: String(prompt.title || "").trim() || "Untitled Prompt",
          text: String(prompt.text || "").trim() || "",
          tags: Array.isArray(prompt.tags)
            ? prompt.tags.filter((tag) => typeof tag === "string" && tag.trim())
            : typeof prompt.tags === "string"
            ? prompt.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        }))
        .filter((prompt) => prompt.text);

      if (validPrompts.length === 0) {
        throw new Error("No valid prompts found in the file.");
      }

      const confirmMessage = `Import ${validPrompts.length} prompts to "${teamName}"?`;
      if (!confirm(confirmMessage)) return;

      await onImport(validPrompts);
      alert(`Successfully imported ${validPrompts.length} prompts!`);
    } catch (error) {
      console.error("Import error:", error);
      alert("Import failed: " + (error.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  }

  function parseCSV(text) {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const titleIndex = headers.findIndex(
      (h) => h.includes("title") || h.includes("name")
    );
    const textIndex = headers.findIndex(
      (h) => h.includes("text") || h.includes("content") || h.includes("prompt")
    );
    const tagsIndex = headers.findIndex((h) => h.includes("tag"));

    if (textIndex === -1) {
      throw new Error(
        "CSV must have a column for prompt text (e.g., 'text', 'content', 'prompt')"
      );
    }

    return lines.slice(1).map((line) => {
      const cols = line
        .split(",")
        .map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
      return {
        title: titleIndex >= 0 ? cols[titleIndex] : "",
        text: cols[textIndex] || "",
        tags: tagsIndex >= 0 ? cols[tagsIndex] : "",
      };
    });
  }

  function parseTXT(text) {
    const sections = text
      .split(/\n\s*---\s*\n|\n\s*===\s*\n/)
      .filter((section) => section.trim());

    if (sections.length === 1) {
      const lines = sections[0].split("\n").filter((line) => line.trim());
      return [
        {
          title: lines[0] || "Imported Prompt",
          text: lines.slice(1).join("\n").trim() || lines[0] || "",
          tags: [],
        },
      ];
    }

    return sections.map((section, index) => {
      const lines = section.split("\n").filter((line) => line.trim());
      return {
        title: lines[0] || `Imported Prompt ${index + 1}`,
        text: lines.slice(1).join("\n").trim() || lines[0] || "",
        tags: [],
      };
    });
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = [...e.dataTransfer.files];
    if (files.length > 0) {
      handleFileImport(files[0]);
    }
  }

  function handleFileSelect(e) {
    const files = [...e.target.files];
    if (files.length > 0) {
      handleFileImport(files[0]);
    }
    e.target.value = "";
  }

  if (!canImport()) return null;

  return (
    <div 
      className="mt-6 p-6 rounded-xl backdrop-blur-sm border border-gray-600/50 shadow-2xl shadow-blue-900/20 transition-all duration-300 hover:shadow-cyan-500/10"
      style={{
        background: "linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.9) 100%)",
        animation: "fadeIn 0.5s ease-out",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-transform duration-300 hover:scale-110 hover:rotate-12">
          <span className="text-xs text-white font-bold">📥</span>
        </div>
        <h3 className="text-lg font-bold text-cyan-100">
          Import Prompts
        </h3>
      </div>

      {/* Drag and Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? "border-cyan-400 bg-cyan-400/10 scale-105 shadow-lg shadow-cyan-500/25"
            : "border-gray-600/50 hover:border-cyan-400/50 hover:bg-gray-800/40"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          background: dragActive 
            ? "linear-gradient(135deg, rgba(0, 200, 255, 0.1) 0%, rgba(59, 130, 246, 0.15) 100%)"
            : "linear-gradient(135deg, rgba(17, 24, 39, 0.4) 0%, rgba(31, 41, 55, 0.6) 100%)",
        }}
      >
        {importing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-lg shadow-cyan-500/25"></div>
            <p className="text-cyan-100 font-medium">Processing file...</p>
            <p className="text-gray-400 text-sm">Neural network analyzing data...</p>
          </div>
        ) : (
          <>
            <div 
              className="text-6xl mb-4 transition-transform duration-300 hover:scale-110 inline-block"
              style={{ filter: "drop-shadow(0 0 20px rgba(0, 200, 255, 0.3))" }}
            >
              📁
            </div>
            <p className="text-cyan-100 mb-2 font-semibold text-lg">
              {dragActive ? "Drop file to upload" : "Drop files here or click to browse"}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Supports JSON, CSV, and TXT files
            </p>

            <label className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 font-semibold shadow-lg shadow-cyan-500/25 border border-cyan-400/30 cursor-pointer hover:scale-105 active:scale-95">
              <span className="text-lg">⬆️</span>
              Choose File
              <input
                type="file"
                accept=".json,.csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>

      {/* Format Instructions */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></div>
          <h4 className="font-semibold text-cyan-100">Supported Formats</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* JSON Format */}
          <div 
            className="bg-gray-800/60 p-4 rounded-lg border border-gray-600/50 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(17, 24, 39, 0.6) 0%, rgba(31, 41, 55, 0.8) 100%)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📋</span>
              <h5 className="font-semibold text-cyan-100">JSON</h5>
            </div>
            <code className="text-xs text-gray-300 block bg-gray-900/60 p-3 rounded border border-gray-700/50 font-mono leading-relaxed">
              {`[{\n  "title": "...",\n  "text": "...",\n  "tags": [...]\n}]`}
            </code>
          </div>

          {/* CSV Format */}
          <div 
            className="bg-gray-800/60 p-4 rounded-lg border border-gray-600/50 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(17, 24, 39, 0.6) 0%, rgba(31, 41, 55, 0.8) 100%)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📊</span>
              <h5 className="font-semibold text-cyan-100">CSV</h5>
            </div>
            <code className="text-xs text-gray-300 block bg-gray-900/60 p-3 rounded border border-gray-700/50 font-mono leading-relaxed">
              title,text,tags
              <br />
              "Title","Content","tag1,tag2"
            </code>
          </div>

          {/* TXT Format */}
          <div 
            className="bg-gray-800/60 p-4 rounded-lg border border-gray-600/50 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(17, 24, 39, 0.6) 0%, rgba(31, 41, 55, 0.8) 100%)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📝</span>
              <h5 className="font-semibold text-cyan-100">TXT</h5>
            </div>
            <code className="text-xs text-gray-300 block bg-gray-900/60 p-3 rounded border border-gray-700/50 font-mono leading-relaxed">
              Title
              <br />
              Content here
              <br />
              ---
              <br />
              Next Title
              <br />
              Next content
            </code>
          </div>
        </div>

        {/* Tips Section */}
        <div 
          className="mt-6 p-4 rounded-lg border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm"
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 200, 255, 0.15) 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h5 className="font-semibold text-cyan-100 mb-2">Pro Tips</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>Ensure your CSV has headers for proper field mapping</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>Use --- or === to separate multiple prompts in TXT files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>JSON arrays allow batch importing multiple prompts at once</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export utility functions
export const ExportUtils = {
  // Export prompts as JSON
  exportAsJSON(prompts, filename = "prompts") {
    const data = prompts.map((prompt) => ({
      title: prompt.title,
      text: prompt.text,
      tags: prompt.tags || [],
      createdAt: prompt.createdAt
        ? prompt.createdAt.toDate().toISOString()
        : null,
      author: prompt.createdBy,
    }));

    this.downloadFile(
      JSON.stringify(data, null, 2),
      `${filename}.json`,
      "application/json"
    );
  },

  // Export prompts as CSV
  exportAsCSV(prompts, filename = "prompts") {
    const headers = ["title", "text", "tags", "created_date", "author"];
    const rows = prompts.map((prompt) => [
      this.escapeCSV(prompt.title || ""),
      this.escapeCSV(prompt.text || ""),
      this.escapeCSV((prompt.tags || []).join(", ")),
      prompt.createdAt ? prompt.createdAt.toDate().toLocaleDateString() : "",
      prompt.createdBy || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    this.downloadFile(csvContent, `${filename}.csv`, "text/csv");
  },

  // Export prompts as TXT
  exportAsTXT(prompts, filename = "prompts") {
    const content = prompts
      .map((prompt) => {
        let section = prompt.title || "Untitled Prompt";
        section += "\n" + (prompt.text || "");
        if (prompt.tags && prompt.tags.length > 0) {
          section += "\nTags: " + prompt.tags.join(", ");
        }
        return section;
      })
      .join("\n\n---\n\n");

    this.downloadFile(content, `${filename}.txt`, "text/plain");
  },

  // Helper function to escape CSV values
  escapeCSV(value) {
    if (typeof value !== "string") return '""';
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return `"${value}"`;
  },

  // Helper function to download file
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// Add keyframe animations to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  if (!document.querySelector('style[data-export-import-styles]')) {
    style.setAttribute('data-export-import-styles', 'true');
    document.head.appendChild(style);
  }
}
