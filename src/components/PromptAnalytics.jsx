// src/components/PromptAnalytics.jsx
import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  updateDoc,
  getDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// Hook for prompt ratings - FIXED
export function usePromptRating(teamId, promptId) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [userRating, setUserRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !promptId) {
      setRatings([]);
      setUserRating(null);
      setLoading(false);
      return;
    }

    try {
      const ratingsRef = collection(
        db,
        "teams",
        teamId,
        "prompts",
        promptId,
        "ratings"
      );
      const unsub = onSnapshot(
        ratingsRef,
        (snap) => {
          const ratingsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRatings(ratingsData);

          // Find user's rating
          const userRatingData = ratingsData.find(
            (r) => r.userId === user?.uid
          );
          setUserRating(userRatingData?.rating || null);

          setLoading(false);
        },
        (error) => {
          console.error("Error loading ratings:", error);
          setRatings([]);
          setUserRating(null);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (error) {
      console.error("Error setting up ratings listener:", error);
      setLoading(false);
    }
  }, [teamId, promptId, user?.uid]);

  // Calculate average rating
  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }, [ratings]);

  // Rate prompt - FIXED
  async function ratePrompt(rating) {
    if (!user || !teamId || !promptId || rating < 1 || rating > 5) return;

    try {
      const ratingRef = doc(
        db,
        "teams",
        teamId,
        "prompts",
        promptId,
        "ratings",
        user.uid
      );

      // Set the rating
      await setDoc(ratingRef, {
        userId: user.uid,
        rating: rating,
        createdAt: serverTimestamp(),
      });

      // Update prompt stats
      const promptRef = doc(db, "teams", teamId, "prompts", promptId);
      const promptSnap = await getDoc(promptRef);

      if (promptSnap.exists()) {
        const currentStats = promptSnap.data().stats || {};
        const currentRatings = currentStats.ratings || {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };

        // If user had a previous rating, decrease that count
        if (userRating) {
          currentRatings[userRating] = Math.max(
            0,
            (currentRatings[userRating] || 0) - 1
          );
        }

        // Increase count for new rating
        currentRatings[rating] = (currentRatings[rating] || 0) + 1;

        // Calculate new totals
        const totalRatings = Object.values(currentRatings).reduce(
          (sum, count) => sum + count,
          0
        );
        const weightedSum = Object.entries(currentRatings).reduce(
          (sum, [star, count]) => sum + parseInt(star) * count,
          0
        );
        const newAverage = totalRatings > 0 ? weightedSum / totalRatings : 0;

        await updateDoc(promptRef, {
          "stats.ratings": currentRatings,
          "stats.totalRatings": totalRatings,
          "stats.averageRating": newAverage,
          "stats.lastRated": serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error rating prompt:", error);
      throw error;
    }
  }

  // Remove rating - FIXED
  async function removeRating() {
    if (!user || !teamId || !promptId || !userRating) return;

    try {
      const ratingRef = doc(
        db,
        "teams",
        teamId,
        "prompts",
        promptId,
        "ratings",
        user.uid
      );
      await deleteDoc(ratingRef);

      // Update prompt stats
      const promptRef = doc(db, "teams", teamId, "prompts", promptId);
      const promptSnap = await getDoc(promptRef);

      if (promptSnap.exists()) {
        const currentStats = promptSnap.data().stats || {};
        const currentRatings = currentStats.ratings || {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };

        // Decrease count for removed rating
        currentRatings[userRating] = Math.max(
          0,
          (currentRatings[userRating] || 0) - 1
        );

        // Calculate new totals
        const totalRatings = Object.values(currentRatings).reduce(
          (sum, count) => sum + count,
          0
        );
        const weightedSum = Object.entries(currentRatings).reduce(
          (sum, [star, count]) => sum + parseInt(star) * count,
          0
        );
        const newAverage = totalRatings > 0 ? weightedSum / totalRatings : 0;

        await updateDoc(promptRef, {
          "stats.ratings": currentRatings,
          "stats.totalRatings": totalRatings,
          "stats.averageRating": newAverage,
        });
      }
    } catch (error) {
      console.error("Error removing rating:", error);
      throw error;
    }
  }

  return {
    ratings,
    userRating,
    averageRating,
    totalRatings: ratings.length,
    loading,
    ratePrompt,
    removeRating,
  };
}

// Star rating component
export function StarRating({
  rating = 0,
  onRate,
  readonly = false,
  size = "normal",
  className = "",
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass =
    size === "small" ? "text-sm" : size === "large" ? "text-xl" : "text-base";

  const handleRate = (newRating) => {
    if (readonly || !onRate) return;
    onRate(newRating);
  };

  return (
    <div className={`flex items-center gap-1 ${sizeClass} ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
          onClick={() => handleRate(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          <span
            className={`${
              star <= (hoverRating || rating)
                ? "text-yellow-400"
                : "text-gray-300"
            } transition-all duration-150`}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

// Prompt rating component
export function PromptRating({ teamId, promptId, compact = false }) {
  const {
    userRating,
    averageRating,
    totalRatings,
    loading,
    ratePrompt,
    removeRating,
  } = usePromptRating(teamId, promptId);

  const [isRating, setIsRating] = useState(false);

  const handleRate = async (rating) => {
    setIsRating(true);
    try {
      await ratePrompt(rating);
    } catch (error) {
      alert("Failed to rate prompt. Please try again.");
    } finally {
      setIsRating(false);
    }
  };

  const handleRemove = async () => {
    setIsRating(true);
    try {
      await removeRating();
    } catch (error) {
      alert("Failed to remove rating. Please try again.");
    } finally {
      setIsRating(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500">Loading ratings...</div>;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StarRating rating={averageRating} readonly size="small" />
        <span className="text-xs text-gray-500">
          {averageRating > 0 ? averageRating.toFixed(1) : "No ratings"}
          {totalRatings > 0 && ` (${totalRatings})`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={averageRating} readonly size="small" />
          <span className="text-sm text-gray-600">
            {totalRatings === 0
              ? "No ratings yet"
              : `${averageRating.toFixed(1)} (${totalRatings} ${
                  totalRatings === 1 ? "rating" : "ratings"
                })`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Your rating:</span>
        <StarRating
          rating={userRating || 0}
          onRate={handleRate}
          disabled={isRating}
        />
        {userRating && (
          <button
            onClick={handleRemove}
            disabled={isRating}
            className="text-xs text-red-600 hover:text-red-800 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// Usage analytics hook
export function useUsageAnalytics(teamId, promptId) {
  const [analytics, setAnalytics] = useState({
    views: 0,
    copies: 0,
    favorites: 0,
    comments: 0,
    lastUsed: null,
  });

  useEffect(() => {
    if (!teamId || !promptId) return;

    const promptRef = doc(db, "teams", teamId, "prompts", promptId);
    const unsub = onSnapshot(promptRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAnalytics(
          data.stats || {
            views: 0,
            copies: 0,
            favorites: 0,
            comments: 0,
            lastUsed: null,
          }
        );
      }
    });

    return () => unsub();
  }, [teamId, promptId]);

  // Track usage
  async function trackUsage(action) {
    if (!teamId || !promptId) return;

    try {
      const promptRef = doc(db, "teams", teamId, "prompts", promptId);
      await updateDoc(promptRef, {
        [`stats.${action}`]: increment(1),
        "stats.lastUsed": serverTimestamp(),
      });
    } catch (error) {
      console.error(`Error tracking ${action}:`, error);
    }
  }

  return { analytics, trackUsage };
}

// Team analytics dashboard
export function TeamAnalytics({ teamId }) {
  const [analytics, setAnalytics] = useState({
    totalPrompts: 0,
    totalViews: 0,
    totalCopies: 0,
    totalComments: 0,
    averageRating: 0,
    topPrompts: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    // Real-time analytics updates
    const promptsRef = collection(db, "teams", teamId, "prompts");
    const unsub = onSnapshot(
      promptsRef,
      async (snap) => {
        try {
          const allPrompts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          // Calculate team totals
          const totals = allPrompts.reduce(
            (acc, prompt) => {
              const stats = prompt.stats || {};
              return {
                totalPrompts: acc.totalPrompts + 1,
                totalViews: acc.totalViews + (stats.views || 0),
                totalCopies: acc.totalCopies + (stats.copies || 0),
                totalComments: acc.totalComments + (stats.comments || 0),
                totalRatings: acc.totalRatings + (stats.totalRatings || 0),
                ratingSum:
                  acc.ratingSum +
                  (stats.averageRating || 0) * (stats.totalRatings || 0),
              };
            },
            {
              totalPrompts: 0,
              totalViews: 0,
              totalCopies: 0,
              totalComments: 0,
              totalRatings: 0,
              ratingSum: 0,
            }
          );

          // Get top rated prompts
          const topPrompts = allPrompts
            .filter((p) => p.stats?.averageRating > 0)
            .sort(
              (a, b) =>
                (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0)
            )
            .slice(0, 5);

          setAnalytics({
            ...totals,
            averageRating:
              totals.totalRatings > 0
                ? totals.ratingSum / totals.totalRatings
                : 0,
            topPrompts,
          });

          setLoading(false);
        } catch (error) {
          console.error("Error loading analytics:", error);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Analytics listener error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <div className="spinner w-4 h-4"></div>
          <span className="text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-6 text-gray-800">
        Team Analytics
      </h3>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {analytics.totalPrompts}
          </div>
          <div className="text-sm text-blue-800">Total Prompts</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {analytics.totalCopies}
          </div>
          <div className="text-sm text-green-800">Times Copied</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {analytics.totalComments}
          </div>
          <div className="text-sm text-purple-800">Comments</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {analytics.averageRating > 0
              ? analytics.averageRating.toFixed(1)
              : "—"}
          </div>
          <div className="text-sm text-yellow-800">Avg Rating</div>
        </div>
      </div>

      {/* Top Prompts */}
      {analytics.topPrompts.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Top Rated Prompts</h4>
          <div className="space-y-2">
            {analytics.topPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">
                    #{index + 1} {prompt.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {prompt.stats?.totalCopies || 0} copies •{" "}
                    {prompt.stats?.comments || 0} comments
                  </div>
                </div>
                <div className="ml-4">
                  <StarRating
                    rating={prompt.stats?.averageRating || 0}
                    readonly
                    size="small"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
