// src/components/MyInvites.jsx - FIXED VERSION
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function MyInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingInvites, setProcessingInvites] = useState(new Set());
  const [teams, setTeams] = useState([]);

  // First, get user's teams to know which teams to check for invites
  useEffect(() => {
    if (!user?.uid) {
      setTeams([]);
      return;
    }

    const teamsQuery = query(
      collection(db, "teams"),
      where(`members.${user.uid}`, "!=", null)
    );

    const unsub = onSnapshot(teamsQuery, (snapshot) => {
      const userTeams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(userTeams);
    });

    return () => unsub();
  }, [user?.uid]);

  // Load invites from all teams the user has access to, plus check for email-based invites
  useEffect(() => {
    if (!user?.email) {
      setInvites([]);
      setLoading(false);
      return;
    }

    async function loadInvites() {
      setLoading(true);
      const allInvites = [];

      try {
        // Method 1: Check each team the user is a member of for invites to their email
        for (const team of teams) {
          try {
            const invitesQuery = query(
              collection(db, "teams", team.id, "invites"),
              where("email", "==", user.email.toLowerCase()),
              where("status", "==", "pending")
            );

            const invitesSnapshot = await getDocs(invitesQuery);
            invitesSnapshot.docs.forEach((doc) => {
              allInvites.push({
                id: doc.id,
                teamId: team.id,
                teamName: team.name,
                ...doc.data(),
              });
            });
          } catch (error) {
            console.warn(`Could not load invites from team ${team.id}:`, error);
          }
        }

        // Method 2: Try to get all teams and check for invites (fallback method)
        if (allInvites.length === 0) {
          try {
            const allTeamsSnapshot = await getDocs(collection(db, "teams"));

            for (const teamDoc of allTeamsSnapshot.docs) {
              try {
                const invitesQuery = query(
                  collection(db, "teams", teamDoc.id, "invites"),
                  where("email", "==", user.email.toLowerCase()),
                  where("status", "==", "pending")
                );

                const invitesSnapshot = await getDocs(invitesQuery);
                invitesSnapshot.docs.forEach((doc) => {
                  allInvites.push({
                    id: doc.id,
                    teamId: teamDoc.id,
                    teamName: teamDoc.data().name || "Unknown Team",
                    ...doc.data(),
                  });
                });
              } catch (error) {
                // Skip teams we don't have access to
                console.debug(`No access to team ${teamDoc.id} invites`);
              }
            }
          } catch (error) {
            console.warn("Could not load teams for invite checking:", error);
          }
        }

        // Sort newest first
        allInvites.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setInvites(allInvites);
      } catch (error) {
        console.error("MyInvites: Error loading invites:", error);
        setInvites([]);
      } finally {
        setLoading(false);
      }
    }

    loadInvites();
  }, [user?.email, teams]);

  // Accept invite
  async function handleAccept(invite) {
    if (!invite?.teamId || !invite?.id) {
      console.error("MyInvites: Invalid invite data:", invite);
      return;
    }

    const inviteKey = invite.id;
    setProcessingInvites((prev) => new Set(prev.add(inviteKey)));

    try {
      const batch = writeBatch(db);

      // Add user to team members
      const teamRef = doc(db, "teams", invite.teamId);
      batch.update(teamRef, {
        [`members.${user.uid}`]: invite.role || "member",
      });

      // Mark invite as accepted
      const inviteRef = doc(db, "teams", invite.teamId, "invites", invite.id);
      batch.update(inviteRef, {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByUid: user.uid,
      });

      await batch.commit();

      showNotification(
        `Successfully joined "${invite.teamName}" as ${
          invite.role || "member"
        }!`,
        "success"
      );

      // Remove the accepted invite from local state
      setInvites((prev) => prev.filter((inv) => inv.id !== invite.id));
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
    if (!invite?.teamId || !invite?.id) {
      console.error("MyInvites: Invalid invite data:", invite);
      return;
    }

    const inviteKey = invite.id;
    setProcessingInvites((prev) => new Set(prev.add(inviteKey)));

    try {
      const inviteRef = doc(db, "teams", invite.teamId, "invites", invite.id);
      await updateDoc(inviteRef, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedByUid: user.uid,
      });

      showNotification("Invite declined", "info");

      // Remove the rejected invite from local state
      setInvites((prev) => prev.filter((inv) => inv.id !== invite.id));
    } catch (error) {
      console.error("MyInvites: Error rejecting invite:", error);

      if (error.code !== "not-found") {
        showNotification(
          "Failed to decline invite. Please try again.",
          "error"
        );
      }
    } finally {
      setProcessingInvites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(inviteKey);
        return newSet;
      });
    }
  }

  // Notification helper
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");

    const icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
    };

    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${icons[type]}</span>
        <span>${message}</span>
      </div>
    `;

    notification.className =
      "fixed top-4 right-4 glass-card px-4 py-3 rounded-lg z-50 text-sm transition-opacity duration-300";
    notification.style.backgroundColor = "var(--card)";
    notification.style.color = "var(--foreground)";
    notification.style.border = `1px solid var(--${
      type === "error" ? "destructive" : "primary"
    })`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
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

  function getRoleIcon(role) {
    switch (role) {
      case "admin":
        return "👑";
      case "owner":
        return "🔑";
      default:
        return "👤";
    }
  }

  function getRoleBadge(role) {
    const baseStyle = {
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "0.75rem",
      fontWeight: "500",
      border: "1px solid var(--border)",
    };

    switch (role) {
      case "owner":
        return {
          ...baseStyle,
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)",
        };
      case "admin":
        return {
          ...baseStyle,
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        };
      case "member":
        return {
          ...baseStyle,
          backgroundColor: "var(--secondary)",
          color: "var(--secondary-foreground)",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "var(--muted)",
          color: "var(--muted-foreground)",
        };
    }
  }

  // Don't render if no invites and not loading
  if (!loading && invites.length === 0) {
    return null;
  }

  return (
    <div
      className="p-6 border-t"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      {loading ? (
        <div className="flex items-center gap-3">
          <div className="neo-spinner w-4 h-4"></div>
          <span
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Checking for invitations...
          </span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <span style={{ color: "var(--primary-foreground)" }}>📬</span>
            </div>
            <div>
              <h3
                className="font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Team Invitations
              </h3>
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {invites.length} pending{" "}
                {invites.length === 1 ? "invitation" : "invitations"}
              </p>
            </div>
          </div>

          {/* Invites List */}
          <div className="space-y-3">
            {invites.map((invite) => {
              const isProcessing = processingInvites.has(invite.id);

              return (
                <div
                  key={invite.id}
                  className="glass-card p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Team Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4
                          className="font-semibold truncate"
                          style={{ color: "var(--foreground)" }}
                        >
                          {invite.teamName}
                        </h4>
                        <span style={getRoleBadge(invite.role)}>
                          {getRoleIcon(invite.role)} {invite.role || "member"}
                        </span>
                      </div>

                      {/* Invite Details */}
                      <div
                        className="text-sm space-y-1"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {invite.inviterName && (
                          <p>
                            <span className="font-medium">Invited by:</span>{" "}
                            {invite.inviterName}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Received:</span>{" "}
                          {formatDate(invite.createdAt)}
                        </p>
                      </div>

                      {/* Role Description */}
                      <div
                        className="mt-2 p-2 rounded border text-xs"
                        style={{
                          backgroundColor: "var(--muted)",
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        <span className="font-medium">
                          As a {invite.role || "member"}, you'll be able to:{" "}
                        </span>
                        {invite.role === "admin"
                          ? "manage team members and all prompts"
                          : invite.role === "owner"
                          ? "have full control over the team"
                          : "create and manage your own prompts"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(invite)}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1"
                        style={{
                          backgroundColor: "var(--primary)",
                          color: "var(--primary-foreground)",
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        {isProcessing && (
                          <div className="neo-spinner w-3 h-3"></div>
                        )}
                        Accept
                      </button>

                      <button
                        onClick={() => handleReject(invite)}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium border rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: "var(--secondary)",
                          color: "var(--secondary-foreground)",
                          borderColor: "var(--border)",
                          opacity: isProcessing ? 0.5 : 1,
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div
            className="mt-4 p-3 rounded-lg text-xs flex items-start gap-2"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            <span>💡</span>
            <p>
              Accepting an invitation will give you immediate access to the
              team's prompt library. You can leave teams at any time from the
              team settings.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
