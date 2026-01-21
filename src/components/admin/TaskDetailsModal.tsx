import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  MessageSquare,
  History,
  Users,
  Link as LinkIcon,
  Download,
} from 'lucide-react';
import type { EnhancedTask, TaskHistory } from '../../types/taskEnhanced';
import { TaskStatus } from '../../types/task';
import { updateTaskEnhanced, deleteTaskEnhanced, getTaskHistory } from '../../services/taskEnhanced.service';
import { TaskCommentThread } from './TaskCommentThread';
import { TaskEnhancedForm } from './TaskEnhancedForm';

interface TaskDetailsModalProps {
  task: EnhancedTask;
  userId: string;
  onClose: () => void;
  onTaskUpdated: (task: EnhancedTask) => void;
  onTaskDeleted: (taskId: string) => void;
}

type TabType = 'details' | 'comments' | 'history';

export function TaskDetailsModal({
  task,
  userId,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showEditForm, setShowEditForm] = useState(false);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getTaskHistory(task.id);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      setUpdatingStatus(true);
      const updatedTask = await updateTaskEnhanced(task.id, { status });
      onTaskUpdated(updatedTask);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task? This action cannot be undone.')) return;

    try {
      console.log('[TaskDetailsModal] Deleting task:', task.id);
      await deleteTaskEnhanced(task.id);
      console.log('[TaskDetailsModal] Task deleted successfully:', task.id);
      onTaskDeleted(task.id);
      onClose();
    } catch (error: any) {
      console.error('[TaskDetailsModal] Failed to delete task:', error);
      alert(`Failed to delete task: ${error?.message || 'Unknown error'}`);
    }
  };

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusColors = {
    'my-tasks': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'in-progress': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  if (showEditForm) {
    return (
      <TaskEnhancedForm
        userId={userId}
        task={task}
        onClose={() => setShowEditForm(false)}
        onTaskUpdated={(updatedTask) => {
          onTaskUpdated(updatedTask);
          setShowEditForm(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 mr-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {task.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                {task.priority.toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                {task.status === 'my-tasks' ? 'To Do' : task.status.replace('-', ' ')}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              title="Edit task"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              title="Delete task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'comments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Comments
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.status !== 'in-progress' && (
                    <button
                      onClick={() => handleStatusChange('in-progress')}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      Start Working
                    </button>
                  )}
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange('completed')}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Complete
                    </button>
                  )}
                  {task.status === 'completed' && (
                    <button
                      onClick={() => handleStatusChange('my-tasks')}
                      disabled={updatingStatus}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Reopen Task
                    </button>
                  )}
                </div>
              </div>

              {/* Task Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  icon={<Calendar className="w-5 h-5" />}
                  label="Due Date"
                  value={new Date(task.dueDate).toLocaleDateString()}
                />
                <InfoCard
                  icon={<Clock className="w-5 h-5" />}
                  label="Category"
                  value={task.category.replace('-', ' ')}
                />
                {task.assignedToUser && (
                  <InfoCard
                    icon={<User className="w-5 h-5" />}
                    label="Assigned To"
                    value={task.assignedToUser.name}
                  />
                )}
                {task.assignedByUser && (
                  <InfoCard
                    icon={<Users className="w-5 h-5" />}
                    label="Assigned By"
                    value={task.assignedByUser.name}
                  />
                )}
                <InfoCard
                  icon={<Clock className="w-5 h-5" />}
                  label="Created"
                  value={new Date(task.createdAt).toLocaleString()}
                />
                {task.completedAt && (
                  <InfoCard
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    label="Completed"
                    value={new Date(task.completedAt).toLocaleString()}
                  />
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Attachments
                  </h3>
                  <div className="space-y-2">
                    {task.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Download className="w-4 h-4" />
                        {attachment.split('/').pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Drive Links */}
              {task.googleDriveLinks && task.googleDriveLinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Google Drive Links
                  </h3>
                  <div className="space-y-2">
                    {task.googleDriveLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                      >
                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <TaskCommentThread
              taskId={task.id}
              userId={userId}
              userName="Current User"
            />
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <p className="text-center text-gray-500 dark:text-gray-400">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">No history yet</p>
              ) : (
                history.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
      <div className="text-gray-600 dark:text-gray-400">{icon}</div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-base font-medium text-gray-900 dark:text-white capitalize">
          {value}
        </p>
      </div>
    </div>
  );
}

interface HistoryEntryProps {
  entry: TaskHistory;
}

function HistoryEntry({ entry }: HistoryEntryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Created task',
      status_changed: 'Changed status',
      priority_changed: 'Changed priority',
      assigned: 'Assigned task',
      deleted: 'Deleted task',
    };
    return labels[action] || action;
  };

  return (
    <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
        {entry.user?.name?.charAt(0).toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {entry.user?.name || 'Unknown User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(entry.createdAt)}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
          {getActionLabel(entry.action)}
          {entry.fieldName && (
            <>
              {' '}
              <span className="font-medium">{entry.fieldName}</span>
              {entry.oldValue && entry.newValue && (
                <>
                  {' from '}
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {entry.oldValue}
                  </span>
                  {' to '}
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {entry.newValue}
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
