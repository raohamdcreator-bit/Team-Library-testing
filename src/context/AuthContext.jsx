// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set persistence
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(
        "Auth state changed:",
        user ? "User logged in" : "User logged out"
      );
      setUser(user);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);

      const provider = new GoogleAuthProvider();

      // Add scopes if needed
      provider.addScope("email");
      provider.addScope("profile");

      // Configure provider settings
      provider.setCustomParameters({
        prompt: "select_account",
      });

      console.log("Attempting Google sign-in...");
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful:", result.user.email);

      return result.user;
    } catch (error) {
      console.error("Google sign-in error:", error);

      let errorMessage = "Failed to sign in";

      switch (error.code) {
        case "auth/popup-blocked":
          errorMessage =
            "Sign-in popup was blocked. Please allow popups for this site and try again.";
          break;
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
          errorMessage = "Sign-in was cancelled. Please try again.";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "Network error. Please check your connection and try again.";
          break;
        case "auth/internal-error":
          errorMessage = "An internal error occurred. Please try again.";
          break;
        default:
          errorMessage = error.message || "An unexpected error occurred";
      }

      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign out error:", error);
      setError("Failed to sign out");
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
