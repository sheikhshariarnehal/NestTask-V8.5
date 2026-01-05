import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
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
  const savingRef = useRef(false);
  
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
  const savingStartTimeRef = useRef<number | null>(null);

  // Track component mount state and reset saving state on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Reset stuck saving state when component mounts (e.g., after app restore)
    setSaving(false);
    setUploading(false);
    
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Keep a ref in sync so timeouts/handlers don't read stale state
  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  // Handle visibility changes to recover from stuck states
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we've been in saving state for too long (more than 20 seconds)
        if (saving && savingStartTimeRef.current) {
          const elapsed = Date.now() - savingStartTimeRef.current;
          if (elapsed > 20000) {
            console.warn('[TaskEnhancedForm] Resetting stuck saving state after visibility change');
            setSaving(false);
            setError('Operation may have timed out. Please try again.');
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saving]);

  // Also handle app-level resume events (Capacitor + focus-based) to recover from stuck states
  useEffect(() => {
    const handleResume = () => {
      if (!savingRef.current || !savingStartTimeRef.current) return;

      const elapsed = Date.now() - savingStartTimeRef.current;
      if (elapsed > 20000) {
        console.warn('[TaskEnhancedForm] Resetting stuck saving state after app resume');
        setSaving(false);
        setError('Operation may have timed out. Please try again.');
        abortControllerRef.current?.abort();
      }
    };

    window.addEventListener('app-resume', handleResume);
    window.addEventListener('supabase-resume', handleResume);
    window.addEventListener('supabase-session-refreshed', handleResume);

    return () => {
      window.removeEventListener('app-resume', handleResume);
      window.removeEventListener('supabase-resume', handleResume);
      window.removeEventListener('supabase-session-refreshed', handleResume);
    };
  }, []);

  // Track when saving starts
  useEffect(() => {
    if (saving) {
      savingStartTimeRef.current = Date.now();
    } else {
      savingStartTimeRef.current = null;
    }
  }, [saving]);

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
    
    if (saving) {
      console.log('[TaskEnhancedForm] Already saving, ignoring submit');
      return;
    }
    
    setSaving(true);
    setError(null);

    // Mark start immediately for timeout/visibility handlers
    savingStartTimeRef.current = Date.now();

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Safety timeout - reset saving state after 30 seconds (uses refs to avoid stale closure)
    const safetyTimeoutMs = 30000;
    const safetyTimeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (!savingRef.current) return;

      const startedAt = savingStartTimeRef.current;
      const elapsed = startedAt ? Date.now() - startedAt : safetyTimeoutMs;
      if (elapsed >= safetyTimeoutMs) {
        console.warn('[TaskEnhancedForm] Safety timeout triggered - resetting saving state');
        abortControllerRef.current?.abort();
        setSaving(false);
        setError('Request timed out. Please try again.');
      }
    }, safetyTimeoutMs);

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
        const updatedTask = await updateTaskEnhanced(task.id, updates, abortControllerRef.current.signal);
        clearTimeout(safetyTimeout);
        if (isMountedRef.current) {
          onTaskUpdated?.(updatedTask);
          onClose();
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
        
        clearTimeout(safetyTimeout);
        
        if (isMountedRef.current) {
          setSaving(false);
          onTaskCreated?.(newTask);
          onClose();
        }
      }
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      
      if (err?.message === 'Operation cancelled') {
        console.log('[TaskEnhancedForm] Operation was cancelled');
        return;
      }
      
      console.error('[TaskEnhancedForm] Error saving task:', err);
      
      if (isMountedRef.current) {
        const errorMessage = err?.message || 'Failed to save task. Please try again.';
        setError(errorMessage);
        setSaving(false);
      }
    }
  }, [saving, formData, isEditing, task, uploadedFiles, userId, sectionId, onTaskCreated, onTaskUpdated, onClose]);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Fill in the details below to {isEditing ? 'update the' : 'create a new'} task.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 shrink-0">
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
        <div className="overflow-y-auto flex-1 admin-scrollbar">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm placeholder:text-gray-400"
              placeholder="Enter a clear and concise task name"
            />
          </div>

          {/* Row 1: Category, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm appearance-none"
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm appearance-none"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🔵 Medium Priority</option>
                  <option value="high">🟠 High Priority</option>
                  <option value="urgent">🔴 Urgent Priority</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm resize-none placeholder:text-gray-400"
              placeholder="Provide detailed information about the task..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Attachments
                </span>
                <span className="text-xs text-gray-500 font-normal">Max 10 files, 50MB each</span>
              </div>
            </label>
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading || uploadedFiles.length >= 10}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.svg,.zip,.rar,.7z,.mp4,.mp3,.wav"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className="w-full px-6 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center group-hover:border-blue-500 dark:group-hover:border-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-all duration-200">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2.5 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Support for documents, images, and archives
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Upload Progress */}
            {uploading && Object.keys(uploadProgress).length > 0 && (
              <div className="mt-4 space-y-3">
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
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
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
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-3 bg-white dark:bg-gray-700/50 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                  >
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
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
            )}
          </div>

          {/* Google Drive Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <span className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Google Drive Links
              </span>
            </label>
            <textarea
              value={formData.googleDriveLinks}
              onChange={(e) => setFormData({ ...formData, googleDriveLinks: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm resize-none placeholder:text-gray-400 font-mono text-sm"
              placeholder="https://drive.google.com/file/d/..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Enter one link per line. Supported: Drive files, folders, Docs, Sheets, Slides.
            </p>
          </div>
        </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setSaving(false);
                onClose();
              }}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-700 font-medium transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={(e) => handleSubmit(e as any)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2"
              disabled={saving || uploading}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Update Task' : 'Create Task'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const TaskEnhancedForm = memo(TaskEnhancedFormComponent);
