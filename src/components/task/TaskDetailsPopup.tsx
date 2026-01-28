import { X, Calendar, Tag, Download, CheckCircle2, Copy, Link, ExternalLink, Eye, FileText, FileSpreadsheet, Presentation, FileImage, Folder, AlertCircle, Loader2, Paperclip } from 'lucide-react';
import { parseLinks } from '../../utils/linkParser';
import { getGoogleDriveResourceType, extractGoogleDriveId, getGoogleDrivePreviewUrl, getGoogleDriveFilenames } from '../../utils/googleDriveUtils';
import { supabase } from '../../lib/supabase';
import type { Task } from '../../types';
import type { TaskStatus } from '../../types/task';
import { useState, useEffect, useMemo, useCallback, memo, lazy } from 'react';
import { createPortal } from 'react-dom';

interface TaskDetailsPopupProps {
  task: Task;
  onClose: () => void;
  onStatusUpdate?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  isUpdating?: boolean;
}

// Extract utility functions outside component to prevent recreation
const filterSectionId = (description: string) => {
  return description.replace(/\*This task is assigned to section ID: [0-9a-f-]+\*/g, '').trim();
};

const extractFileInfo = (line: string) => {
  const matches = line.match(/\[(.*?)\]\((.*?)\)/);
  if (matches) {
    return { filename: matches[1], url: matches[2] };
  }
  return null;
};

const getGoogleDriveIcon = (url: string) => {
  const resourceType = getGoogleDriveResourceType(url).toLowerCase();
  if (resourceType.includes('document')) return FileText;
  if (resourceType.includes('spreadsheet')) return FileSpreadsheet;
  if (resourceType.includes('presentation')) return Presentation;
  if (resourceType.includes('folder')) return Folder;
  if (resourceType.includes('image')) return FileImage;
  return Link;
};

