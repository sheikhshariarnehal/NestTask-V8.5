import { X, Download, Link, Video, FileText, Calendar, User } from 'lucide-react';
import type { LectureSlide } from '../../../types/lectureSlide';
import { getFileIcon, getVideoEmbedUrl, getVideoPlatform } from '../../../types/lectureSlide';
import { getFileDownloadUrl } from '../../../services/lectureSlide.service';

interface LectureSlidesPreviewProps {
  lectureSlide: LectureSlide;
  onClose: () => void;
}

export function LectureSlidesPreview({ lectureSlide, onClose }: LectureSlidesPreviewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {lectureSlide.title}
              </h2>
              {lectureSlide.section && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lectureSlide.section.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Description */}
            {lectureSlide.description && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {lectureSlide.description}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {formatDate(lectureSlide.createdAt)}
              </div>
              {lectureSlide.creator && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {lectureSlide.creator.name}
                </div>
              )}
              {lectureSlide.updatedAt !== lectureSlide.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Updated {formatDate(lectureSlide.updatedAt)}
                </div>
              )}
            </div>

            {/* Files */}
            {lectureSlide.fileUrls.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Files ({lectureSlide.fileUrls.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lectureSlide.fileUrls.map((fileUrl, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl">
                          {getFileIcon(lectureSlide.originalFileNames[index] || '')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {lectureSlide.originalFileNames[index] || `File ${index + 1}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View file"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                        <a
                          href={getFileDownloadUrl(fileUrl, lectureSlide.originalFileNames[index] || `file_${index + 1}`)}
                          download={lectureSlide.originalFileNames[index]}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide Links */}
            {lectureSlide.slideLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Slide Links ({lectureSlide.slideLinks.length})
                </h3>
                <div className="space-y-2">
                  {lectureSlide.slideLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Link className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400 hover:underline truncate">
                        {link}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Video Links */}
            {lectureSlide.videoLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Videos ({lectureSlide.videoLinks.length})
                </h3>
                <div className="space-y-4">
                  {lectureSlide.videoLinks.map((link, index) => {
                    const embedUrl = getVideoEmbedUrl(link);
                    const platform = getVideoPlatform(link);
                    
                    return (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                      >
                        {embedUrl ? (
                          <div className="space-y-3">
                            <div className="aspect-video">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={`Video ${index + 1}`}
                              />
                            </div>
                            <div className="p-3">
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                              >
                                <Video className="w-4 h-4" />
                                <span className="capitalize">{platform}</span> - Open in new tab
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Video className="w-5 h-5" />
                              <span className="truncate">{link}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {lectureSlide.fileUrls.length === 0 && 
             lectureSlide.slideLinks.length === 0 && 
             lectureSlide.videoLinks.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No files, links, or videos attached to this lecture slide.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
