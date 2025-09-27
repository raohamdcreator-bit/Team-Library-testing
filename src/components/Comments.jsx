// src/components/Comments.jsx
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// Comments hook
export function useComments(teamId, promptId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    if (!teamId || !promptId) {
      setComments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "teams", teamId, "prompts", promptId, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const commentData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setComments(commentData);

        // Load author profiles
        const authorIds = [
          ...new Set(commentData.map((c) => c.createdBy).filter(Boolean)),
        ];
        const profilesData = {};

        for (const authorId of authorIds) {
          if (!profilesData[authorId]) {
            try {
              const userDoc = await getDoc(doc(db, "users", authorId));
              if (userDoc.exists()) {
                profilesData[authorId] = userDoc.data();
              }
            } catch (error) {
              console.error("Error loading comment author profile:", error);
            }
          }
        }

        setProfiles(profilesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading comments:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, promptId]);

  return { comments, loading, profiles };
}

// Individual comment component
export function Comment({
  comment,
  profile,
  onDelete,
  onEdit,
  canModify,
  onReply,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplyForm, setShowReplyForm] = useState(false);

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
    const avatarClass = size === "small" ? "w-8 h-8" : "w-10 h-10";
    const initialsClass = size === "small" ? "text-xs" : "text-sm";

    if (!src || imageError) {
      return (
        <div
          className={`${avatarClass} ${className} rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25 border-2 border-cyan-400/50`}
        >
          <span className={`${initialsClass} drop-shadow-sm`}>
            {getUserInitials(name, email)}
          </span>
        </div>
      );
    }

    return (
      <img
        src={src}
        alt="avatar"
        className={`${avatarClass} ${className} rounded-full border-2 border-cyan-400/50 shadow-lg shadow-blue-500/25`}
        onError={() => setImageError(true)}
      />
    );
  }

  const handleEdit = async () => {
    if (!editText.trim()) return;

    try {
      await onEdit(comment.id, editText.trim());
      setIsEditing(false);
    } catch (error) {
      alert("Failed to update comment. Please try again.");
    }
  };

  const formatDate = (timestamp) => {
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
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`flex gap-4 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 ${
        comment.parentId
          ? "bg-gray-900/40 ml-8 border-gray-700/50 shadow-inner shadow-blue-900/20"
          : "bg-gray-800/60 border-gray-600/50 shadow-lg shadow-blue-900/20"
      }`}
      style={{
        background: comment.parentId
          ? "linear-gradient(135deg, rgba(17, 24, 39, 0.4) 0%, rgba(31, 41, 55, 0.6) 100%)"
          : "linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.9) 100%)",
      }}
    >
      <UserAvatar
        src={profile?.avatar}
        name={profile?.name}
        email={profile?.email}
        size="small"
        className="mt-0.5 flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-cyan-100 drop-shadow-sm">
              {profile?.name || profile?.email || "Unknown user"}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></span>
              <span>{formatDate(comment.createdAt)}</span>
              {comment.updatedAt && (
                <span className="text-blue-400 font-medium">(edited)</span>
              )}
            </div>
          </div>

          {canModify && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition-all duration-200 backdrop-blur-sm font-medium"
              >
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 transition-all duration-200 backdrop-blur-sm font-medium"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-gray-900/60 border border-cyan-400/30 rounded-lg p-3 text-sm text-cyan-100 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 backdrop-blur-sm placeholder-gray-400"
              rows={3}
              placeholder="Edit your comment..."
              style={{
                background:
                  "linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.9) 100%)",
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={!editText.trim()}
                className="text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 font-medium shadow-lg shadow-cyan-500/25 border border-cyan-400/30"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(comment.text);
                }}
                className="text-xs bg-gray-700/80 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600/80 transition-all duration-200 font-medium border border-gray-500/30"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="group">
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {comment.text}
            </p>

            {!comment.parentId && (
              <div className="mt-3">
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors duration-200 flex items-center gap-1"
                >
                  <span className="w-3 h-3 border border-cyan-400 rounded-sm flex items-center justify-center">
                    <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                  </span>
                  Reply
                </button>
              </div>
            )}
          </div>
        )}

        {showReplyForm && (
          <div className="mt-4 p-3 rounded-lg bg-gray-900/40 border border-gray-700/50">
            <CommentForm
              onSubmit={(text) => {
                onReply(comment.id, text);
                setShowReplyForm(false);
              }}
              onCancel={() => setShowReplyForm(false)}
              placeholder={`Reply to ${profile?.name || "user"}...`}
              submitText="Reply"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Comment form component
export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "Add a comment...",
  submitText = "Comment",
  autoFocus = false,
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } catch (error) {
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900/60 border border-cyan-400/30 rounded-xl p-4 text-sm text-cyan-100 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 backdrop-blur-sm placeholder-gray-400 transition-all duration-200"
        rows={3}
        autoFocus={autoFocus}
        disabled={isSubmitting}
        style={{
          background:
            "linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.9) 100%)",
        }}
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span
            className={`font-medium ${
              text.length > 400
                ? "text-amber-400"
                : text.length > 450
                ? "text-red-400"
                : "text-cyan-400"
            }`}
          >
            {text.length}/500
          </span>
          <span className="text-gray-500">characters</span>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-xs bg-gray-700/80 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600/80 transition-all duration-200 disabled:opacity-50 font-medium border border-gray-500/30"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting || text.length > 500}
            className="text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-cyan-500/25 border border-cyan-400/30"
          >
            {isSubmitting && (
              <div className="w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
            )}
            {submitText}
          </button>
        </div>
      </div>
    </form>
  );
}

