import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const provider = new GoogleAuthProvider();

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, provider);
    const u = result.user;

    // ✅ Save or update user profile in Firestore
    await setDoc(
      doc(db, "users", u.uid),
      {
        name: u.displayName,
        email: u.email,
        avatar: u.photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
