// src/components/PromptList.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import PromptForm from "./PromptForm";
import AdvancedSearch from "./AdvancedSearch";
import BulkOperations, { PromptSelector } from "./BulkOperations";
import ExportImport, { ExportUtils } from "./ExportImport";
import { FavoriteButton } from "./Favorites";
import Comments from "./Comments";
import { PromptRating } from "./PromptAnalytics";
import { CompactAITools } from "./AIModelTools";
import { ActivityLogger } from "./ActivityFeed";
import { useCache, useDebounce, useThrottle } from "../hooks/useCache";
import usePagination, { PaginationControls } from "../hooks/usePagination";
import { useErrorHandler } from "./ErrorBoundary";
import {
  PromptCardSkeleton,
  FormSkeleton,
  SearchFiltersSkeleton,
  BulkOperationsSkeleton,
} from "./SkeletonLoaders";

export default function PromptList({ activeTeam, userRole }) {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

  // State management
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedPrompts, setExpandedPrompts] = useState(new Set());
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [expandedAITools, setExpandedAITools] = useState(new Set());

  // Pagination
  const pagination = usePagination(filteredPrompts, itemsPerPage);

  // Cache team profiles
  const { data: cachedProfiles, refresh: refreshProfiles } = useCache(
    `team-profiles-${activeTeam}`,
    async () => {
      if (!prompts.length) return {};

      const result = {};
      const uniqueCreators = [
        ...new Set(prompts.map((p) => p.createdBy).filter(Boolean)),
      ];

      await Promise.all(
        uniqueCreators.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              result[uid] = snap.data();
            }
          } catch (error) {
            console.error("Error loading profile for", uid, error);
          }
        })
      );

      return result;
    },
    {
      ttl: 300000, // 5 minutes
      enabled: prompts.length > 0,
    }
  );

  // Update profiles when cached data changes
  useEffect(() => {
    if (cachedProfiles) {
      setProfiles(cachedProfiles);
    }
  }, [cachedProfiles]);

  // Throttled scroll handler for performance
  const handleScroll = useThrottle((e) => {
    // Handle scroll events if needed
  }, 100);

  // Helper function to get user initials
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

  // Memoized avatar component for performance
  const UserAvatar = useMemo(() => {
    return function UserAvatarComponent({
      src,
      name,
      email,
      size = "normal",
      className = "",
    }) {
      const [imageError, setImageError] = useState(false);
      const avatarClass =
        size === "small" ? "user-avatar-small" : "user-avatar";
      const initialsClass =
        size === "small"
          ? "avatar-initials avatar-initials-small"
          : "avatar-initials";

      if (!src || imageError) {
        return (
          <div className={`${initialsClass} ${avatarClass} ${className}`}>
            {getUserInitials(name, email)}
          </div>
        );
      }

      return (
        <img
          src={src}
          alt="avatar"
          className={`${avatarClass} ${className}`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      );
    };
  }, []);

  // Load prompts and team info with error handling
  useEffect(() => {
    if (!activeTeam) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Load team name with caching
    const loadTeamName = async () => {
      try {
        const teamDoc = await getDoc(doc(db, "teams", activeTeam));
        if (teamDoc.exists()) {
          setTeamName(teamDoc.data().name);
        }
      } catch (error) {
        handleError(error);
      }
    };

    loadTeamName();

    // Load prompts with real-time updates
    const q = collection(db, "teams", activeTeam, "prompts");
    const unsub = onSnapshot(
      q,
      (snap) => {
        try {
          const promptData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setPrompts(promptData);
          setLoading(false);

          // Clear selection when prompts change
          setSelectedPrompts([]);

          // Reset pagination to first page if needed
          pagination.resetPagination();

          // Refresh profiles cache if new creators are found
          const currentCreators = new Set(Object.keys(profiles));
          const newCreators = promptData.some(
            (p) => p.createdBy && !currentCreators.has(p.createdBy)
          );
          if (newCreators) {
            refreshProfiles();
          }
        } catch (error) {
          handleError(error);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error loading prompts:", error);
        handleError(error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeTeam, handleError]);

  // Optimized add prompt function with activity logging
  const addPrompt = useCallback(
    async (prompt) => {
      if (!activeTeam) return;

      try {
        const docRef = await addDoc(
          collection(db, "teams", activeTeam, "prompts"),
          {
            ...prompt,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            stats: {
              views: 0,
              copies: 0,
              comments: 0,
              ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              totalRatings: 0,
              averageRating: 0,
            },
          }
        );

        // Log activity
        await ActivityLogger.logPromptCreated(
          activeTeam,
          user.uid,
          docRef.id,
          prompt.title
        );
      } catch (error) {
        console.error("Error adding prompt:", error);
        handleError(error);
      }
    },
    [activeTeam, user.uid, handleError]
  );

  // Optimized delete prompt function
  const handleDelete = useCallback(
    async (id) => {
      if (!confirm("Are you sure you want to delete this prompt?")) return;

      try {
        await deleteDoc(doc(db, "teams", activeTeam, "prompts", id));
      } catch (error) {
        console.error("Error deleting prompt:", error);
        if (error.code === "permission-denied") {
          alert("You don't have permission to delete this prompt.");
        } else {
          handleError(error);
        }
      }
    },
    [activeTeam, handleError]
  );

  // Bulk delete with batching
  const handleBulkDelete = useCallback(
    async (promptIds) => {
      const batch = writeBatch(db);

      try {
        promptIds.forEach((promptId) => {
          const promptRef = doc(db, "teams", activeTeam, "prompts", promptId);
          batch.delete(promptRef);
        });

        await batch.commit();
      } catch (error) {
        console.error("Error in bulk delete:", error);
        handleError(error);
      }
    },
    [activeTeam, handleError]
  );

  // Bulk export
  const handleBulkExport = useCallback(
    async (selectedPromptData, format) => {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${teamName.replace(/\s+/g, "_")}_prompts_${timestamp}`;

      try {
        switch (format) {
          case "json":
            ExportUtils.exportAsJSON(selectedPromptData, filename);
            break;
          case "csv":
            ExportUtils.exportAsCSV(selectedPromptData, filename);
            break;
          case "txt":
            ExportUtils.exportAsTXT(selectedPromptData, filename);
            break;
          default:
            throw new Error("Unsupported export format");
        }
      } catch (error) {
        console.error("Export error:", error);
        handleError(error);
      }
    },
    [teamName, handleError]
  );

  // Import prompts with batching
  const handleImport = useCallback(
    async (promptsData) => {
      const batch = writeBatch(db);

      try {
        promptsData.forEach((promptData) => {
          const promptRef = doc(collection(db, "teams", activeTeam, "prompts"));
          batch.set(promptRef, {
            ...promptData,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            importedAt: serverTimestamp(),
            stats: {
              views: 0,
              copies: 0,
              comments: 0,
              ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              totalRatings: 0,
              averageRating: 0,
            },
          });
        });

        await batch.commit();
        setShowImport(false);
      } catch (error) {
        console.error("Error importing prompts:", error);
        handleError(error);
      }
    },
    [activeTeam, user.uid, handleError]
  );

  // Update prompt with activity logging
  const handleUpdate = useCallback(
    async (id, updated) => {
      try {
        await updateDoc(doc(db, "teams", activeTeam, "prompts", id), {
          ...updated,
          updatedAt: serverTimestamp(),
        });
        setEditingPrompt(null);

        // Log activity
        await ActivityLogger.logPromptUpdated(
          activeTeam,
          user.uid,
          id,
          updated.title
        );
      } catch (error) {
        console.error("Error updating prompt:", error);
        if (error.code === "permission-denied") {
          alert("You don't have permission to edit this prompt.");
        } else {
          handleError(error);
        }
      }
    },
    [activeTeam, user.uid, handleError]
  );

  // Enhanced copy function with usage tracking - FIXED
  const copyToClipboard = useCallback(
    async (text, promptId) => {
      try {
        await navigator.clipboard.writeText(text);

        // Track copy usage - FIXED increment import
        if (promptId) {
          const { increment } = await import("firebase/firestore");
          await updateDoc(doc(db, "teams", activeTeam, "prompts", promptId), {
            "stats.copies": increment(1),
            "stats.lastUsed": serverTimestamp(),
          });
        }

        // Show toast notification
        const toast = document.createElement("div");
        toast.textContent = "Copied to clipboard!";
        toast.className =
          "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Prompt copied to clipboard!");
      }
    },
    [activeTeam]
  );

  // Text stats calculator
  const getTextStats = useCallback((text) => {
    if (!text) return { chars: 0, words: 0, lines: 0 };
    return {
      chars: text.length,
      words: text.trim().split(/\s+/).filter(Boolean).length,
      lines: text.split("\n").length,
    };
  }, []);

  // Toggle functions
  const toggleExpanded = useCallback((promptId) => {
    setExpandedPrompts((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(promptId)) {
        newExpanded.delete(promptId);
      } else {
        newExpanded.add(promptId);
      }
      return newExpanded;
    });
  }, []);

  const toggleComments = useCallback((promptId) => {
    setExpandedComments((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(promptId)) {
        newExpanded.delete(promptId);
      } else {
        newExpanded.add(promptId);
      }
      return newExpanded;
    });
  }, []);

  const toggleAITools = useCallback((promptId) => {
    setExpandedAITools((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(promptId)) {
        newExpanded.delete(promptId);
      } else {
        newExpanded.add(promptId);
      }
      return newExpanded;
    });
  }, []);

  // Selection handlers
  const handlePromptSelection = useCallback((promptId, isSelected) => {
    setSelectedPrompts((prev) => {
      if (isSelected) {
        return [...prev, promptId];
      } else {
        return prev.filter((id) => id !== promptId);
      }
    });
  }, []);

  const handleSelectionChange = useCallback((newSelection) => {
    setSelectedPrompts(newSelection);
  }, []);

  // Permission checker
  const canModifyPrompt = useCallback(
    (prompt) => {
      if (!user || !prompt) return false;
      return (
        prompt.createdBy === user.uid ||
        userRole === "owner" ||
        userRole === "admin"
      );
    },
    [user, userRole]
  );

  // Date formatter
  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "";
    try {
      return timestamp.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (newSize) => {
      setItemsPerPage(newSize);
      pagination.setItemsPerPage(newSize);
    },
    [pagination]
  );

  // Show loading skeletons
  if (loading) {
    return (
      <div className="mb-8">
        <SearchFiltersSkeleton />
        <BulkOperationsSkeleton />
        <FormSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <PromptCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Team Prompts</h2>
          <p className="text-sm text-gray-600 mt-1">
            {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"} total
            {filteredPrompts.length < prompts.length &&
              ` • ${filteredPrompts.length} shown`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(!showImport)}
            className="btn-secondary text-sm px-3 py-1.5"
          >
            Import
          </button>

          {prompts.length > 0 && (
            <button
              onClick={() => handleBulkExport(prompts, "json")}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              Export All
            </button>
          )}
        </div>
      </div>

      {/* Advanced Search */}
      <AdvancedSearch
        prompts={prompts}
        onFilteredResults={setFilteredPrompts}
        teamMembers={profiles}
      />

      {/* Bulk Operations */}
      {prompts.length > 0 && (
        <BulkOperations
          prompts={filteredPrompts}
          selectedPrompts={selectedPrompts}
          onSelectionChange={handleSelectionChange}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          userRole={userRole}
          userId={user?.uid}
        />
      )}

      {/* Import Component */}
      {showImport && (
        <ExportImport
          onImport={handleImport}
          teamId={activeTeam}
          teamName={teamName}
          userRole={userRole}
        />
      )}

      {/* Prompt Form */}
      <PromptForm
        onSubmit={addPrompt}
        editingPrompt={editingPrompt}
        onUpdate={handleUpdate}
        onCancel={() => setEditingPrompt(null)}
      />

      {/* Prompts List with Pagination */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">💡</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {prompts.length === 0 ? "No prompts yet" : "No prompts found"}
          </h3>
          <p className="text-gray-500">
            {prompts.length === 0
              ? "Create your first prompt using the form above"
              : "Try adjusting your search or filter criteria"}
          </p>
        </div>
      ) : (
        <>
          {/* Pagination Controls - Top */}
          <PaginationControls
            pagination={pagination}
            className="mb-4"
            onPageSizeChange={handlePageSizeChange}
          />

          {/* Prompts Grid */}
          <div className="space-y-4">
            {pagination.currentItems.map((prompt) => {
              const profile = profiles[prompt.createdBy];
              const isExpanded = expandedPrompts.has(prompt.id);
              const shouldTruncate = prompt.text && prompt.text.length > 300;
              const displayText =
                shouldTruncate && !isExpanded
                  ? prompt.text.substring(0, 300) + "..."
                  : prompt.text;
              const textStats = getTextStats(prompt.text);
              const isSelected = selectedPrompts.includes(prompt.id);
              const showComments = expandedComments.has(prompt.id);
              const showAITools = expandedAITools.has(prompt.id);

              return (
                <div
                  key={prompt.id}
                  className={`prompt-card p-4 ${
                    isSelected ? "ring-2 ring-blue-500 ring-opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    <PromptSelector
                      promptId={prompt.id}
                      isSelected={isSelected}
                      onSelectionChange={handlePromptSelection}
                      className="mt-1"
                    />

                    {/* Author Avatar */}
                    <UserAvatar
                      src={profile?.avatar}
                      name={profile?.name}
                      email={profile?.email}
                      size="small"
                      className="mt-1"
                    />

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-800">
                              {prompt.title}
                            </h4>
                            <FavoriteButton
                              prompt={prompt}
                              teamId={activeTeam}
                              teamName={teamName}
                              size="small"
                            />
                          </div>
                          <div className="flex items-center text-xs text-gray-500 gap-2 flex-wrap">
                            <span>
                              {profile?.name ||
                                profile?.email ||
                                "Unknown user"}
                            </span>
                            <span>•</span>
                            <span>{formatDate(prompt.createdAt)}</span>
                            {prompt.updatedAt && (
                              <>
                                <span>•</span>
                                <span>edited</span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              {textStats.chars} chars, {textStats.words} words
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() =>
                              copyToClipboard(prompt.text, prompt.id)
                            }
                            className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            📋
                          </button>

                          {canModifyPrompt(prompt) && (
                            <>
                              <button
                                onClick={() => setEditingPrompt(prompt)}
                                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(prompt.id)}
                                className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {displayText}
                        </pre>

                        {shouldTruncate && (
                          <button
                            onClick={() => toggleExpanded(prompt.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm mt-2 font-medium"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>

                      {/* Tags */}
                      {prompt.tags && prompt.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {prompt.tags.map((tag) => (
                            <span key={tag} className="prompt-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-4 text-sm">
                        <button
                          onClick={() => toggleComments(prompt.id)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <span>💬</span>
                          <span>Comments</span>
                        </button>

                        <button
                          onClick={() => toggleAITools(prompt.id)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          <span>🤖</span>
                          <span>AI Tools</span>
                        </button>
                      </div>

                      {/* AI Tools Expanded */}
                      {showAITools && (
                        <div className="mt-4">
                          <CompactAITools text={prompt.text} />
                        </div>
                      )}

                      {/* Comments Expanded */}
                      {showComments && (
                        <Comments
                          teamId={activeTeam}
                          promptId={prompt.id}
                          userRole={userRole}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls - Bottom */}
          <PaginationControls
            pagination={pagination}
            className="mt-6"
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}
