// src/components/PromptList.jsx - Enhanced with Futuristic AI Theme and Advanced Animations - FIXED
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
  increment,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import PromptForm from "./PromptForm";
import { FavoriteButton, useFavorites } from "./Favorites";
import Comments from "./Comments";
import AIEnhancementTools from "./AIEnhancementTools";

// Fixed cache hook implementation
const useCache = (key, fetchFn, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (options.enabled === false) return;
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (error) {
      console.error(`Cache error for ${key}:`, error);
    }
    setLoading(false);
  }, [key, options.enabled]); // Stable dependencies only

  return { data, loading, refresh };
};

// Simple error handler hook
const useErrorHandler = () => ({
  handleError: (error) => {
    console.error("Error:", error);
  },
});

// Simple pagination hook
const usePagination = (items, itemsPerPage) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);

  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentItems = items.slice(startIndex, endIndex);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems,
    setItemsPerPage: setPageSize,
    resetPagination: () => setCurrentPage(1),
  };
};

// Neural Loading Animation Component
const NeuralLoadingAnimation = ({ text = "Processing..." }) => (
  <div className="flex items-center justify-center py-12">
    <div className="glass-card p-8 text-center cyber-glow">
      <div className="relative mb-6">
        <div className="neo-spinner mx-auto"></div>
        <div className="absolute inset-0 neo-pulse">
          <div className="w-8 h-8 border border-cyan-400 rounded-full mx-auto opacity-30"></div>
        </div>
        <div
          className="absolute inset-0 neo-pulse"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="w-12 h-12 border border-purple-400 rounded-full mx-auto opacity-20"></div>
        </div>
      </div>
      <p className="text-slate-300 text-sm font-medium">{text}</p>
      <div className="mt-4 flex justify-center space-x-1">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
    </div>
  </div>
);

