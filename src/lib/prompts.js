import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  deleteDoc as fbDeleteDoc,
} from "firebase/firestore";

// Save new prompt
export async function savePrompt(userId, prompt, teamId) {
  if (!teamId) throw new Error("No team selected");

  await addDoc(collection(db, "teams", teamId, "prompts"), {
    ...prompt,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });
}

// Update existing prompt
export async function updatePrompt(teamId, promptId, updates) {
  const ref = doc(db, "teams", teamId, "prompts", promptId);
  await updateDoc(ref, updates);
}

// Delete prompt
export async function deletePrompt(teamId, promptId) {
  const ref = doc(db, "teams", teamId, "prompts", promptId);
  await deleteDoc(ref);
}

// ✅ Toggle Favorite
export async function toggleFavorite(userId, prompt, isFav) {
  const favRef = doc(db, "users", userId, "favorites", prompt.id);

  if (isFav) {
    // remove favorite
    await fbDeleteDoc(favRef);
  } else {
    // add favorite
    await setDoc(favRef, {
      teamId: prompt.teamId,
      promptId: prompt.id,
      title: prompt.title,
      text: prompt.text,
      tags: prompt.tags || [],
      createdAt: serverTimestamp(),
    });
  }
}
