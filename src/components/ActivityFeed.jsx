// src/components/ActivityFeed.jsx
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// Activity types
export const ACTIVITY_TYPES = {
  PROMPT_CREATED: "prompt_created",
  PROMPT_UPDATED: "prompt_updated",
  PROMPT_DELETED: "prompt_deleted",
  PROMPT_RATED: "prompt_rated",
  PROMPT_COMMENTED: "prompt_commented",
  MEMBER_JOINED: "member_joined",
  MEMBER_LEFT: "member_left",
  TEAM_CREATED: "team_created",
};

// Activity logger utility
export class ActivityLogger {
  static async logActivity(teamId, type, data = {}) {
    try {
      await addDoc(collection(db, "teams", teamId, "activities"), {
        type,
        data,
        timestamp: serverTimestamp(),
        userId: data.userId,
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  static async logPromptCreated(teamId, userId, promptId, promptTitle) {
    await this.logActivity(teamId, ACTIVITY_TYPES.PROMPT_CREATED, {
      userId,
      promptId,
      promptTitle,
    });
  }

  static async logPromptUpdated(teamId, userId, promptId, promptTitle) {
    await this.logActivity(teamId, ACTIVITY_TYPES.PROMPT_UPDATED, {
      userId,
      promptId,
      promptTitle,
    });
  }

  static async logPromptRated(teamId, userId, promptId, promptTitle, rating) {
    await this.logActivity(teamId, ACTIVITY_TYPES.PROMPT_RATED, {
      userId,
      promptId,
      promptTitle,
      rating,
    });
  }

  static async logPromptCommented(teamId, userId, promptId, promptTitle) {
    await this.logActivity(teamId, ACTIVITY_TYPES.PROMPT_COMMENTED, {
      userId,
      promptId,
      promptTitle,
    });
  }

  static async logMemberJoined(teamId, userId, userName) {
    await this.logActivity(teamId, ACTIVITY_TYPES.MEMBER_JOINED, {
      userId,
      userName,
    });
  }
}

// Hook for loading activity feed
export function useActivityFeed(teamId, limit_count = 20) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    if (!teamId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "teams", teamId, "activities"),
      orderBy("timestamp", "desc"),
      limit(limit_count)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const activityData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setActivities(activityData);

        // Load user profiles for activities
        const userIds = [
          ...new Set(activityData.map((a) => a.userId).filter(Boolean)),
        ];
        const profilesData = {};

        for (const userId of userIds) {
          if (!profilesData[userId]) {
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                profilesData[userId] = userDoc.data();
              }
            } catch (error) {
              console.error("Error loading user profile:", error);
            }
          }
        }

        setProfiles(profilesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading activities:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, limit_count]);

  return { activities, loading, profiles };
}

// Activity item component
function ActivityItem({ activity, profile }) {
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case ACTIVITY_TYPES.PROMPT_CREATED:
        return "✨";
      case ACTIVITY_TYPES.PROMPT_UPDATED:
        return "✏️";
      case ACTIVITY_TYPES.PROMPT_DELETED:
        return "🗑️";
      case ACTIVITY_TYPES.PROMPT_RATED:
        return "⭐";
      case ACTIVITY_TYPES.PROMPT_COMMENTED:
        return "💬";
      case ACTIVITY_TYPES.MEMBER_JOINED:
        return "👋";
      case ACTIVITY_TYPES.MEMBER_LEFT:
        return "👋";
      case ACTIVITY_TYPES.TEAM_CREATED:
        return "🎉";
      default:
        return "📝";
    }
  };

  const getActivityMessage = () => {
    const userName = profile?.name || profile?.email || "Someone";
    const data = activity.data || {};

    switch (activity.type) {
      case ACTIVITY_TYPES.PROMPT_CREATED:
        return (
          <span>
            <span className="font-medium">{userName}</span> created prompt{" "}
            <span className="font-medium text-blue-600">
              "{data.promptTitle}"
            </span>
          </span>
        );
      case ACTIVITY_TYPES.PROMPT_UPDATED:
        return (
          <span>
            <span className="font-medium">{userName}</span> updated prompt{" "}
            <span className="font-medium text-blue-600">
              "{data.promptTitle}"
            </span>
          </span>
        );
      case ACTIVITY_TYPES.PROMPT_DELETED:
        return (
          <span>
            <span className="font-medium">{userName}</span> deleted prompt{" "}
            <span className="font-medium text-gray-600">
              "{data.promptTitle}"
            </span>
          </span>
        );
      case ACTIVITY_TYPES.PROMPT_RATED:
        return (
          <span>
            <span className="font-medium">{userName}</span> rated prompt{" "}
            <span className="font-medium text-blue-600">
              "{data.promptTitle}"
            </span>{" "}
            {data.rating} stars
          </span>
        );
      case ACTIVITY_TYPES.PROMPT_COMMENTED:
        return (
          <span>
            <span className="font-medium">{userName}</span> commented on{" "}
            <span className="font-medium text-blue-600">
              "{data.promptTitle}"
            </span>
          </span>
        );
      case ACTIVITY_TYPES.MEMBER_JOINED:
        return (
          <span>
            <span className="font-medium">{userName}</span> joined the team
          </span>
        );
      case ACTIVITY_TYPES.MEMBER_LEFT:
        return (
          <span>
            <span className="font-medium">{userName}</span> left the team
          </span>
        );
      case ACTIVITY_TYPES.TEAM_CREATED:
        return (
          <span>
            <span className="font-medium">{userName}</span> created the team
          </span>
        );
      default:
        return <span>Unknown activity</span>;
    }
  };

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

  function UserAvatar({ src, name, email, size = "small", className = "" }) {
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

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="relative">
        <UserAvatar
          src={profile?.avatar}
          name={profile?.name}
          email={profile?.email}
          size="small"
        />
        <div className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 border border-gray-200">
          {getActivityIcon(activity.type)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800">{getActivityMessage()}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {formatTimeAgo(activity.timestamp)}
        </div>
      </div>
    </div>
  );
}

// Main activity feed component
export default function ActivityFeed({ teamId, compact = false }) {
  const { activities, loading, profiles } = useActivityFeed(
    teamId,
    compact ? 5 : 20
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="spinner w-4 h-4"></div>
          <span className="text-gray-600 text-sm">Loading activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-800">
          {compact ? "Recent Activity" : "Team Activity"}
        </h3>
      </div>

      <div className={compact ? "max-h-64 overflow-y-auto" : ""}>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-2">📋</div>
            <p className="text-gray-500 text-sm">No activity yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Team activities will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                profile={profiles[activity.userId]}
              />
            ))}
          </div>
        )}
      </div>

      {compact && activities.length > 5 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