// Memoized component for better performance
export const TaskDetailsPopup = memo(function TaskDetailsPopup({ 
  task, 
  onClose,
  onStatusUpdate,
  isUpdating = false
}: TaskDetailsPopupProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingLinks, setDownloadingLinks] = useState<Set<string>>(new Set());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());

  // Reset copied state after 2 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (copied) {
      timer = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [copied]);
  
  // Memoize description filtering to avoid recalculation
  const filteredDescription = useMemo(() => filterSectionId(task.description), [task.description]);
  
  // Memoize file section parsing
  const { regularDescription, fileSection } = useMemo(() => {
    let desc = filteredDescription;
    let files: string[] = [];
    
    // Check for standard "Attached Files:" format
    if (filteredDescription.includes('\nAttached Files:')) {
      const parts = filteredDescription.split('\nAttached Files:');
      desc = parts[0];
      files = parts[1]?.split('\n').filter(line => line.trim() && line.includes('](')) || [];
    } 
    // Check for "**Attachments:**" format
    else if (filteredDescription.includes('**Attachments:**')) {
      const parts = filteredDescription.split('**Attachments:**');
      desc = parts[0];
      files = parts[1]?.split('\n').filter(line => line.trim() && line.includes('](')) || [];
    }
    
    return { regularDescription: desc, fileSection: files };
  }, [filteredDescription]);
  
  // Memoize database attachments processing
  const dbAttachments = useMemo(() => {
    if (!task.attachments || task.attachments.length === 0) return [];
    
    return task.attachments.map((url, index) => {
      // Extract filename from URL
      const urlParts = url.split('/');
      const encodedFilename = urlParts[urlParts.length - 1];
      
      // Decode URL encoding
      let name = decodeURIComponent(encodedFilename);
      
      // Clean up timestamp and hash pattern (e.g., "1766884177681-0fvpnc.pdf")
      // Match pattern: digits-alphanumeric.extension
      const timestampHashMatch = name.match(/^(\d+)-([a-z0-9]+)\.([^.]+)$/i);
      if (timestampHashMatch) {
        // If it's just timestamp-hash.ext, use a generic name with the extension
        name = `Attachment_${index + 1}.${timestampHashMatch[3]}`;
      } else {
        // Try to clean other timestamp patterns
        const cleanMatch = name.match(/^(.+?)(?:_\d{13}_[a-z0-9]+)?(\.[^.]+)$/i);
        if (cleanMatch) {
          name = cleanMatch[1] + cleanMatch[2];
        }
      }
      
      return { url, name };
    });
  }, [task.attachments]);
  
  // Memoize description processing to avoid recalculation
  const formattedDescription = useMemo(() => {
    const paragraphs = regularDescription.split('\n\n').filter(p => p.trim());
    return paragraphs.map(paragraph => {
      const lines = paragraph.split('\n').filter(line => line !== undefined);
      const parsedLines = lines.map(line => parseLinks(line));
      return { lines: parsedLines };
    });
  }, [regularDescription]);
  
  // Memoize overdue calculation
  const overdue = useMemo(() => new Date(task.dueDate) < new Date(), [task.dueDate]);

  // Memoize download handler to prevent recreation on each render
  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      // Check if it's a Supabase storage URL
      if (url.includes('supabase.co/storage/v1/object/public/task-attachments/')) {
        const urlParts = url.split('/task-attachments/');
        const filePath = urlParts[1];
        
        if (filePath) {
          const { data, error } = await supabase.storage
            .from('task-attachments')
            .download(filePath);
          
          if (error) throw error;
          
          if (data) {
            const downloadUrl = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(downloadUrl);
            }, 100);
            return;
          }
        }
      }
      
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Memoized Google Drive download handler
  const handleGoogleDriveDownload = useCallback(async (url: string) => {
    const fileId = extractGoogleDriveId(url);
    if (!fileId) {
      setDownloadErrors(prev => new Map(prev.set(url, 'Invalid Google Drive URL')));
      return;
    }

    setDownloadingLinks(prev => new Set(prev.add(url)));
    setDownloadErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(url);
      return newMap;
    });

    try {
      const resourceType = getGoogleDriveResourceType(url);
      let downloadUrl = '';

      if (resourceType.includes('Document')) {
        downloadUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
      } else if (resourceType.includes('Spreadsheet')) {
        downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      } else if (resourceType.includes('Presentation')) {
        downloadUrl = `https://docs.google.com/presentation/d/${fileId}/export?format=pptx`;
      } else {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      window.open(downloadUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => {
        setDownloadingLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
      }, 2000);

    } catch (error) {
      setDownloadErrors(prev => new Map(prev.set(url, 'Download failed. Please try opening the link directly.')));
      setDownloadingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  }, []);

  // Memoized preview handler
  const handleSimplePreview = useCallback((url: string) => {
    const previewUrl = getGoogleDrivePreviewUrl(url);
    window.open(previewUrl || url, '_blank', 'noopener,noreferrer');
  }, []);



  // Memoized formatted date for clipboard
  const formattedDate = useMemo(() => {
    return new Date(task.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [task.dueDate]);

  // Memoized copy handler
  const copyTaskToClipboard = useCallback(() => {
    const formattedTask = `📋 TASK: ${task.name}
📅 Due Date: ${formattedDate}${overdue ? ' (Overdue)' : ''}
🏷️ Category: ${task.category.replace('-', ' ')}
${task.isAdminTask ? '👑 Admin Task\n' : ''}
📝 Description:
${regularDescription}

🌐 View: https://nesttask.vercel.app/`;

    navigator.clipboard.writeText(formattedTask)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [task.name, task.category, task.isAdminTask, formattedDate, overdue, regularDescription]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop overlay - enhanced for full viewport coverage */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup container - Mobile-first professional design */}
      <div 
        className="relative w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-slide-up sm:animate-scale-in flex flex-col border-t-4 border-blue-500 dark:border-blue-400"
        aria-labelledby="task-details-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {/* Drag indicator for mobile */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full sm:hidden" />
          
          <div className="flex-1 min-w-0 pr-3 mt-2 sm:mt-0">
            <h2 id="task-details-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
              {task.name}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0">
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="p-2.5 hover:bg-white/80 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shadow-sm"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Content with improved mobile scrolling */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-gray-900 scroll-smooth">
          {/* Metadata - compact inline layout */}
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700/50">
              <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-900 dark:text-blue-300 font-semibold capitalize leading-none">
                {task.category.replace('-', ' ')}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${overdue ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
              <span className={`text-xs font-semibold leading-none ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <button
              onClick={copyTaskToClipboard}
              disabled={isUpdating}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 touch-manipulation shadow-sm border active:scale-95
                ${copied 
                  ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/70'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={copied ? "Copied" : "Copy"}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-semibold leading-none">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-semibold leading-none">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Description - improved text size for mobile */}
          {regularDescription && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex-shrink-0">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                  Description
                </h3>
              </div>
              <div className="prose dark:prose-invert max-w-none prose-sm">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                  {formattedDescription.map((paragraph, pIndex) => (
                    <div key={pIndex} className="mb-2 last:mb-0">
                      {paragraph.lines.map((line, lIndex) => (
                        <div key={lIndex} className="min-h-[1.25em]">
                          {line.map((part, index) => 
                            part.type === 'link' ? (
                              <a
                                key={index}
                                href={part.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline break-all transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {part.content}
                              </a>
                            ) : (
                              <span key={index}>{part.content}</span>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attached Files - Professional Mobile App Design */}
          {(fileSection.length > 0 || dbAttachments.length > 0) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex-shrink-0">
                  <Paperclip className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                  Attached Files
                </h3>
              </div>
              <div className="space-y-2">
                {/* Render database attachments first */}
                {dbAttachments.map((attachment, index) => (
                  <div 
                    key={`db-${index}`} 
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border border-purple-200 dark:border-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200 active:scale-100 touch-manipulation"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg shrink-0 shadow-sm flex-shrink-0">
                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-none">
                        {attachment.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(attachment.url, attachment.name)}
                      className="ml-2 p-2.5 rounded-lg bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600 transition-all active:scale-95 flex items-center justify-center shadow-sm touch-manipulation"
                      aria-label={`Download ${attachment.name}`}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                {/* Render description-based attachments */}
                {fileSection.map((line, index) => {
                  const fileInfo = extractFileInfo(line);
                  if (!fileInfo) return null;

                  return (
                    <div 
                      key={`desc-${index}`} 
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 border border-purple-200 dark:border-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200 active:scale-100 touch-manipulation"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg shrink-0 shadow-sm">
                          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {fileInfo.filename}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownload(fileInfo.url, fileInfo.filename)}
                        className="ml-2 p-2.5 rounded-lg bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600 transition-all active:scale-95 flex items-center justify-center shadow-sm touch-manipulation"
                        aria-label={`Download ${fileInfo.filename}`}
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google Drive Files - Professional Mobile App Design */}
          {task.googleDriveLinks && task.googleDriveLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex-shrink-0">
                  <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                  Google Drive Links
                </h3>
              </div>
              <div className="space-y-2">
                {task.googleDriveLinks?.map((link, index) => {
                  const IconComponent = getGoogleDriveIcon(link);
                  const resourceType = getGoogleDriveResourceType(link);
                  const filenames = getGoogleDriveFilenames(task.googleDriveLinks || []);
                  const filename = filenames[index];
                  const isDownloading = downloadingLinks.has(link);
                  const downloadError = downloadErrors.get(link);

                  return (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2.5">
                          {/* File Icon */}
                          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shadow-sm">
                            <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate mb-1 leading-none" title={filename}>
                              {filename}
                            </h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 dark:bg-blue-500 text-white shadow-sm">
                              {resourceType}
                            </span>
                          </div>

                          {/* Quick Action Button */}
                          <button
                            onClick={() => handleGoogleDriveDownload(link)}
                            disabled={isDownloading}
                            className="p-2.5 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center shadow-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Download ${filename}`}
                          >
                            {isDownloading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {/* Error Message */}
                        {downloadError && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="font-medium leading-none">{downloadError}</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {/* Preview Button */}
                          <button
                            onClick={() => handleSimplePreview(link)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-all active:scale-95 touch-manipulation shadow-sm"
                            aria-label={`Preview ${resourceType}`}
                          >
                            <Eye className="w-4 h-4 flex-shrink-0" />
                            <span className="leading-none">Preview</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

// Default export for lazy loading
export default TaskDetailsPopup;
