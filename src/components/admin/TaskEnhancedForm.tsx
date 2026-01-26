import React, { useState, useCallback, useRef, useEffect, memo, useTransition, useDeferredValue, useMemo } from 'react';
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
  const [isPending, startTransition] = useTransition();
  
  // Lazy state initialization to avoid computation on every render
  const [formData, setFormData] = useState(() => ({
    name: task?.name || '',
    description: task?.description || '',
    category: task?.category || 'assignment' as TaskCategory,
    dueDate: task?.dueDate || '',
    priority: task?.priority || 'medium' as TaskPriority,
    googleDriveLinks: task?.googleDriveLinks?.join('\n') || '',
  }));

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => 
    task?.attachments?.map(url => ({
      url,
      name: url.split('/').pop()?.split('_').slice(0, -2).join('_') || 'file',
      size: 0,
    })) || []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingStartTimeRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Deferred values for non-critical updates
  const deferredFormData = useDeferredValue(formData);
  const deferredUploadProgress = useDeferredValue(uploadProgress);

  // Memoize computed values
  const canUploadMore = useMemo(() => uploadedFiles.length < 10, [uploadedFiles.length]);
  const hasFiles = useMemo(() => uploadedFiles.length > 0, [uploadedFiles.length]);
  const isFormValid = useMemo(() => 
    formData.name.trim().length > 0 && 
    formData.description.trim().length > 0 && 
    formData.dueDate.length > 0,
    [formData.name, formData.description, formData.dueDate]
  );
  
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
        
        // Batch progress updates to reduce re-renders
        let lastUpdateTime = Date.now();
        const minUpdateInterval = 50; // Update UI max every 50ms
        
        try {
          const result = await uploadTaskAttachment(
            file,
            task?.id,
            (progress) => {
              if (isMountedRef.current) {
                progressMap[fileId] = progress;
                const now = Date.now();
                // Throttle progress updates
                if (progress === 100 || now - lastUpdateTime >= minUpdateInterval) {
                  startTransition(() => {
                    setUploadProgress({ ...progressMap });
                  });
                  lastUpdateTime = now;
                }
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

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);
  
  // Debounced input handler for better performance
  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    // Clear existing timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // For short fields, update immediately
    if (field === 'category' || field === 'priority' || field === 'dueDate') {
      setFormData(prev => ({ ...prev, [field]: value }));
      return;
    }
    
    // For text fields, debounce the update
    debounceTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setFormData(prev => ({ ...prev, [field]: value }));
      });
    }, 150);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Memoized file list component for better performance
  const FileList = useMemo(() => {
    if (uploadedFiles.length === 0) return null;
    
    return (
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {uploadedFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="group flex items-center gap-2 bg-white dark:bg-gray-700/50 px-2 py-2 rounded-md border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
          >
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
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
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    );
  }, [uploadedFiles, saving, formatFileSize, handleRemoveFile]);
  
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
          status: 'in-progress',
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Task' : 'Create New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Close form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-3 sm:mx-4 mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Dismiss and try again
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="overflow-y-auto flex-1 admin-scrollbar">
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3">
          {/* Task Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              defaultValue={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none shadow-sm placeholder:text-gray-400"
              placeholder="Enter a clear and concise task name"
            />
          </div>

          {/* Row 1: Category, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none shadow-sm appearance-none"
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none shadow-sm appearance-none"
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              defaultValue={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none shadow-sm resize-none placeholder:text-gray-400"
              placeholder="Provide detailed information about the task..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
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
                disabled={uploading || !canUploadMore}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.svg,.zip,.rar,.7z,.mp4,.mp3,.wav"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className="w-full px-4 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50 text-center group-hover:border-blue-500 dark:group-hover:border-blue-400 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-all duration-200">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
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
            {uploading && Object.keys(deferredUploadProgress).length > 0 && (
              <div className="mt-2 space-y-2">
                {Object.entries(deferredUploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                        {fileId.split('-')[0]}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold ml-2">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Uploaded Files List - Memoized for performance */}
            {FileList}
          </div>

          {/* Google Drive Links */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Google Drive Links
              </span>
            </label>
            <textarea
              defaultValue={formData.googleDriveLinks}
              onChange={(e) => handleInputChange('googleDriveLinks', e.target.value)}
              onBlur={(e) => setFormData(prev => ({ ...prev, googleDriveLinks: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none shadow-sm resize-none placeholder:text-gray-400 font-mono"
              placeholder="https://drive.google.com/file/d/..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter one link per line. Supported: Drive files, folders, Docs, Sheets, Slides.
            </p>
          </div>
        </form>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setSaving(false);
                onClose();
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-gray-700 font-medium transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow text-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={(e) => handleSubmit(e as any)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-1.5 text-sm"
              disabled={saving || uploading || isPending || !isFormValid}
            >
              {saving || isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {isPending ? 'Processing...' : 'Saving...'}
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
