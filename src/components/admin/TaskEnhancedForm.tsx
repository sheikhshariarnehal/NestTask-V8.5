import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { X, Upload, Link as LinkIcon, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import type { EnhancedTask, CreateTaskInput, UpdateTaskInput, TaskPriority } from '../../types/taskEnhanced';
import type { TaskCategory } from '../../types/task';
import { createTaskEnhanced, updateTaskEnhanced, uploadTaskAttachment } from '../../services/taskEnhanced.service';

interface TaskEnhancedFormProps {
  userId: string;
  sectionId?: string;
  task?: EnhancedTask;
  onClose: () => void;
  onTaskCreated?: (task: EnhancedTask) => void;
  onTaskUpdated?: (task: EnhancedTask) => void;
}

const TaskEnhancedFormComponent = ({
  userId,
  sectionId,
  task,
  onClose,
  onTaskCreated,
  onTaskUpdated,
}: TaskEnhancedFormProps) => {
  const isEditing = !!task;
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController>();
  
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    category: task?.category || 'assignment' as TaskCategory,
    dueDate: task?.dueDate || '',
    priority: task?.priority || 'medium' as TaskPriority,
    googleDriveLinks: task?.googleDriveLinks?.join('\n') || '',
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(task?.attachments || []);

  // Track component mount state and reset saving state on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setSaving(false); // Reset saving state on unmount
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploadPromises = Array.from(files).map(file =>
        uploadTaskAttachment(file, task?.id)
      );
      const urls = await Promise.all(uploadPromises);
      if (isMountedRef.current) {
        setUploadedFiles([...uploadedFiles, ...urls]);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || 'Failed to upload files. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (saving) return;
    
    setSaving(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const googleDriveLinks = formData.googleDriveLinks
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      if (isEditing) {
        const updates: UpdateTaskInput = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          dueDate: formData.dueDate,
          priority: formData.priority,
          attachments: uploadedFiles,
          googleDriveLinks,
        };
        const updatedTask = await updateTaskEnhanced(task.id, updates);
        if (isMountedRef.current) {
          onTaskUpdated?.(updatedTask);
        }
      } else {
        const taskInput: CreateTaskInput = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          dueDate: formData.dueDate,
          priority: formData.priority,
          sectionId,
          attachments: uploadedFiles,
          googleDriveLinks,
        };
        const newTask = await createTaskEnhanced(
          userId, 
          taskInput, 
          sectionId,
          abortControllerRef.current.signal
        );
        
        if (isMountedRef.current) {
          setSaving(false);
        }
        
        if (isMountedRef.current && onTaskCreated) {
          onTaskCreated(newTask);
        }
      }
      
      if (isMountedRef.current) {
        onClose();
      }
    } catch (err: any) {
      if (err?.message === 'Operation cancelled') {
        return;
      }
      
      if (isMountedRef.current) {
        const errorMessage = err?.message || 'Failed to save task. Please try again.';
        setError(errorMessage);
        setSaving(false);
      }
    }
  }, [saving, formData, isEditing, task, uploadedFiles, userId, sectionId, onTaskCreated, onTaskUpdated, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Close form"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Dismiss and try again
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] admin-scrollbar">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none shadow-sm"
              placeholder="Enter a clear and concise task name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none shadow-sm resize-none"
              placeholder="Provide detailed information about the task"
            />
          </div>

          {/* Row 1: Category, Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none shadow-sm"
              >
                <option value="assignment">📝 Assignment</option>
                <option value="quiz">❓ Quiz</option>
                <option value="presentation">🎯 Presentation</option>
                <option value="project">🛠️ Project</option>
                <option value="lab-report">🔬 Lab Report</option>
                <option value="lab-final">🏆 Lab Final</option>
                <option value="lab-performance">📈 Lab Performance</option>
                <option value="task">✔️ Task</option>
                <option value="documents">📄 Documents</option>
                <option value="blc">📚 BLC</option>
                <option value="groups">👥 Groups</option>
                <option value="midterm">📊 Midterm</option>
                <option value="final-exam">🎓 Final Exam</option>
                <option value="others">🔹 Others</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Priority *
            </label>
            <select
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none shadow-sm"
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🔵 Medium Priority</option>
              <option value="high">🟠 High Priority</option>
              <option value="urgent">🔴 Urgent Priority</option>
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Upload className="w-4 h-4 inline mr-2" />
              Attachments
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 disabled:opacity-50 transition-colors"
              />
            </div>
            {uploading && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Uploading files...
              </p>
            )}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Uploaded Files ({uploadedFiles.length})
                </p>
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                      <span className="text-blue-600 dark:text-blue-400">📄</span>
                      <span className="truncate flex-1">{file.split('/').pop()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Google Drive Links */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Google Drive Links (one per line)
            </label>
            <textarea
              value={formData.googleDriveLinks}
              onChange={(e) => setFormData({ ...formData, googleDriveLinks: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 transition-colors outline-none shadow-sm resize-none"
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setSaving(false);
                onClose();
              }}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-200 disabled:opacity-50 active:scale-95"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              disabled={saving || uploading}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Saving...
                </span>
              ) : (
                isEditing ? '✔️ Update Task' : '✨ Create Task'
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export const TaskEnhancedForm = memo(TaskEnhancedFormComponent);
