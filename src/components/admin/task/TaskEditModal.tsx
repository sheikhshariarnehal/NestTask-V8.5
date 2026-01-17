import { useState, useEffect, useRef } from 'react';
import { X, Save, Calendar, Tag, FileText, Paperclip, Upload, Trash2, ExternalLink } from 'lucide-react';
import type { Task } from '../../../types';
import { supabase } from '../../../lib/supabase';

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  isSectionAdmin?: boolean;
}

interface AttachmentFile {
  name: string;
  url: string;
  path?: string;
}

export function TaskEditModal({ task, onClose, onUpdate }: TaskEditModalProps) {
  // Extract existing attachments from description
  const extractAttachments = (description: string): AttachmentFile[] => {
    if (!description) return [];

    const attachments: AttachmentFile[] = [];

    // Match attachment links like "- [filename.pdf](url)" or "[filename.pdf](url)"
    const attachmentRegex = /(?:^- |\n- )?\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = attachmentRegex.exec(description)) !== null) {
      const [, filename, url] = match;
      // Only include actual file attachments (has file extension or storage URL)
      if (url.includes('supabase.co/storage') || url.includes('task-attachments') || filename.match(/\.[a-zA-Z0-9]+$/)) {
        // Extract path from URL for deletion
        const pathMatch = url.match(/task-files\/([^?]+)/);
        const path = pathMatch ? pathMatch[1] : undefined;

        attachments.push({
          name: filename,
          url: url,
          path: path
        });
      }
    }

    return attachments;
  };

  // Clean description by removing attachment links and metadata
  const cleanDescription = (description: string) => {
    if (!description) return '';

    // Remove attachment links
    let cleaned = description.replace(/(?:^- |\n- )?\[([^\]]+)\]\(([^)]+)\)/g, (match, filename, url) => {
      // Only remove if it's a file attachment
      if (url.includes('supabase.co/storage') || url.includes('task-attachments') || filename.match(/\.[a-zA-Z0-9]+$/)) {
        return '';
      }
      return match; // Keep non-file links
    });

    // Remove attachment sections
    cleaned = cleaned.replace(/\n*\*\*Attachments:\*\*\n*((?:- \[.*?\]\(.*?\)\n*)*)/g, '');

    // Remove links sections
    cleaned = cleaned.replace(/\n*\*\*Links:\*\*\n*((?:- \[.*?\]\(.*?\)\n*)*)/g, '');

    // Remove section ID references
    cleaned = cleaned.replace(/\*This task is assigned to section ID: [a-f0-9-]+\*/g, '');

    // Clean up extra whitespace and newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '').trim();

    return cleaned;
  };

  const [formData, setFormData] = useState({
    name: task.name || '',
    category: task.category || 'task',
    dueDate: task.dueDate || '',
    description: cleanDescription(task.description || ''),
    status: task.status || 'my-tasks'
  });

  const [existingAttachments, setExistingAttachments] = useState<AttachmentFile[]>(
    extractAttachments(task.description || '')
  );
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);



  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Generate UUID fallback
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Upload file to Supabase storage
  const uploadFile = async (file: File): Promise<{ url: string; path: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${generateUUID()}.${fileExt}`;
    const filePath = `task-files/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!data) {
      throw new Error('Upload completed but no data returned');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);

    return { url: publicUrl, path: fileName };
  };

  // Delete file from Supabase storage
  const deleteFile = async (path: string) => {
    if (!path) return;

    const { error } = await supabase.storage
      .from('task-attachments')
      .remove([`task-files/${path}`]);

    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setNewAttachments(prev => [...prev, ...validFiles]);

      // Initialize progress for new files
      const progressReset: Record<string, number> = {};
      validFiles.forEach(file => {
        progressReset[file.name] = 0;
      });
      setUploadProgress(prev => ({ ...prev, ...progressReset }));
    }

    // Reset the input value
    e.target.value = '';
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Validate file sizes
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setNewAttachments(prev => [...prev, ...validFiles]);

      // Initialize progress for new files
      const progressReset: Record<string, number> = {};
      validFiles.forEach(file => {
        progressReset[file.name] = 0;
      });
      setUploadProgress(prev => ({ ...prev, ...progressReset }));
    }
  };

  // Remove new attachment
  const removeNewAttachment = (indexToRemove: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  // Remove existing attachment
  const removeExistingAttachment = async (indexToRemove: number) => {
    const attachment = existingAttachments[indexToRemove];
    if (!attachment) return;

    try {
      // Delete from storage if we have the path
      if (attachment.path) {
        await deleteFile(attachment.path);
      }

      // Remove from state
      setExistingAttachments(prev => prev.filter((_, i) => i !== indexToRemove));
    } catch (error) {
      console.error('Error removing attachment:', error);
      // Still remove from UI even if storage deletion fails
      setExistingAttachments(prev => prev.filter((_, i) => i !== indexToRemove));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim() || !formData.dueDate || !formData.description.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      // Upload new files first
      const uploadedFiles: { name: string; url: string; path: string }[] = [];

      for (const file of newAttachments) {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 25 }));

          const { url, path } = await uploadFile(file);

          uploadedFiles.push({
            name: file.name,
            url: url,
            path: path
          });

          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        } catch (error) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Build updated description with attachments
      let updatedDescription = formData.description.trim();

      // Combine all attachments
      const allAttachments = [
        ...existingAttachments,
        ...uploadedFiles.map(file => ({
          name: file.name,
          url: file.url
        }))
      ];

      if (allAttachments.length > 0) {
        updatedDescription += '\n\n**Attachments:**\n';
        allAttachments.forEach(attachment => {
          updatedDescription += `- [${attachment.name}](${attachment.url})\n`;
        });
      }

      // Preserve section ID if it exists
      if (task.sectionId) {
        updatedDescription += `\n\n*This task is assigned to section ID: ${task.sectionId}*`;
      }

      const updateData = {
        ...formData,
        description: updatedDescription
      };

      await onUpdate(task.id, updateData);
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
      setUploadProgress({});
    }
  };

  // Category options
  const categories = [
    { value: 'assignment', label: 'Assignment' },
    { value: 'blc', label: 'BLC' },
    { value: 'documents', label: 'Documents' },
    { value: 'final-exam', label: 'Final Exam' },
    { value: 'groups', label: 'Groups' },
    { value: 'lab-final', label: 'Lab Final' },
    { value: 'lab-performance', label: 'Lab Performance' },
    { value: 'lab-report', label: 'Lab Report' },
    { value: 'midterm', label: 'Midterm' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'project', label: 'Project' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'task', label: 'Task' },
    { value: 'others', label: 'Others' }
  ];

  // Status options
  const statusOptions = [
    { value: 'my-tasks', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Task</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update task information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter task name"
              required
            />
          </div>

          {/* Category & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    formData.status === status.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Describe the task details..."
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
                {(existingAttachments.length + newAttachments.length) > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                    {existingAttachments.length + newAttachments.length} file{(existingAttachments.length + newAttachments.length) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </label>

            {/* File Upload Area */}
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
              onClick={triggerFileInput}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Click to upload
                </span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                PDF, DOC, TXT, Images up to 10MB
              </p>

              {/* File count indicator */}
              {newAttachments.length > 0 && (
                <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                  {newAttachments.length} file{newAttachments.length !== 1 ? 's' : ''} ready to upload
                </div>
              )}
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Attachments
                </h4>
                {existingAttachments.map((attachment, index) => (
                  <div key={`existing-${attachment.name}-${index}`} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Existing file
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(attachment.url, '_blank')}
                        className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                        title="View file"
                      >
                        <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeExistingAttachment(index);
                        }}
                        className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors"
                        title="Remove file"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Attachments */}
            {newAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  New Attachments
                </h4>
                {newAttachments.map((file, index) => (
                  <div key={`new-${file.name}-${file.size}-${index}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {(file.size / 1024).toFixed(1)} KB • New
                          </p>
                          {uploadProgress[file.name] !== undefined && (
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-all duration-300"
                                  style={{ width: `${uploadProgress[file.name] || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-green-600 dark:text-green-400">
                                {Math.round(uploadProgress[file.name] || 0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeNewAttachment(index);
                      }}
                      className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.dueDate || !formData.description.trim()}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {newAttachments.length > 0 ? 'Uploading & Saving...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}