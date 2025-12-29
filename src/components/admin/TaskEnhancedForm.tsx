import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { X, Upload, Link as LinkIcon, AlertCircle, RefreshCw, FileText, Trash2, CheckCircle } from 'lucide-react';
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

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  progress?: number;
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    task?.attachments?.map(url => ({
      url,
      name: url.split('/').pop()?.split('_').slice(0, -2).join('_') || 'file',
      size: 0,
    })) || []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Validate total number of files
    const totalFiles = uploadedFiles.length + files.length;
    if (totalFiles > 10) {
      setError(`Maximum 10 files allowed. You're trying to upload ${totalFiles} files.`);
      return;
    }

    setUploading(true);
    setError(null);
    const progressMap: Record<string, number> = {};

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileId = `${file.name}-${Date.now()}`;
        progressMap[fileId] = 0;
        setUploadProgress({ ...progressMap });

        try {
          const result = await uploadTaskAttachment(
            file,
            task?.id,
            (progress) => {
              if (isMountedRef.current) {
                progressMap[fileId] = progress;
                setUploadProgress({ ...progressMap });
              }
            }
          );
          return result;
        } catch (err: any) {
          throw new Error(`${file.name}: ${err.message}`);
        }
      });

      const results = await Promise.all(uploadPromises);
      
      if (isMountedRef.current) {
        setUploadedFiles(prev => [...prev, ...results]);
        setUploadProgress({});
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || 'Failed to upload files. Please try again.');
        setUploadProgress({});
      }
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
      }
    }
  };

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
          attachments: uploadedFiles.map(f => f.url),
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
          attachments: uploadedFiles.map(f => f.url),
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
              Attachments <span className="text-xs text-gray-500">(Max 10 files, 50MB each)</span>
            </label>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading || uploadedFiles.length >= 10}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.svg,.zip,.rar,.7z,.mp4,.mp3,.wav"
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              />
            </div>
            
            {/* Upload Progress */}
            {uploading && Object.keys(uploadProgress).length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                        {fileId.split('-')[0]}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    Uploaded Files ({uploadedFiles.length}/10)
                  </p>
                </div>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-3 bg-white dark:bg-gray-700 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                    >
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        {file.size > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
