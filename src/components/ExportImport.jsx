// src/components/ExportImport.jsx
import { useState } from "react";

export default function ExportImport({ onImport, teamId, teamName, userRole }) {
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Check if user can import
  function canImport() {
    return (
      userRole === "owner" || userRole === "admin" || userRole === "member"
    );
  }

  // Handle file import
  async function handleFileImport(file) {
    if (!canImport()) {
      alert("You don't have permission to import prompts to this team.");
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      let prompts = [];

      // Parse based on file type
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

      // Validate and clean prompts
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
        .filter((prompt) => prompt.text); // Only keep prompts with text

      if (validPrompts.length === 0) {
        throw new Error("No valid prompts found in the file.");
      }

      // Confirm import
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

  // Parse CSV format
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

  // Parse TXT format (simple format: title on first line, content follows)
  function parseTXT(text) {
    const sections = text
      .split(/\n\s*---\s*\n|\n\s*===\s*\n/)
      .filter((section) => section.trim());

    if (sections.length === 1) {
      // Single prompt
      const lines = sections[0].split("\n").filter((line) => line.trim());
      return [
        {
          title: lines[0] || "Imported Prompt",
          text: lines.slice(1).join("\n").trim() || lines[0] || "",
          tags: [],
        },
      ];
    }

    // Multiple prompts separated by --- or ===
    return sections.map((section, index) => {
      const lines = section.split("\n").filter((line) => line.trim());
      return {
        title: lines[0] || `Imported Prompt ${index + 1}`,
        text: lines.slice(1).join("\n").trim() || lines[0] || "",
        tags: [],
      };
    });
  }

  // Handle drag and drop
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

  // Handle file input
  function handleFileSelect(e) {
    const files = [...e.target.files];
    if (files.length > 0) {
      handleFileImport(files[0]);
    }
    e.target.value = ""; // Reset input
  }

  if (!canImport()) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Import Prompts
      </h3>

      {/* Drag and Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {importing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="spinner"></div>
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <>
            <div className="text-gray-400 text-4xl mb-3">📁</div>
            <p className="text-gray-600 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports JSON, CSV, and TXT files
            </p>

            <label className="btn-primary inline-block cursor-pointer">
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
      <div className="mt-6 space-y-4">
        <h4 className="font-medium text-gray-800">Supported Formats:</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <h5 className="font-medium text-gray-700 mb-2">JSON</h5>
            <code className="text-xs text-gray-600 block">
              {`[{"title": "...", "text": "...", "tags": [...]}]`}
            </code>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <h5 className="font-medium text-gray-700 mb-2">CSV</h5>
            <code className="text-xs text-gray-600 block">
              title,text,tags
              <br />
              "Title","Content","tag1,tag2"
            </code>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <h5 className="font-medium text-gray-700 mb-2">TXT</h5>
            <code className="text-xs text-gray-600 block">
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
