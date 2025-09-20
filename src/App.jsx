// src/App.jsx
import { useEffect, useState } from "react";
import { db } from "./lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "./context/AuthContext";
import PromptList from "./components/PromptList";
import TeamInviteForm from "./components/TeamInviteForm";
import MyInvites from "./components/MyInvites";
import TeamMembers from "./components/TeamMembers";
import FavoritesList from "./components/Favorites";
import { TeamAnalytics } from "./components/PromptAnalytics";
import ActivityFeed from "./components/ActivityFeed";

export default function App() {
  const { user, signInWithGoogle, logout } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [role, setRole] = useState(null);
  const [avatars, setAvatars] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("prompts"); // 'prompts' | 'members' | 'favorites' | 'analytics' | 'activity'
  const [teamStats, setTeamStats] = useState({});

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

  // Load teams from Firestore
  useEffect(() => {
    if (!user) {
      setTeams([]);
      setActiveTeam(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "teams"),
      where(`members.${user.uid}`, "!=", null)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTeams(data);

        // ✅ Only auto-select a team if NOT in "favorites" view
        if (data.length > 0 && !activeTeam && activeView !== "favorites") {
          setActiveTeam(data[0].id);
        }

        // Clear active team if user no longer has access
        if (activeTeam && !data.find((t) => t.id === activeTeam)) {
          setActiveTeam(null);

          // ✅ Default back to prompts only if not on "favorites"
          if (activeView !== "favorites") {
            setActiveView("prompts");
          }
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error loading teams:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, activeTeam, activeView]);

  // Load current user's role for the active team
  useEffect(() => {
    if (!activeTeam || !user) {
      setRole(null);
      return;
    }

    async function fetchRole() {
      try {
        const teamRef = doc(db, "teams", activeTeam);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const data = teamSnap.data();
          setRole(data.members?.[user.uid] || "member");
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole("member");
      }
    }

    fetchRole();
  }, [activeTeam, user]);

  // Load avatars and team stats - FIXED
  useEffect(() => {
    async function loadTeamData() {
      const avatarResults = {};
      const statsResults = {};

      for (const team of teams) {
        // Load avatars for team members
        for (const uid of Object.keys(team.members || {})) {
          if (!avatarResults[uid]) {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              if (snap.exists()) {
                const userData = snap.data();
                avatarResults[uid] = {
                  avatar: userData.avatar,
                  name: userData.name,
                  email: userData.email,
                };
              }
            } catch (error) {
              console.error("Error loading avatar for", uid, error);
            }
          }
        }

        // FIXED: Load team stats (prompt count) - Use getDocs instead of getDoc
        try {
          const promptsQuery = collection(db, "teams", team.id, "prompts");
          const promptsSnapshot = await getDocs(promptsQuery);
          const promptCount = promptsSnapshot.size;

          statsResults[team.id] = {
            memberCount: Object.keys(team.members || {}).length,
            promptCount: promptCount,
          };
        } catch (error) {
          console.error("Error loading team stats:", error);
          statsResults[team.id] = {
            memberCount: Object.keys(team.members || {}).length,
            promptCount: 0,
          };
        }
      }

      setAvatars(avatarResults);
      setTeamStats(statsResults);
    }

    if (teams.length > 0) loadTeamData();
  }, [teams]);

  // Create new team
  async function createTeam(name) {
    if (!name || !user) return;
    try {
      await addDoc(collection(db, "teams"), {
        name,
        ownerId: user.uid,
        members: {
          [user.uid]: "owner",
        },
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Failed to create team. Please try again.");
    }
  }

  // Delete team (owner only)
  async function deleteTeam(teamId) {
    if (!user) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    if (team.ownerId !== user.uid) {
      alert("Only the team owner can delete this team.");
      return;
    }

    const memberCount = Object.keys(team.members || {}).length;
    const confirmMessage =
      memberCount > 1
        ? `Delete team "${team.name}"? This will remove ${memberCount} members and cannot be undone.`
        : `Delete team "${team.name}"? This cannot be undone.`;

    if (confirm(confirmMessage)) {
      try {
        await deleteDoc(doc(db, "teams", teamId));
        if (activeTeam === teamId) {
          setActiveTeam(null);
          setActiveView("prompts");
        }
      } catch (error) {
        console.error("Error deleting team:", error);
        alert("Failed to delete team. Please try again.");
      }
    }
  }

  // Get active team object
  const activeTeamObj = teams.find((t) => t.id === activeTeam);

  // Get role badge color
  function getRoleBadgeColor(role) {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "member":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  // Check permissions
  function canManageTeam() {
    return role === "owner";
  }

  function canManageMembers() {
    return role === "owner" || role === "admin";
  }

  // Loading state
  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your teams...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-800">
            Welcome to Prompt Teams
          </h1>
          <p className="text-gray-600 mb-6">
            Collaborate on AI prompts with your team
          </p>
          <button
            onClick={signInWithGoogle}
            className="btn-primary w-full py-3 text-lg"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container flex">
      {/* Sidebar */}
      <div className="team-sidebar w-72 p-4 flex flex-col">
        {/* User Profile */}
        <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-4">
          <UserAvatar
            src={user.photoURL}
            name={user.displayName}
            email={user.email}
            className="mr-3"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {user.displayName || user.email}
            </p>
            <p className="text-xs text-gray-500">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </p>
          </div>
        </div>

        {/* Global View Toggle */}
        <div className="mb-4">
          <button
            onClick={() => {
              setActiveTeam(null);
              setActiveView("favorites");
            }}
            className={`w-full p-3 text-left rounded-lg transition-colors ${
              activeView === "favorites" && !activeTeam
                ? "bg-yellow-100 border-2 border-yellow-300"
                : "bg-white hover:bg-gray-50 border-2 border-transparent"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span className="font-medium">My Favorites</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your saved prompts from all teams
            </p>
          </button>
        </div>

        {/* Teams List */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">My Teams</h2>
          {teams.length > 0 && (
            <span className="text-sm text-gray-500">{teams.length}</span>
          )}
        </div>

        <ul className="flex-1 overflow-y-auto space-y-2 mb-4">
          {teams.map((team) => {
            const isOwner = team.ownerId === user.uid;
            const myRole = team.members?.[user.uid];
            const ownerData = avatars[team.ownerId];
            const isActive = activeTeam === team.id;
            const stats = teamStats[team.id] || {
              memberCount: 0,
              promptCount: 0,
            };

            return (
              <li
                key={team.id}
                className={`team-item p-3 cursor-pointer rounded-lg border-2 ${
                  isActive
                    ? "team-item active border-blue-200"
                    : "border-transparent"
                }`}
              >
                <div
                  onClick={() => {
                    setActiveTeam(team.id);
                    setActiveView("prompts");
                  }}
                  className="flex items-start gap-3"
                >
                  <UserAvatar
                    src={ownerData?.avatar}
                    name={ownerData?.name}
                    email={ownerData?.email}
                    size="small"
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-800 truncate">
                        {team.name}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${getRoleBadgeColor(
                          myRole
                        )}`}
                      >
                        {myRole}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>
                        {stats.memberCount}{" "}
                        {stats.memberCount === 1 ? "member" : "members"}
                      </p>
                      <p>
                        {stats.promptCount}{" "}
                        {stats.promptCount === 1 ? "prompt" : "prompts"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team Actions */}
                {isActive && (
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Owner: {ownerData?.name || ownerData?.email || "Unknown"}
                    </div>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTeam(team.id);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded transition-colors"
                        title="Delete team"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Create Team Form */}
        <div className="border-t border-gray-200 pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = e.target.teamName.value.trim();
              if (name) {
                createTeam(name);
                e.target.reset();
              }
            }}
            className="mb-4"
          >
            <input
              type="text"
              name="teamName"
              placeholder="New team name"
              className="form-input w-full mb-2"
              required
            />
            <button type="submit" className="btn-primary w-full">
              Create Team
            </button>
          </form>

          <button onClick={logout} className="btn-secondary w-full">
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {activeTeamObj ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    {activeTeamObj.name}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      Your role:{" "}
                      <span
                        className={`font-medium capitalize px-2 py-0.5 rounded text-xs ${getRoleBadgeColor(
                          role
                        ).replace("border-", "border ")}`}
                      >
                        {role}
                      </span>
                    </span>
                    <span>
                      {Object.keys(activeTeamObj.members || {}).length}{" "}
                      {Object.keys(activeTeamObj.members || {}).length === 1
                        ? "member"
                        : "members"}
                    </span>
                  </div>
                </>
              ) : activeView === "favorites" ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    My Favorites
                  </h1>
                  <p className="text-sm text-gray-600">
                    Your bookmarked prompts from all teams
                  </p>
                </>
              ) : null}
            </div>

            {/* View Toggle - Only show if we have an active team */}
            {activeTeamObj && (
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView("prompts")}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    activeView === "prompts"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Prompts
                </button>
                <button
                  onClick={() => setActiveView("members")}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    activeView === "members"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Members
                </button>
                <button
                  onClick={() => setActiveView("analytics")}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    activeView === "analytics"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveView("activity")}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    activeView === "activity"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Activity
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {activeTeamObj && activeView === "prompts" && (
            <>
              <PromptList activeTeam={activeTeamObj.id} userRole={role} />

              {canManageMembers() && (
                <TeamInviteForm
                  teamId={activeTeamObj.id}
                  teamName={activeTeamObj.name}
                  role={role}
                />
              )}
            </>
          )}

          {activeTeamObj && activeView === "members" && (
            <TeamMembers
              teamId={activeTeamObj.id}
              teamName={activeTeamObj.name}
              userRole={role}
              teamData={activeTeamObj}
            />
          )}

          {activeTeamObj && activeView === "analytics" && (
            <div className="space-y-6">
              <TeamAnalytics teamId={activeTeamObj.id} />
            </div>
          )}

          {activeTeamObj && activeView === "activity" && (
            <ActivityFeed teamId={activeTeamObj.id} />
          )}

          {activeView === "favorites" && !activeTeam && <FavoritesList />}

          {!activeTeamObj && activeView !== "favorites" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h2 className="text-xl font-semibold text-gray-600 mb-2">
                  No Team Selected
                </h2>
                <p className="text-gray-500 mb-4">
                  Select a team from the sidebar or create a new one to get
                  started.
                </p>
                {teams.length === 0 && (
                  <p className="text-sm text-gray-400">
                    Create your first team to start collaborating on AI prompts!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <MyInvites />
      </div>
    </div>
  );
}
