import React, { useState } from 'react';
import { X, Upload, Link as LinkIcon, User, Calendar, Tag, AlertCircle } from 'lucide-react';
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

export function TaskEnhancedForm({
  userId,
  sectionId,
  task,
  onClose,
  onTaskCreated,
  onTaskUpdated,
}: TaskEnhancedFormProps) {
  const isEditing = !!task;
  
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    category: task?.category || 'assignment' as TaskCategory,
    dueDate: task?.dueDate || '',
    priority: task?.priority || 'medium' as TaskPriority,
    tags: task?.tags?.join(', ') || '',
    assignedTo: task?.assignedTo || '',
    googleDriveLinks: task?.googleDriveLinks?.join('\n') || '',
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(task?.attachments || []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file =>
        uploadTaskAttachment(file, task?.id)
      );
      const urls = await Promise.all(uploadPromises);
      setUploadedFiles([...uploadedFiles, ...urls]);
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const googleDriveLinks = formData.googleDriveLinks
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (isEditing) {
        const updates: UpdateTaskInput = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          dueDate: formData.dueDate,
          priority: formData.priority,
          tags,
          assignedTo: formData.assignedTo || undefined,
          attachments: uploadedFiles,
          googleDriveLinks,
        };
        const updatedTask = await updateTaskEnhanced(task.id, updates);
        onTaskUpdated?.(updatedTask);
      } else {
        const taskInput: CreateTaskInput = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          dueDate: formData.dueDate,
          priority: formData.priority,
          tags,
          assignedTo: formData.assignedTo || undefined,
          sectionId,
          attachments: uploadedFiles,
          googleDriveLinks,
        };
        const newTask = await createTaskEnhanced(userId, taskInput, sectionId);
        onTaskCreated?.(newTask);
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to save task:', error);
      const errorMessage = error?.message || 'Failed to save task. Please check the console for details.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task description"
            />
          </div>

          {/* Row 1: Category, Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
                <option value="presentation">Presentation</option>
                <option value="project">Project</option>
                <option value="lab-report">Lab Report</option>
                <option value="lab-final">Lab Final</option>
                <option value="lab-performance">Lab Performance</option>
                <option value="task">Task</option>
                <option value="documents">Documents</option>
                <option value="blc">BLC</option>
                <option value="groups">Groups</option>
                <option value="midterm">Midterm</option>
                <option value="final-exam">Final Exam</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 2: Priority, Assigned To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign To (User ID)
              </label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter user ID (optional)"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., important, urgent, math"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Attachments
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <span className="truncate">{file.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Google Drive Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Google Drive Links (one per line)
            </label>
            <textarea
              value={formData.googleDriveLinks}
              onChange={(e) => setFormData({ ...formData, googleDriveLinks: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://drive.google.com/..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              disabled={saving || uploading}
            >
              {saving ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
