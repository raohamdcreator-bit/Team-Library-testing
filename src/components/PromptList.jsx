// src/components/PromptList.jsx - Enhanced with futuristic AI theme
import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { savePrompt, updatePrompt, deletePrompt } from "../lib/prompts";
import EditPromptModal from "./EditPromptModal";
import Comments from "./Comments";
import { FavoriteButton } from "./Favorites";
import { CompactAITools } from "./AIModelTools";
import AdvancedSearch from "./AdvancedSearch";
import BulkOperations, { PromptSelector } from "./BulkOperations";
import ExportImport, { ExportUtils } from "./ExportImport";
import usePagination, { PaginationControls } from "../hooks/usePagination";
import AIPromptEnhancer from "./AIPromptEnhancer";

export default function PromptList({ activeTeam, userRole }) {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPrompt, setNewPrompt] = useState({ title: "", tags: "", text: "" });
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedPromptId, setExpandedPromptId] = useState(null);
  const [showComments, setShowComments] = useState({});
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);
  const [currentPromptForAI, setCurrentPromptForAI] = useState(null);

  // Pagination
  const pagination = usePagination(filteredPrompts, 10);

  // Load prompts from Firestore
  useEffect(() => {
    if (!activeTeam) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "teams", activeTeam, "prompts"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          teamId: activeTeam,
          ...d.data(),
        }));
        setPrompts(data);
        setFilteredPrompts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading prompts:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeTeam]);

  // Load team member profiles for avatars
  useEffect(() => {
    async function loadMembers() {
      if (!activeTeam) return;

      try {
        const teamDoc = await getDoc(doc(db, "teams", activeTeam));
        if (!teamDoc.exists()) return;

        const teamData = teamDoc.data();
        const memberIds = Object.keys(teamData.members || {});
        const profiles = {};

        for (const memberId of memberIds) {
          try {
            const userDoc = await getDoc(doc(db, "users", memberId));
            if (userDoc.exists()) {
              profiles[memberId] = userDoc.data();
            }
          } catch (error) {
            console.error("Error loading member profile:", error);
          }
        }

        setTeamMembers(profiles);
      } catch (error) {
        console.error("Error loading team members:", error);
      }
    }

    loadMembers();
  }, [activeTeam]);

  // Handle filtered results from search
  function handleFilteredResults(filtered) {
    setFilteredPrompts(filtered);
  }

  // Create new prompt
  async function handleCreate(e) {
    e?.preventDefault();
    if (!newPrompt.title.trim() || !newPrompt.text.trim()) {
      alert("Title and prompt text are required");
      return;
    }

    try {
      await savePrompt(
        user.uid,
        {
          title: newPrompt.title.trim(),
          text: newPrompt.text.trim(),
          tags: newPrompt.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        activeTeam
      );

      setNewPrompt({ title: "", tags: "", text: "" });
      setShowCreateForm(false);
      showNotification("✅ Prompt created successfully!", "success");
    } catch (error) {
      console.error("Error creating prompt:", error);
      showNotification("❌ Failed to create prompt", "error");
    }
  }

  // Update existing prompt
  async function handleUpdate(promptId, updates) {
    try {
      await updatePrompt(activeTeam, promptId, updates);
      setShowEditModal(false);
      setEditingPrompt(null);
      showNotification("✅ Prompt updated successfully!", "success");
    } catch (error) {
      console.error("Error updating prompt:", error);
      showNotification("❌ Failed to update prompt", "error");
    }
  }

  // Delete prompt
  async function handleDelete(promptId) {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    if (
      prompt.createdBy !== user.uid &&
      userRole !== "owner" &&
      userRole !== "admin"
    ) {
      alert("You don't have permission to delete this prompt");
      return;
    }

    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      await deletePrompt(activeTeam, promptId);
      showNotification("🗑️ Prompt deleted", "success");
    } catch (error) {
      console.error("Error deleting prompt:", error);
      showNotification("❌ Failed to delete prompt", "error");
    }
  }

  // Copy prompt to clipboard
  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showNotification("📋 Copied to clipboard!", "success");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      showNotification("❌ Failed to copy", "error");
    }
  }

  // Toggle comments
  function toggleComments(promptId) {
    setShowComments((prev) => ({
      ...prev,
      [promptId]: !prev[promptId],
    }));
  }

  // Bulk operations
  function handleSelectionChange(promptId, isSelected) {
    setSelectedPrompts((prev) =>
      isSelected ? [...prev, promptId] : prev.filter((id) => id !== promptId)
    );
  }

  async function handleBulkDelete(promptIds) {
    try {
      await Promise.all(
        promptIds.map((id) => deletePrompt(activeTeam, id))
      );
      setSelectedPrompts([]);
      showNotification(
        `🗑️ Deleted ${promptIds.length} prompts`,
        "success"
      );
    } catch (error) {
      console.error("Bulk delete error:", error);
      showNotification("❌ Some prompts failed to delete", "error");
    }
  }

  function handleBulkExport(promptsToExport, format) {
    const filename = `prompts-${new Date().toISOString().split("T")[0]}`;
    switch (format) {
      case "json":
        ExportUtils.exportAsJSON(promptsToExport, filename);
        break;
      case "csv":
        ExportUtils.exportAsCSV(promptsToExport, filename);
        break;
      case "txt":
        ExportUtils.exportAsTXT(promptsToExport, filename);
        break;
    }
    showNotification(`📥 Exported ${promptsToExport.length} prompts`, "success");
  }

  // Import prompts
  async function handleImport(importedPrompts) {
    let successCount = 0;
    let failCount = 0;

    for (const prompt of importedPrompts) {
      try {
        await savePrompt(user.uid, prompt, activeTeam);
        successCount++;
      } catch (error) {
        console.error("Import error:", error);
        failCount++;
      }
    }

    if (successCount > 0) {
      showNotification(
        `✅ Imported ${successCount} prompts${failCount > 0 ? `, ${failCount} failed` : ""}`,
        successCount > failCount ? "success" : "error"
      );
    }
  }

  // Handle AI Enhancement
  function handleAIEnhance(prompt) {
    setCurrentPromptForAI(prompt);
    setShowAIEnhancer(true);
  }

  // Apply AI Enhanced Prompt
  async function handleApplyAIEnhancement(enhancedPrompt) {
    try {
      await updatePrompt(activeTeam, enhancedPrompt.id, {
        text: enhancedPrompt.text,
        title: enhancedPrompt.title,
      });
      setShowAIEnhancer(false);
      setCurrentPromptForAI(null);
      showNotification("✨ AI enhancement applied!", "success");
    } catch (error) {
      console.error("Error applying enhancement:", error);
      showNotification("❌ Failed to apply enhancement", "error");
    }
  }

  // Save AI Enhanced as New Prompt
  async function handleSaveAIAsNew(enhancedPrompt) {
    try {
      await savePrompt(
        user.uid,
        {
          title: enhancedPrompt.title,
          text: enhancedPrompt.text,
          tags: enhancedPrompt.tags || [],
        },
        activeTeam
      );
      setShowAIEnhancer(false);
      setCurrentPromptForAI(null);
      showNotification("✨ AI enhanced prompt saved as new!", "success");
    } catch (error) {
      console.error("Error saving enhanced prompt:", error);
      showNotification("❌ Failed to save enhanced prompt", "error");
    }
  }

  // Notification helper
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.innerHTML = `<div>${message}</div>`;
    notification.className =
      "fixed top-4 right-4 glass-card px-6 py-4 rounded-lg z-50 text-sm transition-all duration-300 border-2";
    notification.style.cssText = `
      background-color: var(--card);
      color: var(--foreground);
      border-color: var(--${type === "error" ? "destructive" : "primary"});
      box-shadow: 0 0 20px rgba(0, 200, 255, 0.3);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(400px)";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Get user initials for avatar
  function getUserInitials(name, email) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  }

  // User Avatar Component
  function UserAvatar({ src, name, email, size = "small", className = "" }) {
    const [imageError, setImageError] = useState(false);
    const avatarClass = size === "small" ? "w-8 h-8" : "w-10 h-10";

    if (!src || imageError) {
      return (
        <div
          className={`${avatarClass} ${className} rounded-full flex items-center justify-center text-white font-semibold text-xs border-2`}
          style={{ 
            backgroundColor: "var(--primary)",
            borderColor: "var(--primary)",
            boxShadow: "0 0 15px rgba(0, 200, 255, 0.4)"
          }}
        >
          {getUserInitials(name, email)}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt="avatar"
        className={`${avatarClass} ${className} rounded-full object-cover border-2`}
        style={{ 
          borderColor: "var(--primary)",
          boxShadow: "0 0 15px rgba(0, 200, 255, 0.4)"
        }}
        onError={() => setImageError(true)}
      />
    );
  }

  // Format date
  function formatDate(timestamp) {
    if (!timestamp) return "";
    try {
      return timestamp.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  // Check if user can edit prompt
  function canEditPrompt(prompt) {
    return (
      prompt.createdBy === user.uid ||
      userRole === "owner" ||
      userRole === "admin"
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="glass-card p-8 text-center border-2 neo-pulse">
        <div className="neo-spinner mx-auto mb-4"></div>
        <p className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Loading prompts...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 border-2 neo-pulse">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ⚡ Prompt Library
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"} •{" "}
              <span className="text-cyan-400 font-semibold">AI-Enhanced Collection</span>
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary px-6 py-3 flex items-center gap-2 neo-glow hover:scale-105 transform transition-all duration-300"
          >
            <span className="text-xl">{showCreateForm ? "✕" : "+"}</span>
            <span className="font-semibold">{showCreateForm ? "Cancel" : "New Prompt"}</span>
          </button>
        </div>
      </div>

      {/* Create Prompt Form */}
      {showCreateForm && (
        <div className="glass-card p-6 border-2" style={{ borderColor: "var(--primary)" }}>
          <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🎯 Create New Prompt
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Blog Post Generator"
                className="form-input"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && e.shiftKey) {
                    handleCreate(e);
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                Prompt Text *
              </label>
              <textarea
                placeholder="Enter your prompt here..."
                className="form-input min-h-[150px] font-mono text-sm"
                value={newPrompt.text}
                onChange={(e) => setNewPrompt({ ...newPrompt, text: e.target.value })}
              />
              <p className="text-xs mt-2 flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                <span className="text-cyan-400 font-semibold">{newPrompt.text.length}</span> characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g., writing, creative, marketing"
                className="form-input"
                value={newPrompt.tags}
                onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleCreate} 
                className="btn-primary px-8 py-2.5 neo-glow hover:scale-105 transition-transform"
              >
                ✨ Create Prompt
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary px-8 py-2.5 hover:scale-105 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search */}
      <AdvancedSearch
        prompts={prompts}
        onFilteredResults={handleFilteredResults}
        teamMembers={teamMembers}
      />

      {/* Bulk Operations */}
      {prompts.length > 0 && (
        <BulkOperations
          prompts={filteredPrompts}
          selectedPrompts={selectedPrompts}
          onSelectionChange={setSelectedPrompts}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          userRole={userRole}
          userId={user.uid}
        />
      )}

      {/* Pagination Controls */}
      {filteredPrompts.length > 0 && (
        <PaginationControls
          pagination={pagination}
          showPageSizeSelector={true}
          showSearch={false}
        />
      )}

      {/* Prompts List */}
      {pagination.currentItems.length === 0 ? (
        <div className="glass-card p-12 text-center border-2 neo-pulse">
          <div className="text-6xl mb-4 animate-bounce">📝</div>
          <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {pagination.isFiltered ? "No matching prompts" : "No prompts yet"}
          </h3>
          <p className="text-base" style={{ color: "var(--muted-foreground)" }}>
            {pagination.isFiltered
              ? "Try adjusting your search filters"
              : "Create your first prompt to get started"}
          </p>
          {pagination.isFiltered && (
            <button
              onClick={pagination.clearSearch}
              className="btn-secondary mt-6 px-6 py-2.5 hover:scale-105 transition-transform"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.currentItems.map((prompt) => {
            const author = teamMembers[prompt.createdBy];
            const isExpanded = expandedPromptId === prompt.id;
            const isSelected = selectedPrompts.includes(prompt.id);

            return (
              <div
                key={prompt.id}
                className="glass-card p-6 transition-all duration-300 hover:border-primary/50 border-2"
                style={{ 
                  borderColor: isExpanded ? "var(--primary)" : "var(--border)",
                  boxShadow: isExpanded ? "0 0 25px rgba(0, 200, 255, 0.2)" : "none"
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Selection Checkbox */}
                    <PromptSelector
                      promptId={prompt.id}
                      isSelected={isSelected}
                      onSelectionChange={handleSelectionChange}
                      className="mt-1"
                    />

                    {/* Author Avatar */}
                    <UserAvatar
                      src={author?.avatar}
                      name={author?.name}
                      email={author?.email}
                      className="mt-1"
                    />

                    {/* Title and Meta */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
                        {prompt.title}
                      </h3>
                      <div
                        className="flex items-center gap-3 text-xs flex-wrap"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <span className="font-medium">By {author?.name || author?.email || "Unknown"}</span>
                        <span>•</span>
                        <span>{formatDate(prompt.createdAt)}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-semibold">{prompt.text?.length || 0} chars</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {/* AI Enhance Button */}
                    <button
                      onClick={() => handleAIEnhance(prompt)}
                      className="p-2 rounded-lg transition-all duration-200 hover:scale-110 border-2"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        borderColor: "var(--primary)",
                        boxShadow: "0 0 15px rgba(0, 200, 255, 0.4)"
                      }}
                      title="Enhance with AI"
                    >
                      <span className="text-lg">🤖</span>
                    </button>

                    <FavoriteButton
                      prompt={prompt}
                      teamId={activeTeam}
                      teamName={prompt.teamName}
                      size="small"
                    />

                    <button
                      onClick={() => handleCopy(prompt.text)}
                      className="p-2 rounded-lg transition-all duration-200 hover:scale-110 border"
                      style={{
                        backgroundColor: "var(--secondary)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)"
                      }}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>

                    {canEditPrompt(prompt) && (
                      <>
                        <button
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg transition-all duration-200 hover:scale-110 border"
                          style={{
                            backgroundColor: "var(--secondary)",
                            color: "var(--foreground)",
                            borderColor: "var(--border)"
                          }}
                          title="Edit prompt"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => handleDelete(prompt.id)}
                          className="p-2 rounded-lg transition-all duration-200 hover:scale-110 border-2"
                          style={{
                            backgroundColor: "var(--destructive)",
                            color: "var(--destructive-foreground)",
                            borderColor: "var(--destructive)"
                          }}
                          title="Delete prompt"
                        >
                          🗑️
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setExpandedPromptId(isExpanded ? null : prompt.id)}
                      className="p-2 rounded-lg transition-all duration-200 hover:scale-110 border"
                      style={{
                        backgroundColor: "var(--secondary)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)"
                      }}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Prompt Text Preview */}
                <div className="mb-4">
                  <div
                    className="p-4 rounded-lg border-2 ai-grid-bg"
                    style={{
                      backgroundColor: "var(--muted)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <pre
                      className={`whitespace-pre-wrap text-sm font-mono ${
                        !isExpanded ? "line-clamp-3" : ""
                      }`}
                      style={{ color: "var(--foreground)" }}
                    >
                      {prompt.text}
                    </pre>
                  </div>
                </div>

                {/* Tags */}
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {prompt.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all duration-200 hover:scale-105 cursor-pointer"
                        style={{
                          backgroundColor: "var(--secondary)",
                          color: "var(--cyan)",
                          borderColor: "var(--border)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="space-y-4 border-t-2 pt-4" style={{ borderColor: "var(--border)" }}>
                    {/* AI Model Analysis */}
                    <CompactAITools text={prompt.text} />

                    {/* Comments Toggle */}
                    <button
                      onClick={() => toggleComments(prompt.id)}
                      className="btn-secondary w-full py-2.5 text-sm font-semibold hover:scale-105 transition-transform"
                    >
                      {showComments[prompt.id] ? "Hide" : "Show"} Comments 💬
                    </button>

                    {/* Comments Section */}
                    {showComments[prompt.id] && (
                      <Comments
                        teamId={activeTeam}
                        promptId={prompt.id}
                        userRole={userRole}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Pagination */}
      {filteredPrompts.length > 0 && (
        <PaginationControls
          pagination={pagination}
          showPageSizeSelector={false}
          showSearch={false}
        />
      )}

      {/* Import/Export */}
      <ExportImport
        onImport={handleImport}
        teamId={activeTeam}
        teamName="Current Team"
        userRole={userRole}
      />

      {/* Edit Modal */}
      {showEditModal && editingPrompt && (
        <EditPromptModal
          open={showEditModal}
          prompt={editingPrompt}
          onClose={() => {
            setShowEditModal(false);
            setEditingPrompt(null);
          }}
          onSave={(updates) => handleUpdate(editingPrompt.id, updates)}
        />
      )}

      {/* AI Enhancement Modal */}
      {showAIEnhancer && currentPromptForAI && (
        <AIPromptEnhancer
          prompt={currentPromptForAI}
          onApply={handleApplyAIEnhancement}
          onSaveAsNew={handleSaveAIAsNew}
          onClose={() => {
            setShowAIEnhancer(false);
            setCurrentPromptForAI(null);
          }}
        />
      )}
    </div>
  );
}
