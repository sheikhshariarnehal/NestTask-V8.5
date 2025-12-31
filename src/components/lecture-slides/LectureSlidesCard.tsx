import {
  FileText,
  Download,
  Link,
  Video,
  Calendar,
  User,
  Eye,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import type { LectureSlide } from '../../types/lectureSlide';
import { getFileIcon } from '../../types/lectureSlide';
import { getFileDownloadUrl } from '../../services/lectureSlide.service';

interface LectureSlidesCardProps {
  lectureSlide: LectureSlide;
  onClick: () => void;
}

export function LectureSlidesCard({ lectureSlide, onClick }: LectureSlidesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoized calculations
  const formattedDate = useMemo(() => {
    return new Date(lectureSlide.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [lectureSlide.createdAt]);

  const totalItems = useMemo(() => {
    return lectureSlide.fileUrls.length +
           lectureSlide.slideLinks.length +
           lectureSlide.videoLinks.length;
  }, [lectureSlide.fileUrls.length, lectureSlide.slideLinks.length, lectureSlide.videoLinks.length]);

  const hasContent = useMemo(() => totalItems > 0, [totalItems]);

  // Memoized style classes
  const cardClasses = useMemo(() => {
    const baseClasses = "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-300 cursor-pointer group";
    const expandedClasses = isExpanded ? "shadow-lg border-blue-300 dark:border-blue-600" : "";
    return `${baseClasses} ${expandedClasses}`;
  }, [isExpanded]);

  const iconContainerClasses = useMemo(() => {
    const baseClasses = "p-2 rounded-lg transition-colors duration-300";
    const colorClasses = isExpanded
      ? "bg-blue-600 dark:bg-blue-500"
      : "bg-blue-100 dark:bg-blue-900/20";
    return `${baseClasses} ${colorClasses}`;
  }, [isExpanded]);

  const iconClasses = useMemo(() => {
    const baseClasses = "w-5 h-5 transition-colors duration-300";
    const colorClasses = isExpanded
      ? "text-white"
      : "text-blue-600 dark:text-blue-400";
    return `${baseClasses} ${colorClasses}`;
  }, [isExpanded]);

  const titleClasses = useMemo(() => {
    const baseClasses = "font-semibold transition-colors duration-300 line-clamp-2";
    const colorClasses = isExpanded
      ? "text-blue-600 dark:text-blue-400"
      : "text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400";
    return `${baseClasses} ${colorClasses}`;
  }, [isExpanded]);

  const itemsBadgeClasses = useMemo(() => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full transition-colors duration-300";
    const colorClasses = isExpanded
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    return `${baseClasses} ${colorClasses}`;
  }, [isExpanded]);

  // Optimized event handlers
  const handleQuickDownload = useCallback((e: React.MouseEvent, fileUrl: string, fileName: string) => {
    e.stopPropagation();
    const downloadUrl = getFileDownloadUrl(fileUrl, fileName);
    window.open(downloadUrl, '_blank');
  }, []);

  const handleQuickLink = useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleCardClick = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // Content summary data
  const contentSummary = useMemo(() => [
    {
      count: lectureSlide.fileUrls.length,
      label: 'file',
      icon: FileText,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      count: lectureSlide.slideLinks.length,
      label: 'link',
      icon: Link,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-300',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      count: lectureSlide.videoLinks.length,
      label: 'video',
      icon: Video,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400'
    }
  ].filter(item => item.count > 0), [lectureSlide.fileUrls.length, lectureSlide.slideLinks.length, lectureSlide.videoLinks.length]);

  // Reusable components
  const FileItem = useCallback(({ fileUrl, fileName, index }: { fileUrl: string; fileName: string; index: number }) => (
    <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
      <span className="text-lg flex-shrink-0">
        {getFileIcon(fileName)}
      </span>
      <div className="flex-1 min-w-0 mr-3">
        <p
          className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate"
          title={fileName}
        >
          {fileName}
        </p>
      </div>
      <button
        onClick={(e) => handleQuickDownload(e, fileUrl, fileName)}
        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors flex-shrink-0"
        title={`Download ${fileName}`}
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  ), [handleQuickDownload]);

  const LinkItem = useCallback(({ link, index }: { link: string; index: number }) => (
    <button
      key={index}
      onClick={(e) => handleQuickLink(e, link)}
      className="w-full flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-left transition-colors group"
    >
      <Link className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
      <span className="text-sm text-green-600 dark:text-green-400 truncate font-medium group-hover:underline">
        {link}
      </span>
    </button>
  ), [handleQuickLink]);

  const VideoItem = useCallback(({ link, index }: { link: string; index: number }) => (
    <button
      key={index}
      onClick={(e) => handleQuickLink(e, link)}
      className="w-full flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-left transition-colors group"
    >
      <Video className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      <span className="text-sm text-red-600 dark:text-red-400 truncate font-medium group-hover:underline">
        {link}
      </span>
    </button>
  ), [handleQuickLink]);

  return (
    <div
      onClick={handleCardClick}
      className={cardClasses}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={iconContainerClasses}>
              <FileText className={iconClasses} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={titleClasses}>
                {lectureSlide.title}
              </h3>
              {lectureSlide.section && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {lectureSlide.section.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleToggleExpand}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400 transition-all duration-300 transform" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Summary when collapsed */}
        {!isExpanded && (
          <div className="mb-4">
            {lectureSlide.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                {lectureSlide.description}
              </p>
            )}

            {/* Content Summary */}
            {hasContent && (
              <div className="flex flex-wrap gap-2">
                {contentSummary.map(({ count, label, icon: Icon, bgColor, textColor, iconColor }) => (
                  <div key={label} className={`flex items-center gap-1 px-2 py-1 ${bgColor} rounded-md`}>
                    <Icon className={`w-3 h-3 ${iconColor}`} />
                    <span className={`text-xs ${textColor} font-medium`}>
                      {count} {label}{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Content */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          {/* Description */}
          {lectureSlide.description && (
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {lectureSlide.description}
              </p>
            </div>
          )}

          {/* Content Sections */}
          <div className="space-y-4 mb-4">
            {/* Files Section */}
            {lectureSlide.fileUrls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Files ({lectureSlide.fileUrls.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {lectureSlide.fileUrls.map((fileUrl, index) => (
                    <FileItem
                      key={index}
                      fileUrl={fileUrl}
                      fileName={lectureSlide.originalFileNames[index] || `File ${index + 1}`}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Links Section */}
            {lectureSlide.slideLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Links ({lectureSlide.slideLinks.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {lectureSlide.slideLinks.map((link, index) => (
                    <LinkItem key={index} link={link} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Videos Section */}
            {lectureSlide.videoLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Videos ({lectureSlide.videoLinks.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {lectureSlide.videoLinks.map((link, index) => (
                    <VideoItem key={index} link={link} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 transition-all duration-300 ${
          isExpanded ? 'mt-4' : 'mt-0'
        }`}>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </div>
            {lectureSlide.creator && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {lectureSlide.creator.name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasContent && (
              <span className={itemsBadgeClasses}>
                {totalItems} items
              </span>
            )}
            <button
              onClick={handleViewDetails}
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
