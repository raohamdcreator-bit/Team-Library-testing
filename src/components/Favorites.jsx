// src/components/Favorites.jsx
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// ----------------------
// Hook: useFavorites
// ----------------------
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userFavoritesRef = collection(db, "users", user.uid, "favorites");

    const unsub = onSnapshot(
      userFavoritesRef,
      (snap) => {
        const favs = snap.docs.map((docSnap) => ({
          id: docSnap.id, // Firestore doc id (== prompt.id)
          ...docSnap.data(),
        }));

        // Sort newest first
        favs.sort(
          (a, b) => (b.addedAt?.toMillis() || 0) - (a.addedAt?.toMillis() || 0)
        );

        console.log("✅ Favorites snapshot:", favs); // DEBUG
        setFavorites(favs);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error loading favorites:", error);
        setFavorites([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  async function addToFavorites(prompt, teamId, teamName) {
    if (!user || !prompt) return;

    const favoriteRef = doc(db, "users", user.uid, "favorites", prompt.id);
    await setDoc(favoriteRef, {
      promptId: prompt.id,
      teamId,
      teamName,
      title: prompt.title,
      text: prompt.text,
      tags: prompt.tags || [],
      originalAuthor: prompt.createdBy,
      addedAt: serverTimestamp(),
      originalCreatedAt: prompt.createdAt,
    });
  }

  async function removeFromFavorites(favoriteId) {
    if (!user || !favoriteId) return;
    const favoriteRef = doc(db, "users", user.uid, "favorites", favoriteId);
    await deleteDoc(favoriteRef);
  }

  async function toggleFavorite(prompt, teamId, teamName) {
    if (!prompt) return;

    const exists = favorites.some((f) => f.id === prompt.id);
    if (exists) {
      await removeFromFavorites(prompt.id);
    } else {
      await addToFavorites(prompt, teamId, teamName);
    }
  }

  return {
    favorites,
    loading,
    isFavorite: (promptId) => favorites.some((f) => f.id === promptId),
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
  };
}

// ----------------------
// Component: FavoriteButton
// ----------------------
export function FavoriteButton({
  prompt,
  teamId,
  teamName,
  size = "normal",
  className = "",
}) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);

  if (!user) return null;

  async function handleToggle(e) {
    e.stopPropagation();
    if (isToggling || !prompt) return;

    setIsToggling(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          name: user.displayName || "",
          email: user.email || "",
          avatar: user.photoURL || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await toggleFavorite(prompt, teamId, teamName);

      const action = isFavorite(prompt.id) ? "removed from" : "added to";
      const toast = document.createElement("div");
      toast.textContent = `Prompt ${action} favorites!`;
      toast.className =
        "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 2000);
    } catch (error) {
      console.error("❌ Error updating favorites:", error);

      let errorMessage = "Failed to update favorites. ";
      if (error.code === "permission-denied") {
        errorMessage += "You don't have permission to save favorites.";
      } else if (error.code === "unavailable") {
        errorMessage += "Service is temporarily unavailable. Please try again.";
      } else {
        errorMessage += "Please try again.";
      }

      alert(errorMessage);
    } finally {
      setIsToggling(false);
    }
  }

  const isFav = isFavorite(prompt.id);
  const sizeClass = size === "small" ? "text-sm p-1" : "text-base p-2";

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`transition-colors rounded hover:bg-gray-100 ${sizeClass} ${className} ${
        isFav
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-gray-400 hover:text-yellow-500"
      }`}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      {isToggling ? (
        <div className="spinner w-4 h-4"></div>
      ) : (
        <span>{isFav ? "★" : "☆"}</span>
      )}
    </button>
  );
}

// ----------------------
// Component: FavoritesList
// ----------------------
export default function FavoritesList() {
  const { user } = useAuth();
  const { favorites, loading, removeFromFavorites } = useFavorites();
  const [profiles, setProfiles] = useState({});
  const [search, setSearch] = useState("");

  // Load author profiles
  useEffect(() => {
    async function fetchProfiles() {
      const authorIds = [
        ...new Set(favorites.map((f) => f.originalAuthor).filter(Boolean)),
      ];
      const profilesData = {};
      for (const authorId of authorIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", authorId));
          if (userDoc.exists()) {
            profilesData[authorId] = userDoc.data();
          }
        } catch (error) {
          console.error("❌ Error loading author profile:", error);
        }
      }
      setProfiles(profilesData);
    }
    if (favorites.length > 0) fetchProfiles();
  }, [favorites]);

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Prompt copied to clipboard!");
    } catch (error) {
      console.error("❌ Failed to copy:", error);
      alert("Failed to copy to clipboard.");
    }
  }

  // ✅ FIX: don’t filter if search is empty
  const filteredFavorites = favorites.filter((favorite) => {
    if (!search.trim()) return true;
    return (
      favorite.title?.toLowerCase().includes(search.toLowerCase()) ||
      favorite.text?.toLowerCase().includes(search.toLowerCase()) ||
      (Array.isArray(favorite.tags) &&
        favorite.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        ))
    );
  });

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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center py-8">
          <div className="spinner mr-3"></div>
          <span className="text-gray-600">Loading favorites...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">My Favorites</h2>
        <span className="text-sm text-gray-500">{favorites.length} saved</span>
      </div>

      {favorites.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search favorites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {filteredFavorites.length === 0 ? (
        <div className="text-center py-8">
          {favorites.length === 0 ? (
            <>
              <div className="text-gray-400 text-4xl mb-3">⭐</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No favorites yet
              </h3>
              <p className="text-gray-500 text-sm">
                Click the star icon on any prompt to save it to your favorites
              </p>
            </>
          ) : (
            <>
              <div className="text-gray-400 text-4xl mb-3">🔍</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No matching favorites
              </h3>
              <p className="text-gray-500 text-sm">
                Try adjusting your search terms
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFavorites.map((favorite) => {
            const author = profiles[favorite.originalAuthor];

            return (
              <div
                key={favorite.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {favorite.title}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 gap-2 mb-2">
                      <span>From: {favorite.teamName}</span>
                      {author && (
                        <>
                          <span>•</span>
                          <span>By: {author.name || author.email}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Saved: {formatDate(favorite.addedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => copyToClipboard(favorite.text)}
                      className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      📋
                    </button>

                    <button
                      onClick={() => removeFromFavorites(favorite.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded transition-colors"
                      title="Remove from favorites"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">
                  {favorite.text}
                </p>

                {favorite.tags && favorite.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {favorite.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
