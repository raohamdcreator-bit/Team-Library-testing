// src/components/MyInvites.jsx - Reliable global collection approach
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function MyInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingInvites, setProcessingInvites] = useState(new Set());

  useEffect(() => {
    if (!user?.email) {
      setInvites([]);
      setLoading(false);
      return;
    }

    console.log(
      "MyInvites: Setting up global collection query for:",
      user.email
    );

    // Query global invites collection - much more reliable
    const q = query(
      collection(db, "team-invites"),
      where("email", "==", user.email.toLowerCase()),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        console.log("MyInvites: Received", snapshot.docs.length, "invites");

        const inviteData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          console.log("MyInvites: Processing invite:", data);

          return {
            id: docSnap.id,
            ...data,
          };
        });

        // Sort by creation date, newest first
        inviteData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setInvites(inviteData);
        setLoading(false);
      },
      (error) => {
        console.error("MyInvites: Query failed:", error);
        setInvites([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.email]);

  // Accept invite
  async function handleAccept(invite) {
    if (!invite?.teamId || !invite?.id) {
      console.error("MyInvites: Invalid invite data:", invite);
      return;
    }

    const inviteKey = invite.id;
    setProcessingInvites((prev) => new Set(prev.add(inviteKey)));

    try {
      console.log("MyInvites: Accepting invite:", invite);

      // Add user to team members
      const teamRef = doc(db, "teams", invite.teamId);
      await updateDoc(teamRef, {
        [`members.${user.uid}`]: invite.role || "member",
      });

      // Mark invite as accepted
      const inviteRef = doc(db, "team-invites", invite.id);
      await updateDoc(inviteRef, {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByUid: user.uid,
      });

      showNotification(
        `Successfully joined "${invite.teamName}" as ${
          invite.role || "member"
        }!`,
        "success"
      );
    } catch (error) {
      console.error("MyInvites: Error accepting invite:", error);

      let errorMessage = "Failed to accept invite. ";
      if (error.code === "permission-denied") {
        errorMessage += "You may not have permission to join this team.";
      } else if (error.code === "not-found") {
        errorMessage += "The team or invite no longer exists.";
      } else {
        errorMessage += "Please try again.";
      }

      showNotification(errorMessage, "error");
    } finally {
      setProcessingInvites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(inviteKey);
        return newSet;
      });
    }
  }

  // Reject invite
  async function handleReject(invite) {
    if (!invite?.id) {
      console.error("MyInvites: Invalid invite data:", invite);
      return;
    }

    const inviteKey = invite.id;
    setProcessingInvites((prev) => new Set(prev.add(inviteKey)));

    try {
      console.log("MyInvites: Rejecting invite:", invite);

      // Mark invite as rejected
      const inviteRef = doc(db, "team-invites", invite.id);
      await updateDoc(inviteRef, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedByUid: user.uid,
      });

      showNotification("Invite rejected", "info");
    } catch (error) {
      console.error("MyInvites: Error rejecting invite:", error);

      if (error.code !== "not-found") {
        showNotification("Failed to reject invite. Please try again.", "error");
      }
    } finally {
      setProcessingInvites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(inviteKey);
        return newSet;
      });
    }
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.textContent = message;

    const baseClasses =
      "fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300";
    const typeClasses = {
      success: "bg-green-600 text-white",
      error: "bg-red-600 text-white",
      info: "bg-blue-600 text-white",
    };

    notification.className = `${baseClasses} ${
      typeClasses[type] || typeClasses.info
    }`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  function formatDate(timestamp) {
    if (!timestamp) return "Unknown";
    try {
      return timestamp.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">My Invites</h3>
        <div className="flex items-center justify-center py-6">
          <div className="spinner mr-3"></div>
          <span className="text-gray-600">Loading invites...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">My Invites</h3>
        {invites.length > 0 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {invites.length}
          </span>
        )}
      </div>

      {invites.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-4xl mb-2">📬</div>
          <p className="text-gray-600 font-medium">No pending invites</p>
          <p className="text-gray-500 text-sm mt-1">
            Team invitations will appear here when you receive them
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => {
            const isProcessing = processingInvites.has(invite.id);

            return (
              <div
                key={invite.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-800 text-lg truncate">
                        {invite.teamName || "Unknown Team"}
                      </h4>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {invite.role || "member"}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      {invite.inviterName && (
                        <p>
                          Invited by:{" "}
                          <span className="font-medium">
                            {invite.inviterName}
                          </span>
                        </p>
                      )}
                      <p>Received: {formatDate(invite.createdAt)}</p>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      As a {invite.role || "member"}, you'll be able to{" "}
                      {invite.role === "admin"
                        ? "manage team members and all prompts"
                        : invite.role === "owner"
                        ? "have full control over the team"
                        : "create and manage your own prompts"}
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(invite)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      )}
                      Accept
                    </button>

                    <button
                      onClick={() => handleReject(invite)}
                      disabled={isProcessing}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
