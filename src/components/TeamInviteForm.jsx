// src/components/TeamInviteForm.jsx - Updated for global collection
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function TeamInviteForm({ teamId, teamName, role }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [loading, setLoading] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();

    if (!email.trim()) {
      alert("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Generate unique invite ID
      const inviteId = `${teamId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create invite in global collection
      await setDoc(doc(db, "team-invites", inviteId), {
        teamId: teamId,
        teamName: teamName,
        email: email.trim().toLowerCase(),
        role: inviteRole,
        inviterUid: user.uid,
        inviterName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        status: "pending",
      });

      setEmail("");
      setInviteRole("member");
      alert(`Invite sent to ${email.trim()}!`);
    } catch (err) {
      console.error("Error sending invite:", err);
      if (err.code === "permission-denied") {
        alert("You don't have permission to send invites for this team.");
      } else {
        alert("Failed to send invite: " + (err.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  }

  // Only owner/admin can invite
  if (role !== "owner" && role !== "admin") {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mt-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Invite Member to {teamName}
      </h3>

      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label
            htmlFor="invite-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address *
          </label>
          <input
            id="invite-email"
            type="email"
            placeholder="Enter email address"
            className="form-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            They'll receive an invitation to join your team
          </p>
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role
          </label>
          <select
            id="invite-role"
            className="form-input w-full"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            disabled={loading}
          >
            <option value="member">
              Member - Can create and manage own prompts
            </option>
            <option value="admin">
              Admin - Can manage team members and all prompts
            </option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <div className="spinner"></div>}
            {loading ? "Sending..." : "Send Invite"}
          </button>

          {email && !loading && (
            <button
              type="button"
              onClick={() => setEmail("")}
              className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Role Permissions:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>
            <strong>Member:</strong> Can create, edit, and delete their own
            prompts
          </div>
          <div>
            <strong>Admin:</strong> Can manage all prompts and invite new
            members
          </div>
          <div>
            <strong>Owner:</strong> Can delete the team and change member roles
          </div>
        </div>
      </div>
    </div>
  );
}
