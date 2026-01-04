import React, { useEffect, useState } from 'react';
import { Send, Edit2, Trash2, MessageSquare } from 'lucide-react';
import type { TaskComment } from '../../types/taskEnhanced';
import {
  getTaskComments,
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
} from '../../services/taskEnhanced.service';
import { LoadingSpinner } from '../LoadingSpinner';

interface TaskCommentThreadProps {
  taskId: string;
  userId: string;
  userName: string;
}

export function TaskCommentThread({ taskId, userId, userName }: TaskCommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadComments();
  }, [taskId]);

  // Reset submitting state on unmount
  useEffect(() => {
    return () => {
      setSubmitting(false);
    };
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getTaskComments(taskId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const comment = await addTaskComment(taskId, userId, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const updatedComment = await updateTaskComment(commentId, editText.trim());
      setComments(comments.map(c => (c.id === commentId ? updatedComment : c)));
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await deleteTaskComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-900 dark:text-white">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-semibold">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwner={comment.userId === userId}
              isEditing={editingId === comment.id}
              editText={editText}
              onEditTextChange={setEditText}
              onStartEdit={() => {
                setEditingId(comment.id);
                setEditText(comment.comment);
              }}
              onCancelEdit={() => {
                setEditingId(null);
                setEditText('');
              }}
              onSaveEdit={() => handleEditComment(comment.id)}
              onDelete={() => handleDeleteComment(comment.id)}
            />
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="flex gap-2">
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

interface CommentItemProps {
  comment: TaskComment;
  isOwner: boolean;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function CommentItem({
  comment,
  isOwner,
  isEditing,
  editText,
  onEditTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: CommentItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {comment.user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {comment.user?.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(comment.createdAt)}
              {comment.isEdited && ' (edited)'}
            </p>
          </div>
        </div>

        {isOwner && !isEditing && (
          <div className="flex gap-1">
            <button
              onClick={onStartEdit}
              className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Edit comment"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete comment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
          {comment.comment}
        </p>
      )}
    </div>
  );
}