// Enhanced Pagination Controls Component
const PaginationControls = ({
  pagination,
  className = "",
  onPageSizeChange,
}) => {
  const { currentPage, setCurrentPage, totalPages, currentItems } = pagination;

  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex items-center justify-between glass-card p-6 rounded-2xl cyber-glow ${className}`}
    >
      <div className="flex items-center gap-6 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full neo-pulse"></div>
          Page {currentPage} of {totalPages}
        </span>
        <select
          value={pagination.pageSize || 10}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="bg-transparent border border-cyan-400/30 rounded-xl px-4 py-2 text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-3 glass-card rounded-xl text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-3 glass-card rounded-xl text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Cyber Search Component
const CyberSearch = ({ prompts, onFilteredResults, teamMembers }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set();
    prompts.forEach((prompt) => {
      if (prompt.tags) {
        prompt.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [prompts]);

  // Filter and sort prompts - memoized to prevent infinite updates
  const filteredResults = useMemo(() => {
    let filtered = prompts.filter((prompt) => {
      const matchesSearch =
        !searchTerm ||
        prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.text.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => prompt.tags?.includes(tag));

      const matchesAuthor =
        !selectedAuthor || prompt.createdBy === selectedAuthor;

      return matchesSearch && matchesTags && matchesAuthor;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          );
        case "oldest":
          return (
            (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
          );
        case "title":
          return a.title.localeCompare(b.title);
        case "mostCopied":
          return (b.stats?.copies || 0) - (a.stats?.copies || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [prompts, searchTerm, selectedTags, selectedAuthor, sortBy]);

  // Update filtered results when they change
  useEffect(() => {
    onFilteredResults(filteredResults);
  }, [filteredResults, onFilteredResults]);

  return (
    <div className="glass-card p-8 rounded-2xl mb-8 cyber-glow">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-cyan-400 rounded-full neo-pulse"></div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Neural Search Interface
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <input
            type="text"
            placeholder="Search neural patterns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full search-input text-lg"
          />
        </div>

        {/* Author Filter */}
        <div>
          <select
            value={selectedAuthor}
            onChange={(e) => setSelectedAuthor(e.target.value)}
            className="w-full form-input text-lg"
          >
            <option value="">All Authors</option>
            {Object.entries(teamMembers || {}).map(([uid, member]) => (
              <option key={uid} value={uid}>
                {member.name || member.email}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full form-input text-lg"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">By Title</option>
            <option value="mostCopied">Most Copied</option>
          </select>
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags((prev) =>
                    prev.includes(tag)
                      ? prev.filter((t) => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={`prompt-tag transition-all duration-300 text-sm ${
                  selectedTags.includes(tag)
                    ? "bg-cyan-500/30 border-cyan-400 scale-110 cyber-glow"
                    : "hover:scale-105"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Cyber Bulk Operations Component
const CyberBulkOperations = ({
  prompts,
  selectedPrompts,
  onSelectionChange,
  onBulkDelete,
  onBulkExport,
  userRole,
  userId,
}) => {
  const selectedCount = selectedPrompts.length;
  const selectedData = prompts.filter((p) => selectedPrompts.includes(p.id));

  const handleSelectAll = () => {
    if (selectedCount === prompts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(prompts.map((p) => p.id));
    }
  };

  if (prompts.length === 0) return null;

  return (
    <div className="glass-card p-6 rounded-2xl mb-8 cyber-glow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-3 text-sm text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedCount === prompts.length}
              onChange={handleSelectAll}
              className="w-5 h-5 text-cyan-500 bg-transparent border-2 border-cyan-400/50 rounded focus:ring-cyan-500 focus:ring-2"
            />
            Select All ({prompts.length})
          </button>

          {selectedCount > 0 && (
            <span className="text-sm text-cyan-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full neo-pulse"></div>
              {selectedCount} selected
            </span>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBulkExport(selectedData, "json")}
              className="neo-btn btn-secondary px-4 py-2 text-sm font-semibold"
            >
              Export Selected
            </button>

            {(userRole === "owner" || userRole === "admin") && (
              <button
                onClick={() => {
                  if (confirm(`Delete ${selectedCount} selected prompts?`)) {
                    onBulkDelete(selectedPrompts);
                  }
                }}
                className="neo-btn btn-danger px-4 py-2 text-sm font-semibold"
              >
                Delete Selected
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Activity Logger (simplified)
const ActivityLogger = {
  logPromptCreated: async (teamId, userId, promptId, title) => {
    console.log(`Activity: Prompt "${title}" created by ${userId}`);
  },
  logPromptUpdated: async (teamId, userId, promptId, title) => {
    console.log(`Activity: Prompt "${title}" updated by ${userId}`);
  },
};

// Enhanced Cyber Prompt Card Component
const CyberPromptCard = ({
  prompt,
  profile,
  isSelected,
  isExpanded,
  showComments,
  canModify,
  onSelect,
  onToggleExpanded,
  onToggleComments,
  onOpenAITools,
  onCopy,
  onEdit,
  onDelete,
  teamId,
  teamName,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const UserAvatar = ({ src, name, email, size = "normal" }) => {
    const avatarClass = size === "small" ? "w-10 h-10" : "w-12 h-12";

    if (!src || imageError) {
      const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : email
        ? email[0].toUpperCase()
        : "U";
      return (
        <div className={`${avatarClass} avatar-initials cyber-glow`}>
          {initials}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt="avatar"
        className={`${avatarClass} rounded-full object-cover border-2 border-cyan-400/30`}
        onError={() => setImageError(true)}
      />
    );
  };

  const handleCopy = async () => {
    await onCopy(prompt.text, prompt.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFavorite = async () => {
    await toggleFavorite(prompt, teamId, teamName);
  };

  const formatDate = (timestamp) => {
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
  };

  const getTextStats = (text) => {
    if (!text) return { chars: 0, words: 0, lines: 0 };
    return {
      chars: text.length,
      words: text.trim().split(/\s+/).filter(Boolean).length,
      lines: text.split("\n").length,
    };
  };

  const shouldTruncate = prompt.text && prompt.text.length > 300;
  const displayText =
    shouldTruncate && !isExpanded
      ? prompt.text.substring(0, 300) + "..."
      : prompt.text;
  const textStats = getTextStats(prompt.text);

  return (
    <div
      className={`prompt-card will-change-transform ${
        isSelected ? "cyber-glow border-cyan-400/50" : ""
      }`}
    >
      {/* Header */}
      <div className="p-8 border-b border-white/10">
        <div className="flex items-start gap-6">
          {/* Selection Checkbox */}
          <div className="pt-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(prompt.id, e.target.checked)}
              className="w-5 h-5 text-cyan-500 bg-transparent border-2 border-cyan-400/50 rounded focus:ring-cyan-500 focus:ring-2"
            />
          </div>

          {/* Author Avatar */}
          <UserAvatar
            src={profile?.avatar}
            name={profile?.name}
            email={profile?.email}
            size="small"
          />

          {/* Header Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                    {prompt.title}
                  </h3>
                  <button
                    onClick={handleFavorite}
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      isFavorite(prompt.id)
                        ? "text-yellow-400 bg-yellow-400/20 scale-110 cyber-glow"
                        : "text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                    }`}
                    title={
                      isFavorite(prompt.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    <span className="text-xl">
                      {isFavorite(prompt.id) ? "★" : "☆"}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-400 flex-wrap">
                  <span className="font-medium text-slate-300 text-lg">
                    {profile?.name || profile?.email || "Unknown Neural Entity"}
                  </span>
                  <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                  <span className="text-lg">
                    {formatDate(prompt.createdAt)}
                  </span>
                  {prompt.updatedAt && (
                    <>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full neo-pulse"></span>
                      <span className="text-cyan-400 text-lg">
                        synchronized
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3 ml-6">
                <button
                  onClick={handleCopy}
                  className={`p-4 rounded-2xl transition-all duration-300 ${
                    copied
                      ? "bg-green-500/20 text-green-400 scale-110 cyber-glow"
                      : "glass-card hover:scale-110 text-cyan-400"
                  }`}
                  title="Copy to neural buffer"
                >
                  {copied ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>

                {canModify && (
                  <>
                    <button
                      onClick={() => onEdit(prompt)}
                      className="p-4 glass-card hover:scale-110 text-purple-400 hover:text-purple-300 transition-all duration-300"
                      title="Modify prompt"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(prompt.id)}
                      className="p-4 glass-card hover:scale-110 text-red-400 hover:text-red-300 transition-all duration-300"
                      title="Delete prompt"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Prompt Text */}
        <div className="mb-8">
          <div className="glass-card p-6 rounded-2xl border border-cyan-500/20 cyber-glow">
            <pre className="text-slate-200 whitespace-pre-wrap font-mono text-base leading-relaxed">
              {displayText}
            </pre>
          </div>

          {shouldTruncate && (
            <button
              onClick={() => onToggleExpanded(prompt.id)}
              className="mt-4 flex items-center gap-3 text-cyan-400 hover:text-cyan-300 text-base font-medium transition-colors"
            >
              {isExpanded ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Expand
                </>
              )}
            </button>
          )}
        </div>

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {prompt.tags.map((tag, index) => (
              <span
                key={index}
                className="prompt-tag hover:scale-110 cursor-pointer will-change-transform text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cyber Stats Bar */}
        <div className="glass-card p-6 rounded-2xl mb-8 cyber-glow">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-8 text-slate-400">
              <span className="flex items-center gap-3">
                <div className="w-3 h-3 bg-cyan-400 rounded-full neo-pulse"></div>
                {textStats.chars} chars
              </span>
              <span className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full neo-pulse"></div>
                {textStats.words} tokens
              </span>
              <span className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full neo-pulse"></div>
                {textStats.lines} lines
              </span>
            </div>

            {prompt.stats && (
              <div className="flex items-center gap-6 text-slate-300">
                {prompt.stats.copies > 0 && (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {prompt.stats.copies}
                  </span>
                )}
                {prompt.stats.averageRating > 0 && (
                  <span className="flex items-center gap-2 text-yellow-400">
                    ⭐ {prompt.stats.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cyber Action Interface */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onToggleComments(prompt.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-base font-medium transition-all duration-300 will-change-transform ${
              showComments
                ? "glass-card cyber-glow bg-cyan-500/20 text-cyan-300 scale-105"
                : "glass-card text-slate-400 hover:text-cyan-300 hover:scale-105"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Neural Comments
          </button>

          <button
            onClick={() => onOpenAITools(prompt)}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl text-base font-medium transition-all duration-300 will-change-transform glass-card text-slate-400 hover:text-purple-300 hover:scale-105"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            AI Enhancement Tools
          </button>
        </div>
      </div>

      {/* Expanded Cyber Interfaces */}
      {showComments && (
        <div className="border-t border-white/10 p-8 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-cyan-400 rounded-full neo-pulse"></div>
              <h4 className="text-lg font-bold text-cyan-300">
                Neural Comments
              </h4>
            </div>
            <div className="glass-card p-6 rounded-2xl cyber-glow">
              <Comments
                teamId={teamId}
                promptId={prompt.id}
                userRole="member"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [aiToolsModal, setAIToolsModal] = useState({ open: false, prompt: null });

  // Pagination
  const pagination = usePagination(filteredPrompts, itemsPerPage);

  // Handler for opening AI tools modal
  const handleOpenAITools = useCallback((prompt) => {
    setAIToolsModal({ open: true, prompt });
  }, []);

  // Memoized fetch function for profiles to prevent recreation on every render
  const fetchProfiles = useCallback(async () => {
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
  }, [prompts]);

  // FIXED - stable enabled condition
  const { data: cachedProfiles, refresh: refreshProfiles } = useCache(
    `team-profiles-${activeTeam}`,
    fetchProfiles,
    {
      enabled: true,
    }
  );

  // Update profiles when cached data changes
  useEffect(() => {
    if (cachedProfiles) {
      setProfiles(cachedProfiles);
    }
  }, [cachedProfiles]);

  // Load prompts and team info with error handling - FIXED VERSION
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
  }, [activeTeam]);

  // Separate effect to handle profile refreshing
  useEffect(() => {
    if (prompts.length > 0 && cachedProfiles) {
      const currentCreators = new Set(Object.keys(cachedProfiles));
      const newCreators = prompts.some(
        (p) => p.createdBy && !currentCreators.has(p.createdBy)
      );
      if (newCreators) {
        refreshProfiles();
      }
    }
  }, [prompts, cachedProfiles, refreshProfiles]);

  // Reset pagination when filtered prompts change
  useEffect(() => {
    pagination.resetPagination();
  }, [filteredPrompts.length]);

  // Set initial filtered prompts
  const handleFilteredResults = useCallback((filtered) => {
    setFilteredPrompts(filtered);
  }, []);

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
      if (!confirm("Are you sure you want to delete this neural prompt?"))
        return;

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
        setSelectedPrompts([]);
      } catch (error) {
        console.error("Error in bulk delete:", error);
        handleError(error);
      }
    },
    [activeTeam, handleError]
  );

  // Export functionality
  const exportPrompts = useCallback(
    (promptsData, format, filename) => {
      let content, mimeType, fileExtension;

      switch (format) {
        case "json":
          content = JSON.stringify(promptsData, null, 2);
          mimeType = "application/json";
          fileExtension = "json";
          break;
        case "csv":
          const headers = ["Title", "Text", "Tags", "Author", "Created"];
          const rows = promptsData.map((p) => [
            p.title,
            p.text.replace(/"/g, '""'),
            (p.tags || []).join("; "),
            profiles[p.createdBy]?.name ||
              profiles[p.createdBy]?.email ||
              "Unknown",
            p.createdAt?.toDate().toLocaleDateString() || "",
          ]);
          content = [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");
          mimeType = "text/csv";
          fileExtension = "csv";
          break;
        case "txt":
          content = promptsData
            .map(
              (p) =>
                `Title: ${p.title}\nText: ${p.text}\nTags: ${(
                  p.tags || []
                ).join(", ")}\n${"=".repeat(50)}\n`
            )
            .join("\n");
          mimeType = "text/plain";
          fileExtension = "txt";
          break;
        default:
          return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [profiles]
  );

  // Bulk export
  const handleBulkExport = useCallback(
    (selectedPromptData, format) => {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${teamName.replace(
        /\s+/g,
        "_"
      )}_neural_prompts_${timestamp}`;
      exportPrompts(selectedPromptData, format, filename);
    },
    [teamName, exportPrompts]
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

  // Enhanced copy function with usage tracking
  const copyToClipboard = useCallback(
    async (text, promptId) => {
      try {
        await navigator.clipboard.writeText(text);

        // Track copy usage
        if (promptId) {
          await updateDoc(doc(db, "teams", activeTeam, "prompts", promptId), {
            "stats.copies": increment(1),
            "stats.lastUsed": serverTimestamp(),
          });
        }

        // Show neural toast notification
        const toast = document.createElement("div");
        toast.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-green-400 rounded-full neo-pulse"></div>
            <span>Neural buffer synchronized!</span>
          </div>
        `;
        toast.className =
          "fixed top-4 right-4 glass-card text-green-400 px-4 py-3 rounded-xl z-50 neo-glow";
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      } catch (error) {
        console.error("Failed to copy:", error);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        const toast = document.createElement("div");
        toast.textContent = "Neural buffer synchronized (legacy mode)!";
        toast.className =
          "fixed top-4 right-4 glass-card text-blue-400 px-4 py-3 rounded-xl z-50";
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }
    },
    [activeTeam]
  );

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

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize) => {
    setItemsPerPage(newSize);
  }, []);

  // Neural Loading Component
  if (loading) {
    return <NeuralLoadingAnimation />;
  }

  return (
    <div className="mb-8">
      {/* Enhanced Header with Neural Styling */}
      <div className="glass-card p-6 mb-6 neo-glow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
              Neural Prompt Library
            </h2>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full neo-pulse"></div>
                {prompts.length} {prompts.length === 1 ? "prompt" : "prompts"}{" "}
                in neural network
              </span>
              {filteredPrompts.length < prompts.length && (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full neo-pulse"></div>
                  {filteredPrompts.length} filtered results
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {prompts.length > 0 && (
              <button
                onClick={() => handleBulkExport(prompts, "json")}
                className="neo-btn btn-secondary px-4 py-2 text-sm"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Export All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Search with Neo Styling */}
      <CyberSearch
        prompts={prompts}
        onFilteredResults={handleFilteredResults}
        teamMembers={profiles}
      />

      {/* Bulk Operations with Neo Styling */}
      <CyberBulkOperations
        prompts={filteredPrompts}
        selectedPrompts={selectedPrompts}
        onSelectionChange={handleSelectionChange}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        userRole={userRole}
        userId={user?.uid}
      />

      {/* Enhanced Prompt Form */}
      <div className="mb-8">
        <PromptForm
          onSubmit={addPrompt}
          editingPrompt={editingPrompt}
          onUpdate={handleUpdate}
          onCancel={() => setEditingPrompt(null)}
        />
      </div>

      {/* Enhanced Prompts List */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-16">
          <div className="glass-card p-12 max-w-md mx-auto neo-glow">
            <div className="text-6xl mb-6 neo-pulse">🧠</div>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
              {prompts.length === 0
                ? "Neural Network Empty"
                : "No Matching Patterns"}
            </h3>
            <p className="text-slate-400 mb-6">
              {prompts.length === 0
                ? "Initialize your first neural prompt using the interface above"
                : "Adjust your search parameters to find matching prompts"}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Pagination Controls - Top */}
          <PaginationControls
            pagination={pagination}
            className="mb-6"
            onPageSizeChange={handlePageSizeChange}
          />

          {/* Neural Prompts Grid */}
          <div className="space-y-6">
            {pagination.currentItems.map((prompt) => {
              const profile = profiles[prompt.createdBy];
              const isExpanded = expandedPrompts.has(prompt.id);
              const isSelected = selectedPrompts.includes(prompt.id);
              const showComments = expandedComments.has(prompt.id);

              return (
                <CyberPromptCard
                  key={prompt.id}
                  prompt={prompt}
                  profile={profile}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  showComments={showComments}
                  canModify={canModifyPrompt(prompt)}
                  onSelect={handlePromptSelection}
                  onToggleExpanded={toggleExpanded}
                  onToggleComments={toggleComments}
                  onOpenAITools={handleOpenAITools}
                  onCopy={copyToClipboard}
                  onEdit={setEditingPrompt}
                  onDelete={handleDelete}
                  teamId={activeTeam}
                  teamName={teamName}
                />
              );
            })}
          </div>

          {/* Pagination Controls - Bottom */}
          <PaginationControls
            pagination={pagination}
            className="mt-8"
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      {/* AI Enhancement Tools Modal */}
      {aiToolsModal.open && (
        <AIEnhancementTools
          prompt={aiToolsModal.prompt}
          onClose={() => setAIToolsModal({ open: false, prompt: null })}
          onApply={async (updatedPrompt) => {
            await handleUpdate(updatedPrompt.id, { text: updatedPrompt.text });
            setAIToolsModal({ open: false, prompt: null });
          }}
          onSaveAsNew={async (newPrompt) => {
            await addPrompt(newPrompt);
            setAIToolsModal({ open: false, prompt: null });
          }}
        />
      )}
    </div>
  );
}
