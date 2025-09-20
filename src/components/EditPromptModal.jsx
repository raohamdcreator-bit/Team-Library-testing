// src/components/EditPromptModal.jsx
import React, { useState, useEffect } from "react";

export default function EditPromptModal({ open, prompt, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title || "");
      setTags(
        Array.isArray(prompt.tags)
          ? prompt.tags.join(", ")
          : (prompt.tags || "").toString()
      );
      setText(prompt.text || "");
    } else {
      setTitle("");
      setTags("");
      setText("");
    }
  }, [prompt]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white w-full max-w-lg p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Edit Prompt</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 mb-2 rounded"
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border p-2 mb-2 rounded"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border p-2 mb-2 rounded"
          rows={6}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                title: title.trim(),
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                text: text.trim(),
              })
            }
            className="px-3 py-1 rounded bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
