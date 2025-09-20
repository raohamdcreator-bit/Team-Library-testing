// src/components/AdvancedSearch.jsx
import { useState, useEffect } from "react";

export default function AdvancedSearch({
  prompts,
  onFilteredResults,
  teamMembers = {},
  isExpanded = false,
  onToggleExpanded,
}) {
  const [filters, setFilters] = useState({
    search: "",
    author: "all",
    tags: "",
    dateRange: "all",
    sortBy: "newest",
    minLength: "",
    maxLength: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(isExpanded);

  // Apply filters whenever filters or prompts change
  useEffect(() => {
    const filteredPrompts = applyFilters(prompts);
    onFilteredResults(filteredPrompts);
  }, [filters, prompts, onFilteredResults]);

  function applyFilters(promptsList) {
    let filtered = [...promptsList];

    // Text search
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (prompt) =>
          prompt.title?.toLowerCase().includes(searchTerm) ||
          prompt.text?.toLowerCase().includes(searchTerm) ||
          (Array.isArray(prompt.tags) &&
            prompt.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Author filter
    if (filters.author !== "all") {
      filtered = filtered.filter(
        (prompt) => prompt.createdBy === filters.author
      );
    }

    // Tag filter
    if (filters.tags.trim()) {
      const searchTags = filters.tags
        .toLowerCase()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      filtered = filtered.filter(
        (prompt) =>
          Array.isArray(prompt.tags) &&
          searchTags.some((searchTag) =>
            prompt.tags.some((tag) => tag.toLowerCase().includes(searchTag))
          )
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const cutoffDate = new Date();

      switch (filters.dateRange) {
        case "today":
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }

      filtered = filtered.filter((prompt) => {
        if (!prompt.createdAt) return false;
        try {
          return prompt.createdAt.toDate() >= cutoffDate;
        } catch {
          return false;
        }
      });
    }

    // Length filters
    if (filters.minLength && !isNaN(filters.minLength)) {
      filtered = filtered.filter(
        (prompt) => (prompt.text?.length || 0) >= parseInt(filters.minLength)
      );
    }

    if (filters.maxLength && !isNaN(filters.maxLength)) {
      filtered = filtered.filter(
        (prompt) => (prompt.text?.length || 0) <= parseInt(filters.maxLength)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "newest":
          return (
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          );
        case "oldest":
          return (
            (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
          );
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "author":
          const authorA =
            teamMembers[a.createdBy]?.name ||
            teamMembers[a.createdBy]?.email ||
            "";
          const authorB =
            teamMembers[b.createdBy]?.name ||
            teamMembers[b.createdBy]?.email ||
            "";
          return authorA.localeCompare(authorB);
        case "length-asc":
          return (a.text?.length || 0) - (b.text?.length || 0);
        case "length-desc":
          return (b.text?.length || 0) - (a.text?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      author: "all",
      tags: "",
      dateRange: "all",
      sortBy: "newest",
      minLength: "",
      maxLength: "",
    });
  }

  function hasActiveFilters() {
    return (
      filters.search !== "" ||
      filters.author !== "all" ||
      filters.tags !== "" ||
      filters.dateRange !== "all" ||
      filters.sortBy !== "newest" ||
      filters.minLength !== "" ||
      filters.maxLength !== ""
    );
  }

  function toggleAdvanced() {
    setShowAdvanced(!showAdvanced);
    if (onToggleExpanded) {
      onToggleExpanded(!showAdvanced);
    }
  }

  // Get unique authors for filter dropdown
  const authors = Object.entries(teamMembers).map(([uid, member]) => ({
    uid,
    name: member.name || member.email,
  }));

  // Get active filter count for badge
  const activeFilterCount = Object.values(filters).filter((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    return (
      key !== "search" && key !== "sortBy" && value !== "" && value !== "all"
    );
  }).length;

  return (
    <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
      {/* Basic Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search prompts, titles, tags..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="search-input w-full"
          />
        </div>

        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange("sortBy", e.target.value)}
          className="form-input"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title A-Z</option>
          <option value="author">Author A-Z</option>
          <option value="length-desc">Longest First</option>
          <option value="length-asc">Shortest First</option>
        </select>

        <button
          onClick={toggleAdvanced}
          className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
            showAdvanced
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {activeFilterCount}
            </span>
          )}
          <span
            className={`transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          >
            ↓
          </span>
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Author Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <select
                value={filters.author}
                onChange={(e) => handleFilterChange("author", e.target.value)}
                className="form-input w-full"
              >
                <option value="all">All Authors</option>
                {authors.map((author) => (
                  <option key={author.uid} value={author.uid}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  handleFilterChange("dateRange", e.target.value)
                }
                className="form-input w-full"
              >
                <option value="all">Any Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="quarter">Past 3 Months</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                placeholder="e.g. writing, creative"
                value={filters.tags}
                onChange={(e) => handleFilterChange("tags", e.target.value)}
                className="form-input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Comma separated</p>
            </div>

            {/* Length Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Characters
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.minLength}
                onChange={(e) =>
                  handleFilterChange("minLength", e.target.value)
                }
                className="form-input w-full"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Characters
              </label>
              <input
                type="number"
                placeholder="No limit"
                value={filters.maxLength}
                onChange={(e) =>
                  handleFilterChange("maxLength", e.target.value)
                }
                className="form-input w-full"
                min="0"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters() && (
            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 rounded transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
