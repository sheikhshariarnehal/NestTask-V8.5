import { X, Calendar, Tag, Clock, Crown, Download, CheckCircle2, Clipboard, Copy, Link, ExternalLink, Eye, FileText, FileSpreadsheet, Presentation, FileImage, Folder, AlertCircle, Loader2, Paperclip } from 'lucide-react';
import { parseLinks } from '../../utils/linkParser';
import { getGoogleDriveResourceType, extractGoogleDriveId, getGoogleDrivePreviewUrl, getGoogleDriveFilenames } from '../../utils/googleDriveUtils';
import { supabase } from '../../lib/supabase';
import type { Task } from '../../types';
import type { TaskStatus } from '../../types/task';
import { useState, useEffect } from 'react';

interface TaskDetailsPopupProps {
  task: Task;
  onClose: () => void;
  onStatusUpdate?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  isUpdating?: boolean;
}



export function TaskDetailsPopup({ 
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
  
  // Filter out section ID text
  const filteredDescription = task.description.replace(/\*This task is assigned to section ID: [0-9a-f-]+\*/g, '').trim();
  
  // Check for either "Attached Files:" or "**Attachments:**" format in description
  let regularDescription = filteredDescription;
  let fileSection: string[] = [];
  
  // Check for standard "Attached Files:" format
  if (filteredDescription.includes('\nAttached Files:')) {
    const parts = filteredDescription.split('\nAttached Files:');
    regularDescription = parts[0];
    fileSection = parts[1]?.split('\n').filter(line => line.trim() && line.includes('](')) || [];
  } 
  // Check for "**Attachments:**" format
  else if (filteredDescription.includes('**Attachments:**')) {
    const parts = filteredDescription.split('**Attachments:**');
    regularDescription = parts[0];
    fileSection = parts[1]?.split('\n').filter(line => line.trim() && line.includes('](')) || [];
  }
  
  // Process database attachments
  const dbAttachments = task.attachments && task.attachments.length > 0 
    ? task.attachments.map((url, index) => {
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
      })
    : [];
  
  console.log('📎 Attachments Debug:', {
    'task.attachments exists': !!task.attachments,
    'task.attachments array': task.attachments,
    'dbAttachments count': dbAttachments.length,
    'dbAttachments data': dbAttachments,
    'fileSection count': fileSection.length,
    'fileSection data': fileSection,
    'Will render section': (fileSection.length > 0 || dbAttachments.length > 0)
  });
  
  // Process description to preserve formatting while handling links
  const processDescription = (text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(paragraph => {
      const lines = paragraph.split('\n').filter(line => line !== undefined);
      const parsedLines = lines.map(line => parseLinks(line));
      return { lines: parsedLines };
    });
  };

  const formattedDescription = processDescription(regularDescription);
  const overdue = new Date(task.dueDate) < new Date();

  const handleDownload = async (url: string, filename: string) => {
    try {
      console.log('Downloading file:', { url, filename });
      
      // Check if it's a Supabase storage URL
      if (url.includes('supabase.co/storage/v1/object/public/task-attachments/')) {
        // Extract the file path from the URL
        const urlParts = url.split('/task-attachments/');
        const filePath = urlParts[1];
        
        if (filePath) {
          // Download the file from Supabase storage
          const { data, error } = await supabase.storage
            .from('task-attachments')
            .download(filePath);
          
          if (error) {
            console.error('Error downloading from storage:', error);
            throw error;
          }
          
          if (data) {
            // Create a blob URL and trigger download
            const downloadUrl = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(downloadUrl);
            }, 100);
            return;
          }
        }
      }
      
      // For other URLs (like Google Drive), open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to opening in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const extractFileInfo = (line: string) => {
    console.log('Processing attachment line:', line);
    
    // Improved regex to extract name and URL from markdown link formats
    const matches = line.match(/\[(.*?)\]\((.*?)\)/);
    if (matches) {
      const filename = matches[1];
      const url = matches[2];
      console.log('Extracted file info:', { filename, url });
      return { filename, url };
    }
    return null;
  };

  // Google Drive utility functions
  const getGoogleDriveIcon = (url: string) => {
    const resourceType = getGoogleDriveResourceType(url).toLowerCase();
    if (resourceType.includes('document')) return FileText;
    if (resourceType.includes('spreadsheet')) return FileSpreadsheet;
    if (resourceType.includes('presentation')) return Presentation;
    if (resourceType.includes('folder')) return Folder;
    if (resourceType.includes('image')) return FileImage;
    return Link;
  };

  const handleGoogleDriveDownload = async (url: string) => {
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
      // For Google Drive files, we'll attempt to use the export/download URL
      const resourceType = getGoogleDriveResourceType(url);
      let downloadUrl = '';

      if (resourceType.includes('Document')) {
        downloadUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
      } else if (resourceType.includes('Spreadsheet')) {
        downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      } else if (resourceType.includes('Presentation')) {
        downloadUrl = `https://docs.google.com/presentation/d/${fileId}/export?format=pptx`;
      } else {
        // For regular files, try the direct download
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      // Open download URL in new tab (user will need to be signed in to Google)
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');

      // Clear loading state after a short delay
      setTimeout(() => {
        setDownloadingLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
      }, 2000);

    } catch (error) {
      console.error('Error downloading Google Drive file:', error);
      setDownloadErrors(prev => new Map(prev.set(url, 'Download failed. Please try opening the link directly.')));
      setDownloadingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  const handleSimplePreview = (url: string) => {
    // Get the preview URL for better viewing experience
    const previewUrl = getGoogleDrivePreviewUrl(url);

    // Open in new tab - use preview URL if available, otherwise use original URL
    const urlToOpen = previewUrl || url;

    console.log('Opening simple preview:', {
      originalUrl: url,
      previewUrl: previewUrl,
      opening: urlToOpen
    });

    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };



  const copyTaskToClipboard = () => {
    // Format the task information
    const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const formattedTask = `
📋 TASK: ${task.name}
📅 Due Date: ${formattedDate}${overdue ? ' (Overdue)' : ''}
🏷️ Category: ${task.category.replace('-', ' ')}
${task.isAdminTask ? '👑 Admin Task\n' : ''}
📝 Description:
${regularDescription}

🌐 View: https://nesttask.vercel.app/
`;

    // Copy to clipboard
    navigator.clipboard.writeText(formattedTask)
      .then(() => {
        setCopied(true);
      })
      .catch(err => {
        console.error('Failed to copy task: ', err);
      });
  };

  return (
    <>
      {/* Backdrop overlay - enhanced for full viewport coverage */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity overflow-hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup container - optimized responsive design */}
      <div 
        className="fixed inset-x-3 top-[6%] sm:inset-x-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl lg:max-w-4xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl z-[10000] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/50 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 id="task-details-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
              {task.name}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content with improved mobile scrolling */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {/* Metadata - compact inline layout */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-xs text-blue-900 dark:text-blue-300 font-medium capitalize">
                {task.category.replace('-', ' ')}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${overdue ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
              <span className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
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
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all touch-manipulation
                ${copied 
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={copied ? "Copied" : "Copy"}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Description - improved text size for mobile */}
          {regularDescription && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Description
                </h3>
              </div>
              <div className="prose dark:prose-invert max-w-none prose-sm">
                <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                  {formattedDescription.map((paragraph, pIndex) => (
                    <div key={pIndex} className="mb-2.5 last:mb-0">
                      {paragraph.lines.map((line, lIndex) => (
                        <div key={lIndex} className="min-h-[1.5em]">
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

          {/* Attached Files - Clean Professional Design */}
          {(fileSection.length > 0 || dbAttachments.length > 0) && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <Paperclip className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Attached Files
                </h3>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {dbAttachments.length + fileSection.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {/* Render database attachments first */}
                {dbAttachments.map((attachment, index) => (
                  <div 
                    key={`db-${index}`} 
                    className="group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {attachment.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(attachment.url, attachment.name)}
                      className="p-2.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all touch-manipulation flex-shrink-0 group-hover:scale-110"
                      aria-label={`Download ${attachment.name}`}
                    >
                      <Download className="w-4 h-4" />
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
                      className="group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-white to-purple-50/30 dark:from-gray-800 dark:to-purple-900/10 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg group-hover:scale-110 transition-transform">
                          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {fileInfo.filename}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownload(fileInfo.url, fileInfo.filename)}
                        className="p-2.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all touch-manipulation flex-shrink-0 group-hover:scale-110"
                        aria-label={`Download ${fileInfo.filename}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google Drive Links - Modern Clean Design */}
          {task.googleDriveLinks && task.googleDriveLinks.length > 0 && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                    Google Drive Files
                  </h3>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {task.googleDriveLinks.length}
                </span>
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
                      className="group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="p-2.5 sm:p-3">
                        <div className="flex items-center gap-2.5">
                          {/* File Icon */}
                          <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
                            <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate mb-1" title={filename}>
                              {filename}
                            </h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                              {resourceType}
                            </span>

                            {/* Error Message */}
                            {downloadError && (
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1.5 rounded-lg">
                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                <span>{downloadError}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700">
                          {/* Preview Button */}
                          <button
                            onClick={() => handleSimplePreview(link)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation shadow-sm border border-blue-100 dark:border-blue-900/50"
                            aria-label={`Preview ${resourceType}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="leading-none">Preview</span>
                          </button>

                          {/* Download Button */}
                          <button
                            onClick={() => handleGoogleDriveDownload(link)}
                            disabled={isDownloading}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shadow-sm border border-green-100 dark:border-green-900/50"
                            aria-label={`Download ${resourceType}`}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="leading-none">Downloading</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span className="leading-none">Download</span>
                              </>
                            )}
                          </button>

                          {/* Open Button */}
                          <button
                            onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 touch-manipulation shadow-sm border border-gray-200 dark:border-gray-600"
                            aria-label={`Open ${resourceType} in new tab`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="leading-none">Open</span>
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


    </>
  );
}

// Default export for lazy loading
export default { TaskDetailsPopup };
