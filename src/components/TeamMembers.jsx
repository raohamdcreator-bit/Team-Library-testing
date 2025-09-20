// src/components/TeamMembers.jsx
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  collectionGroup,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function TeamMembers({ teamId, teamName, userRole, teamData }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingMember, setUpdatingMember] = useState(null);

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

  // Helper component for avatar with fallback
  function UserAvatar({ src, name, email, size = "normal", className = "" }) {
    const [imageError, setImageError] = useState(false);
    const avatarClass = size === "small" ? "user-avatar-small" : "user-avatar";
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
      />
    );
  }

  // Load team members and their profiles
  useEffect(() => {
    if (!teamData || !teamData.members) {
      setMembers([]);
      setLoading(false);
      return;
    }

    async function loadMemberProfiles() {
      const memberList = [];
      const profiles = {};

      for (const [uid, role] of Object.entries(teamData.members)) {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            profiles[uid] = userData;
            memberList.push({
              uid,
              role,
              ...userData,
            });
          } else {
            // User profile doesn't exist, show basic info
            memberList.push({
              uid,
              role,
              name: "Unknown User",
              email: "unknown@example.com",
            });
          }
        } catch (error) {
          console.error("Error loading member profile:", error);
        }
      }

      setMembers(memberList);
      setMemberProfiles(profiles);
      setLoading(false);
    }

    loadMemberProfiles();
  }, [teamData]);

  // Load pending invites
  useEffect(() => {
    if (!teamId) return;

    const q = collection(db, "teams", teamId, "invites");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const inviteData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPendingInvites(inviteData);
      },
      (error) => {
        console.error("Error loading pending invites:", error);
      }
    );

    return () => unsub();
  }, [teamId]);

  // Change member role
  async function handleRoleChange(memberUid, newRole) {
    if (!canManageMembers() || memberUid === teamData.ownerId) return;

    if (!confirm(`Change this member's role to ${newRole}?`)) return;

    setUpdatingMember(memberUid);
    try {
      await updateDoc(doc(db, "teams", teamId), {
        [`members.${memberUid}`]: newRole,
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      alert("Failed to update member role. Please try again.");
    } finally {
      setUpdatingMember(null);
    }
  }

  // Remove member from team
  async function handleRemoveMember(memberUid, memberName) {
    if (
      !canManageMembers() ||
      memberUid === teamData.ownerId ||
      memberUid === user.uid
    )
      return;

    if (!confirm(`Remove ${memberName || "this member"} from the team?`))
      return;

    setUpdatingMember(memberUid);
    try {
      await updateDoc(doc(db, "teams", teamId), {
        [`members.${memberUid}`]: null,
      });
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member. Please try again.");
    } finally {
      setUpdatingMember(null);
    }
  }

  // Cancel pending invite
  async function handleCancelInvite(inviteId, email) {
    if (!canManageMembers()) return;

    if (!confirm(`Cancel invite for ${email}?`)) return;

    try {
      await deleteDoc(doc(db, "teams", teamId, "invites", inviteId));
    } catch (error) {
      console.error("Error canceling invite:", error);
      alert("Failed to cancel invite. Please try again.");
    }
  }

  // Check if current user can manage members
  function canManageMembers() {
    return userRole === "owner" || userRole === "admin";
  }

  // Get role color
  function getRoleColor(role) {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "member":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center py-4">
          <div className="spinner mr-3"></div>
          <span className="text-gray-600">Loading team members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        Team Members ({members.length})
      </h3>

      {/* Current Members */}
      <div className="space-y-3 mb-6">
        {members.map((member) => {
          const isOwner = member.uid === teamData.ownerId;
          const isCurrentUser = member.uid === user.uid;
          const isUpdating = updatingMember === member.uid;

          return (
            <div
              key={member.uid}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={member.avatar}
                  name={member.name}
                  email={member.email}
                  size="small"
                />
                <div>
                  <p className="font-medium text-gray-800">
                    {member.name || member.email}
                    {isCurrentUser && (
                      <span className="text-gray-500 ml-1">(You)</span>
                    )}
                  </p>
                  {member.name && member.email && (
                    <p className="text-sm text-gray-500">{member.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canManageMembers() && !isOwner && !isCurrentUser ? (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.uid, e.target.value)
                    }
                    disabled={isUpdating}
                    className="form-input text-sm py-1 px-2"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getRoleColor(
                      member.role
                    )}`}
                  >
                    {member.role}
                  </span>
                )}

                {canManageMembers() && !isOwner && !isCurrentUser && (
                  <button
                    onClick={() => handleRemoveMember(member.uid, member.name)}
                    disabled={isUpdating}
                    className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded transition-colors"
                    title="Remove from team"
                  >
                    {isUpdating ? <div className="spinner"></div> : "Remove"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <>
          <h4 className="font-medium text-gray-700 mb-3">
            Pending Invites ({pendingInvites.length})
          </h4>
          <div className="space-y-2 mb-4">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{invite.email}</p>
                  <p className="text-sm text-gray-500">
                    Invited as {invite.role} •{" "}
                    {new Date(invite.createdAt?.toDate()).toLocaleDateString()}
                  </p>
                </div>

                {canManageMembers() && (
                  <button
                    onClick={() => handleCancelInvite(invite.id, invite.email)}
                    className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Role Permissions Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Team Roles:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>
            <strong>Owner:</strong> Full control - can delete team, manage all
            members and prompts
          </div>
          <div>
            <strong>Admin:</strong> Can manage members, invites, and all prompts
          </div>
          <div>
            <strong>Member:</strong> Can create and manage own prompts only
          </div>
        </div>
      </div>
    </div>
  );
}
