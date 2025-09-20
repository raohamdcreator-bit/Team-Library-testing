// src/components/InviteForm.jsx
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function InviteForm({ teamId, teamName }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  async function handleInvite(e) {
    e.preventDefault();
    if (!email) return alert("Please enter an email");

    try {
      await addDoc(collection(db, "invites"), {
        teamId,
        teamName,
        email,
        role,
        invitedBy: user.email,
        createdAt: serverTimestamp(),
      });

      setEmail("");
      setRole("member");
      alert("Invite sent!");
    } catch (err) {
      console.error("Error sending invite:", err);
      alert("Failed to send invite");
    }
  }

  return (
    <form
      onSubmit={handleInvite}
      className="space-y-2 bg-white p-3 rounded shadow mt-4 w-full max-w-md"
    >
      <h3 className="font-semibold">Invite a member</h3>
      <input
        className="w-full border p-2 rounded"
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <select
        className="w-full border p-2 rounded"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-3 py-1 rounded w-full"
      >
        Send Invite
      </button>
    </form>
  );
}