// Main comments component
export default function Comments({ teamId, promptId, userRole }) {
  const { user } = useAuth();
  const { comments, loading, profiles } = useComments(teamId, promptId);
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Add comment
  async function handleAddComment(text, parentId = null) {
    if (!teamId || !promptId || !user) return;

    try {
      await addDoc(
        collection(db, "teams", teamId, "prompts", promptId, "comments"),
        {
          text,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          parentId: parentId || null,
        }
      );
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  // Edit comment
  async function handleEditComment(commentId, newText) {
    if (!teamId || !promptId) return;

    try {
      await updateDoc(
        doc(db, "teams", teamId, "prompts", promptId, "comments", commentId),
        {
          text: newText,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error("Error editing comment:", error);
      throw error;
    }
  }

  // Delete comment
  async function handleDeleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteDoc(
        doc(db, "teams", teamId, "prompts", promptId, "comments", commentId)
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  }

  // Reply to comment
  async function handleReply(parentId, text) {
    await handleAddComment(text, parentId);
  }

  // Check if user can modify comment
  function canModifyComment(comment) {
    if (!user || !comment) return false;
    return (
      comment.createdBy === user.uid ||
      userRole === "owner" ||
      userRole === "admin"
    );
  }

  // Organize comments into threads
  const organizedComments = comments.reduce((acc, comment) => {
    if (!comment.parentId) {
      acc.push({
        ...comment,
        replies: comments.filter((c) => c.parentId === comment.id),
      });
    }
    return acc;
  }, []);

  const topLevelComments = organizedComments;
  const commentCount = comments.length;

  if (loading) {
    return (
      <div
        className="mt-6 p-6 rounded-xl backdrop-blur-sm border border-gray-600/50 shadow-2xl shadow-blue-900/20"
        style={{
          background:
            "linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.9) 100%)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-cyan-100 text-sm font-medium">
            Loading neural comments...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-6 rounded-xl backdrop-blur-sm border border-gray-600/50 shadow-2xl shadow-blue-900/20 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(31, 41, 55, 0.9) 100%)",
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-600/50 bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <span className="text-xs text-white font-bold">💬</span>
            </div>
            <h3 className="font-bold text-cyan-100 flex items-center gap-2">
              Neural Comments
              <span className="px-2 py-1 text-xs bg-cyan-400/20 text-cyan-300 rounded-full border border-cyan-400/30 font-normal">
                {commentCount}
              </span>
            </h3>
          </div>

          {!showCommentForm && (
            <button
              onClick={() => setShowCommentForm(true)}
              className="text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 font-semibold shadow-lg shadow-cyan-500/25 border border-cyan-400/30 flex items-center gap-2"
            >
              <span className="w-3 h-3 border border-white rounded-sm flex items-center justify-center">
                <span className="text-xs">+</span>
              </span>
              Add Comment
            </button>
          )}
        </div>
      </div>

      {/* Comment Form */}
      {showCommentForm && (
        <div className="p-6 border-b border-gray-600/50 bg-gray-900/40">
          <CommentForm
            onSubmit={(text) => {
              handleAddComment(text);
              setShowCommentForm(false);
            }}
            onCancel={() => setShowCommentForm(false)}
            placeholder="Share your neural insights about this prompt..."
            autoFocus={true}
          />
        </div>
      )}

      {/* Comments List */}
      <div className="p-6">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 flex items-center justify-center border border-cyan-400/30">
              <span className="text-2xl text-cyan-400">🤖</span>
            </div>
            <p className="text-gray-400 text-lg font-medium mb-2">
              No neural comments detected
            </p>
            <p className="text-gray-500 text-sm">
              Be the first to initialize the conversation matrix!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {topLevelComments.map((comment) => (
              <div key={comment.id} className="group">
                <Comment
                  comment={comment}
                  profile={profiles[comment.createdBy]}
                  onDelete={handleDeleteComment}
                  onEdit={handleEditComment}
                  onReply={handleReply}
                  canModify={canModifyComment(comment)}
                />

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 space-y-4 relative">
                    {/* Connection Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/50 to-transparent"></div>

                    {comment.replies.map((reply) => (
                      <Comment
                        key={reply.id}
                        comment={reply}
                        profile={profiles[reply.createdBy]}
                        onDelete={handleDeleteComment}
                        onEdit={handleEditComment}
                        canModify={canModifyComment(reply)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
