import { X, Download, Link, Video, FileText, Calendar, User, ExternalLink } from 'lucide-react';
import type { LectureSlide } from '../../types/lectureSlide';
import { getFileIcon, getVideoEmbedUrl, getVideoPlatform } from '../../types/lectureSlide';
import { getFileDownloadUrl } from '../../services/lectureSlide.service';

interface LectureSlidesModalProps {
  lectureSlide: LectureSlide;
  onClose: () => void;
}

export function LectureSlidesModal({ lectureSlide, onClose }: LectureSlidesModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const downloadUrl = getFileDownloadUrl(fileUrl, fileName);
    window.open(downloadUrl, '_blank');
  };

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
                {lectureSlide.title}
              </h2>
              {lectureSlide.section && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lectureSlide.section.name}
                  {lectureSlide.section.batch && (
                    <span> • {lectureSlide.section.batch.name}</span>
                  )}
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Description
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {lectureSlide.description}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(lectureSlide.createdAt)}</span>
              </div>
              {lectureSlide.creator && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{lectureSlide.creator.name}</span>
                </div>
              )}
              {lectureSlide.updatedAt !== lectureSlide.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {formatDate(lectureSlide.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Files */}
            {lectureSlide.fileUrls.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Files ({lectureSlide.fileUrls.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lectureSlide.fileUrls.map((fileUrl, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-2xl">
                          {getFileIcon(lectureSlide.originalFileNames[index] || '')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {lectureSlide.originalFileNames[index] || `File ${index + 1}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExternalLink(fileUrl)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View file"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(fileUrl, lectureSlide.originalFileNames[index] || `file_${index + 1}`)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide Links */}
            {lectureSlide.slideLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Slide Links ({lectureSlide.slideLinks.length})
                </h3>
                <div className="space-y-3">
                  {lectureSlide.slideLinks.map((link, index) => (
                    <button
                      key={index}
                      onClick={() => handleExternalLink(link)}
                      className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all text-left"
                    >
                      <Link className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-blue-600 dark:text-blue-400 hover:underline truncate">
                        {link}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Video Links */}
            {lectureSlide.videoLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Videos ({lectureSlide.videoLinks.length})
                </h3>
                <div className="space-y-6">
                  {lectureSlide.videoLinks.map((link, index) => {
                    const embedUrl = getVideoEmbedUrl(link);
                    const platform = getVideoPlatform(link);
                    
                    return (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                      >
                        {embedUrl ? (
                          <div className="space-y-4">
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={`Video ${index + 1}`}
                              />
                            </div>
                            <div className="p-4">
                              <button
                                onClick={() => handleExternalLink(link)}
                                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Video className="w-4 h-4" />
                                <span className="capitalize">{platform}</span> - Open in new tab
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            <button
                              onClick={() => handleExternalLink(link)}
                              className="flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:underline w-full text-left"
                            >
                              <Video className="w-5 h-5 flex-shrink-0" />
                              <span className="truncate flex-1">{link}</span>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </button>
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
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No content available
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  This lecture slide doesn't have any files, links, or videos attached.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
