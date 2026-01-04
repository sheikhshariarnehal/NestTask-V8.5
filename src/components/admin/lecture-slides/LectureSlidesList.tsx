import { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Edit, 
  FileText, 
  Download,
  Calendar,
  User,
  Link,
  Video,
  Eye,
  MoreVertical
} from 'lucide-react';
import type { LectureSlide } from '../../../types/lectureSlide';
import { getFileIcon } from '../../../types/lectureSlide';
import { getFileDownloadUrl } from '../../../services/lectureSlide.service';

interface LectureSlidesListProps {
  lectureSlides: LectureSlide[];
  onEdit: (lectureSlide: LectureSlide) => void;
  onDelete: (id: string) => Promise<void>;
  onView: (lectureSlide: LectureSlide) => void;
  loading?: boolean;
}

export function LectureSlidesList({ 
  lectureSlides = [], 
  onEdit, 
  onDelete, 
  onView,
  loading = false 
}: LectureSlidesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedSlide, setExpandedSlide] = useState<string | null>(null);

  const filteredSlides = lectureSlides.filter(slide => 
    slide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slide.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slide.section?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecture slide? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting lecture slide:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpanded = (slideId: string) => {
    setExpandedSlide(expandedSlide === slideId ? null : slideId);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lecture Slides ({filteredSlides.length})
          </h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search lecture slides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredSlides.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {searchTerm ? 'No lecture slides found' : 'No lecture slides yet'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {searchTerm ? 'Try a different search term' : 'Create your first lecture slide above'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSlides.map((slide) => (
              <div
                key={slide.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
              >
                {/* Main Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {slide.title}
                        </h4>
                        {slide.section && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {slide.section.name}
                          </span>
                        )}
                      </div>
                      
                      {slide.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {slide.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(slide.createdAt)}
                        </div>
                        {slide.creator && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {slide.creator.name}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          {slide.fileUrls.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {slide.fileUrls.length} files
                            </span>
                          )}
                          {slide.slideLinks.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Link className="w-3 h-3" />
                              {slide.slideLinks.length} links
                            </span>
                          )}
                          {slide.videoLinks.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              {slide.videoLinks.length} videos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(slide.id)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onView(slide)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(slide)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(slide.id)}
                        disabled={deletingId === slide.id}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === slide.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedSlide === slide.id && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                    <div className="space-y-4">
                      {/* Files */}
                      {slide.fileUrls.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Files</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {slide.fileUrls.map((fileUrl, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-lg">{getFileIcon(slide.originalFileNames[index] || '')}</span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {slide.originalFileNames[index] || `File ${index + 1}`}
                                  </span>
                                </div>
                                <a
                                  href={getFileDownloadUrl(fileUrl, slide.originalFileNames[index] || `file_${index + 1}`)}
                                  download={slide.originalFileNames[index]}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Slide Links */}
                      {slide.slideLinks.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slide Links</h5>
                          <div className="space-y-1">
                            {slide.slideLinks.map((link, index) => (
                              <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm"
                              >
                                <Link className="w-4 h-4" />
                                <span className="truncate">{link}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Video Links */}
                      {slide.videoLinks.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Video Links</h5>
                          <div className="space-y-1">
                            {slide.videoLinks.map((link, index) => (
                              <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm"
                              >
                                <Video className="w-4 h-4" />
                                <span className="truncate">{link}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
