// src/components/PromptForm.jsx
import { useState, useEffect } from "react";

export default function PromptForm({
  onSubmit,
  editingPrompt,
  onUpdate,
  onCancel,
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title || "");
      setText(editingPrompt.text || "");
      setTags((editingPrompt.tags || []).join(", "));
    } else {
      setTitle("");
      setText("");
      setTags("");
    }
  }, [editingPrompt]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      alert("Please fill in both title and prompt text");
      return;
    }

    setIsSubmitting(true);

    const prompt = {
      title: title.trim(),
      text: text.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (editingPrompt && onUpdate) {
        await onUpdate(editingPrompt.id, prompt);
      } else if (onSubmit) {
        await onSubmit(prompt);
      }

      // Reset form only if not editing or after successful edit
      if (!editingPrompt) {
        setTitle("");
        setText("");
        setTags("");
      }
    } catch (error) {
      console.error("Error submitting prompt:", error);
      alert("Failed to save prompt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setTitle("");
    setText("");
    setTags("");
    if (onCancel) {
      onCancel();
    }
  }

  const isEditing = Boolean(editingPrompt);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {isEditing ? "Edit Prompt" : "Create New Prompt"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="prompt-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title *
          </label>
          <input
            id="prompt-title"
            type="text"
            placeholder="Enter a descriptive title for your prompt"
            className="form-input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isSubmitting}
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {title.length}/100 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="prompt-text"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Prompt Content *
          </label>
          <textarea
            id="prompt-text"
            placeholder="Enter your AI prompt here..."
            className="form-input w-full min-h-32 resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            disabled={isSubmitting}
            rows={6}
          />
          <p className="text-xs text-gray-500 mt-1">{text.length} characters</p>
        </div>

        <div>
          <label
            htmlFor="prompt-tags"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tags
          </label>
          <input
            id="prompt-tags"
            type="text"
            placeholder="e.g. writing, creative, marketing (comma separated)"
            className="form-input w-full"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Add tags to help organize and find your prompts
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !text.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <div className="spinner"></div>}
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
              ? "Update Prompt"
              : "Create Prompt"}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
          )}

          {!isEditing && (title || text || tags) && (
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setText("");
                setTags("");
              }}
              disabled={isSubmitting}
              className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
