// src/App.jsx - Complete version updated to match demo AI interface
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

// Enhanced Sign In Component - matching demo style
const SignInScreen = ({ onSignIn }) => (
  <div className="min-h-screen" style={{ background: "var(--background)" }}>
    {/* Navigation matching demo */}
    <nav
      className="border-b"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <span
                className="text-xl"
                style={{ color: "var(--primary-foreground)" }}
              >
                🤖
              </span>
            </div>
            <span
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Prompt Teams
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#"
              className="transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              Platform
            </a>
            <a
              href="#"
              className="transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              Features
            </a>
            <a
              href="#"
              className="transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              Teams
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="btn-primary ai-glow px-6 py-2"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </nav>

    {/* Hero Section matching demo */}
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="max-w-4xl mx-auto">
        <div
          className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border"
          style={{
            backgroundColor: "var(--secondary)",
            color: "var(--primary)",
            borderColor: "var(--border)",
          }}
        >
          <span className="text-sm">⚡</span>
          <span className="text-sm font-medium">
            AI-Powered Prompt Collaboration
          </span>
        </div>

        <h1
          className="text-5xl md:text-7xl font-bold mb-6"
          style={{ color: "var(--foreground)" }}
        >
          Build Better Prompts with{" "}
          <span style={{ color: "var(--primary)" }}>Your Team</span>
        </h1>

        <p
          className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          Collaborate on AI prompts with your team. Store, share, and discover
          the best prompts for your projects with advanced neural interface
          design.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={onSignIn}
            className="btn-primary ai-glow px-8 py-3 text-lg font-medium"
          >
            <span className="mr-2">⚡</span>
            Get Started
          </button>
          <button className="btn-secondary px-8 py-3 text-lg font-medium ai-pulse-border">
            <span className="mr-2">▶</span>
            View Demo
          </button>
        </div>

        <div
          className="flex items-center justify-center gap-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>Free forever • No credit card required</span>
        </div>
      </div>
    </section>

    {/* Features Grid matching demo */}
    <section className="container mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          Everything you need for prompt collaboration
        </h2>
        <p
          className="text-lg max-w-2xl mx-auto"
          style={{ color: "var(--muted-foreground)" }}
        >
          Comprehensive tools designed for modern AI prompt development and team
          collaboration
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: "🧠",
            title: "Smart Library",
            desc: "Organize and categorize your prompts with intelligent tagging and search.",
          },
          {
            icon: "👥",
            title: "Team Collaboration",
            desc: "Share prompts with your team and collaborate in real-time.",
          },
          {
            icon: "⭐",
            title: "Favorites & Ratings",
            desc: "Save your best prompts and rate others contributions.",
          },
          {
            icon: "📊",
            title: "Analytics",
            desc: "Track usage patterns and optimize your prompt performance.",
          },
        ].map((feature, index) => (
          <div
            key={index}
            className="glass-card p-6 hover:border-primary/50 transition-all duration-300"
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              <span className="text-2xl">{feature.icon}</span>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {feature.title}
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </section>

    {/* Footer matching demo */}
    <footer
      className="border-t mt-20"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <span style={{ color: "var(--primary-foreground)" }}>🤖</span>
              </div>
              <span
                className="font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Prompt Teams
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Building the future of AI prompt collaboration
            </p>
          </div>
          <div>
            <h4
              className="font-semibold mb-3"
              style={{ color: "var(--foreground)" }}
            >
              Platform
            </h4>
            <ul
              className="space-y-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Teams
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Prompts
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className="font-semibold mb-3"
              style={{ color: "var(--foreground)" }}
            >
              Resources
            </h4>
            <ul
              className="space-y-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Tutorials
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Community
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className="font-semibold mb-3"
              style={{ color: "var(--foreground)" }}
            >
              Company
            </h4>
            <ul
              className="space-y-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div
          className="border-t mt-8 pt-8 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <p>© 2025 Prompt Teams. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
);

export default function App() {
  const { user, signInWithGoogle, logout } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [role, setRole] = useState(null);
  const [avatars, setAvatars] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("prompts");
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

  // Enhanced Avatar component
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

        if (data.length > 0 && !activeTeam && activeView !== "favorites") {
          setActiveTeam(data[0].id);
        }

        if (activeTeam && !data.find((t) => t.id === activeTeam)) {
          setActiveTeam(null);
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

  // Load avatars and team stats
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

        // Load team stats
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

  // Get role badge styling
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
      <div className="app-container">
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center">
            <div className="neo-spinner mx-auto mb-4"></div>
            <p style={{ color: "var(--muted-foreground)" }}>
              Loading your teams...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show enhanced landing page
  if (!user) {
    return <SignInScreen onSignIn={signInWithGoogle} />;
  }

  return (
    <div className="app-container flex min-h-screen">
      {/* Enhanced Sidebar matching demo cards */}
      <div className="team-sidebar w-72 p-4 flex flex-col">
        {/* User Profile Card */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar
              src={user.photoURL}
              name={user.displayName}
              email={user.email}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "var(--foreground)" }}
              >
                {user.displayName || user.email}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {teams.length} {teams.length === 1 ? "team" : "teams"}
              </p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full ai-pulse-border"></div>
          </div>
        </div>

        {/* Favorites Card */}
        <div className="mb-6">
          <button
            onClick={() => {
              setActiveTeam(null);
              setActiveView("favorites");
            }}
            className={`w-full p-4 text-left rounded-lg transition-all duration-300 border ${
              activeView === "favorites" && !activeTeam
                ? "ai-glow border-primary"
                : "glass-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <span
                  className="font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  My Favorites
                </span>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Your saved prompts
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Teams Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Teams
          </h2>
          {teams.length > 0 && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
              }}
            >
              {teams.length}
            </span>
          )}
        </div>

        {/* Teams List */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
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
              <div
                key={team.id}
                className={`team-item p-4 cursor-pointer ${
                  isActive ? "active" : ""
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
                    <div className="flex items-center gap-2 mb-2">
                      <p
                        className="font-semibold truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {team.name}
                      </p>
                      <span style={getRoleBadge(myRole)}>{myRole}</span>
                    </div>
                    <div
                      className="flex items-center gap-4 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span className="flex items-center gap-1">
                        👥 {stats.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        📝 {stats.promptCount}
                      </span>
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div
                    className="flex justify-between items-center mt-3 pt-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <div
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Owner: {ownerData?.name || ownerData?.email || "Unknown"}
                    </div>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTeam(team.id);
                        }}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: "var(--destructive)" }}
                        title="Delete team"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Create Team Form */}
        <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = e.target.teamName.value.trim();
              if (name) {
                createTeam(name);
                e.target.reset();
              }
            }}
            className="space-y-3 mb-4"
          >
            <input
              type="text"
              name="teamName"
              placeholder="New team name"
              className="form-input"
              required
            />
            <button type="submit" className="btn-primary w-full">
              Create Team
            </button>
          </form>

          <button onClick={logout} className="btn-secondary w-full">
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="p-6 border-b"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              {activeTeamObj ? (
                <>
                  <h1
                    className="text-2xl font-bold mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    {activeTeamObj.name}
                  </h1>
                  <div
                    className="flex items-center gap-4 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <span className="flex items-center gap-2">
                      Your role:
                      <span style={getRoleBadge(role)}>{role}</span>
                    </span>
                    <span>
                      {Object.keys(activeTeamObj.members || {}).length} members
                    </span>
                  </div>
                </>
              ) : activeView === "favorites" ? (
                <>
                  <h1
                    className="text-2xl font-bold mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    My Favorites
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Your bookmarked prompts from all teams
                  </p>
                </>
              ) : null}
            </div>

            {/* View Toggle */}
            {activeTeamObj && (
              <div className="glass-card p-1 rounded-lg">
                {["prompts", "members", "analytics", "activity"].map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                      activeView === view
                        ? "text-primary-foreground"
                        : "hover:text-foreground"
                    }`}
                    style={
                      activeView === view
                        ? {
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }
                        : { color: "var(--muted-foreground)" }
                    }
                  >
                    {view}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 p-6 overflow-y-auto"
          style={{ backgroundColor: "var(--background)" }}
        >
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
                <div className="glass-card p-8 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🚀</div>
                  <h2
                    className="text-xl font-semibold mb-4"
                    style={{ color: "var(--foreground)" }}
                  >
                    No Team Selected
                  </h2>
                  <p
                    className="mb-6"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Select a team from the sidebar or create a new one to get
                    started.
                  </p>
                  {teams.length === 0 && (
                    <p
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Create your first team to start collaborating on AI
                      prompts!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <MyInvites />
      </div>
    </div>
  );
}
