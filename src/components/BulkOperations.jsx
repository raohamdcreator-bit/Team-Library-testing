// src/components/BulkOperations.jsx
import { useState } from "react";

export default function BulkOperations({
  prompts,
  selectedPrompts,
  onSelectionChange,
  onBulkDelete,
  onBulkExport,
  userRole,
  userId,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user can perform bulk operations
  function canBulkDelete() {
    if (userRole === "owner" || userRole === "admin") return true;
    // Members can only delete their own prompts
    return selectedPrompts.every((promptId) => {
      const prompt = prompts.find((p) => p.id === promptId);
      return prompt && prompt.createdBy === userId;
    });
  }

  // Get selection stats
  const selectionStats = {
    total: selectedPrompts.length,
    ownedByUser: selectedPrompts.filter((promptId) => {
      const prompt = prompts.find((p) => p.id === promptId);
      return prompt && prompt.createdBy === userId;
    }).length,
    ownedByOthers: selectedPrompts.filter((promptId) => {
      const prompt = prompts.find((p) => p.id === promptId);
      return prompt && prompt.createdBy !== userId;
    }).length,
  };

  // Select all prompts
  function handleSelectAll() {
    if (selectedPrompts.length === prompts.length) {
      onSelectionChange([]); // Deselect all
    } else {
      onSelectionChange(prompts.map((p) => p.id)); // Select all
    }
  }

  // Handle bulk delete
  async function handleBulkDelete() {
    if (!canBulkDelete()) {
      alert(
        "You can only delete prompts you created or have admin permissions."
      );
      return;
    }

    const confirmMessage =
      selectionStats.ownedByOthers > 0
        ? `Delete ${selectionStats.total} prompts? This includes ${selectionStats.ownedByOthers} prompts created by other team members. This cannot be undone.`
        : `Delete ${selectionStats.total} selected prompts? This cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      await onBulkDelete(selectedPrompts);
      onSelectionChange([]); // Clear selection after deletion
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("Failed to delete some prompts. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Handle bulk export
  async function handleBulkExport(format) {
    setIsExporting(true);
    try {
      const selectedPromptData = prompts.filter((p) =>
        selectedPrompts.includes(p.id)
      );
      await onBulkExport(selectedPromptData, format);
    } catch (error) {
      console.error("Bulk export error:", error);
      alert("Failed to export prompts. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  if (prompts.length === 0) return null;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4 shadow-sm">
      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                selectedPrompts.length === prompts.length && prompts.length > 0
              }
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({prompts.length})
            </span>
          </label>

          {selectedPrompts.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedPrompts.length} selected
              {selectionStats.ownedByOthers > 0 && (
                <span className="ml-2 text-amber-600">
                  ({selectionStats.ownedByOthers} by others)
                </span>
              )}
            </div>
          )}
        </div>

        {selectedPrompts.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 rounded transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedPrompts.length > 0 && (
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Bulk Actions:
          </span>

          {/* Export Options */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkExport("json")}
              disabled={isExporting}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
            >
              {isExporting && <div className="spinner"></div>}
              Export JSON
            </button>

            <button
              onClick={() => handleBulkExport("csv")}
              disabled={isExporting}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
            >
              {isExporting && <div className="spinner"></div>}
              Export CSV
            </button>

            <button
              onClick={() => handleBulkExport("txt")}
              disabled={isExporting}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
            >
              {isExporting && <div className="spinner"></div>}
              Export TXT
            </button>
          </div>

          {/* Delete Option */}
          {canBulkDelete() && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="btn-danger text-sm px-3 py-1.5 flex items-center gap-1 ml-2"
            >
              {isDeleting && <div className="spinner"></div>}
              Delete Selected
            </button>
          )}

          {!canBulkDelete() && selectionStats.ownedByOthers > 0 && (
            <span className="text-xs text-amber-600 ml-2">
              Cannot delete prompts created by others
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Individual prompt selection checkbox component
export function PromptSelector({
  promptId,
  isSelected,
  onSelectionChange,
  className = "",
}) {
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelectionChange(promptId, e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        onClick={(e) => e.stopPropagation()} // Prevent event bubbling
      />
    </label>
  );
}
