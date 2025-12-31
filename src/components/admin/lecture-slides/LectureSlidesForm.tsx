import { useState, useEffect } from 'react';
import {
  Upload,
  Plus,
  X,
  Link,
  Video,
  FileText,
  AlertCircle,
  Trash2
} from 'lucide-react';
import type { NewLectureSlide } from '../../../types/lectureSlide';
import { isValidVideoUrl, isValidSlideUrl, isValidFileType } from '../../../types/lectureSlide';

interface LectureSlidesFormProps {
  onSubmit: (lectureSlide: NewLectureSlide, files: File[]) => Promise<void>;
  sectionId: string;
  initialData?: Partial<NewLectureSlide>;
  isEditing?: boolean;
}

export function LectureSlidesForm({ 
  onSubmit, 
  sectionId, 
  initialData,
  isEditing = false 
}: LectureSlidesFormProps) {
  const [lectureSlide, setLectureSlide] = useState<NewLectureSlide>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    sectionId: sectionId,
    fileUrls: initialData?.fileUrls || [],
    originalFileNames: initialData?.originalFileNames || [],
    slideLinks: initialData?.slideLinks || [],
    videoLinks: initialData?.videoLinks || []
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [newSlideLink, setNewSlideLink] = useState('');
  const [newVideoLink, setNewVideoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form state when initialData changes (for editing)
  useEffect(() => {
    if (initialData && isEditing) {
      setLectureSlide({
        title: initialData.title || '',
        description: initialData.description || '',
        sectionId: sectionId,
        fileUrls: initialData.fileUrls || [],
        originalFileNames: initialData.originalFileNames || [],
        slideLinks: initialData.slideLinks || [],
        videoLinks: initialData.videoLinks || []
      });
      // Clear any previous errors when switching to edit mode
      setErrors({});
      // Clear file input when editing (existing files are shown in fileUrls)
      setFiles([]);
      setNewSlideLink('');
      setNewVideoLink('');
    } else if (!isEditing) {
      // Reset form when switching back to create mode
      setLectureSlide({
        title: '',
        description: '',
        sectionId: sectionId,
        fileUrls: [],
        originalFileNames: [],
        slideLinks: [],
        videoLinks: []
      });
      setFiles([]);
      setNewSlideLink('');
      setNewVideoLink('');
      setErrors({});
    }
  }, [initialData, isEditing, sectionId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!lectureSlide.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Validate video links
    lectureSlide.videoLinks.forEach((link, index) => {
      if (!isValidVideoUrl(link)) {
        newErrors[`videoLink_${index}`] = 'Invalid video URL';
      }
    });

    // Validate slide links
    lectureSlide.slideLinks.forEach((link, index) => {
      if (!isValidSlideUrl(link)) {
        newErrors[`slideLink_${index}`] = 'Invalid URL';
      }
    });

    // Validate files
    files.forEach((file, index) => {
      if (!isValidFileType(file.name)) {
        newErrors[`file_${index}`] = 'Invalid file type';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(lectureSlide, files);
      
      // Reset form if not editing
      if (!isEditing) {
        setLectureSlide({
          title: '',
          description: '',
          sectionId: sectionId,
          fileUrls: [],
          originalFileNames: [],
          slideLinks: [],
          videoLinks: []
        });
        setFiles([]);
        setNewSlideLink('');
        setNewVideoLink('');
      }
    } catch (error) {
      console.error('Error submitting lecture slide:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => isValidFileType(file.name));
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index: number) => {
    setLectureSlide(prev => ({
      ...prev,
      fileUrls: prev.fileUrls.filter((_, i) => i !== index),
      originalFileNames: prev.originalFileNames.filter((_, i) => i !== index)
    }));
  };

  const addSlideLink = () => {
    if (newSlideLink.trim() && isValidSlideUrl(newSlideLink.trim())) {
      setLectureSlide(prev => ({
        ...prev,
        slideLinks: [...prev.slideLinks, newSlideLink.trim()]
      }));
      setNewSlideLink('');
    }
  };

  const removeSlideLink = (index: number) => {
    setLectureSlide(prev => ({
      ...prev,
      slideLinks: prev.slideLinks.filter((_, i) => i !== index)
    }));
  };

  const addVideoLink = () => {
    if (newVideoLink.trim() && isValidVideoUrl(newVideoLink.trim())) {
      setLectureSlide(prev => ({
        ...prev,
        videoLinks: [...prev.videoLinks, newVideoLink.trim()]
      }));
      setNewVideoLink('');
    }
  };

  const removeVideoLink = (index: number) => {
    setLectureSlide(prev => ({
      ...prev,
      videoLinks: prev.videoLinks.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Lecture Slide' : 'Create New Lecture Slide'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={lectureSlide.title}
            onChange={(e) => setLectureSlide(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter lecture slide title"
            required
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={lectureSlide.description}
            onChange={(e) => setLectureSlide(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            placeholder="Enter description (optional)"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Files
          </label>
          
          <div className="space-y-3">
            {/* Existing Files (shown during editing) */}
            {isEditing && lectureSlide.fileUrls.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Existing Files:</h4>
                {lectureSlide.fileUrls.map((fileUrl, index) => (
                  <div key={`existing-${index}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {lectureSlide.originalFileNames[index] || `File ${index + 1}`}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400">(existing)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(index)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      title="Remove existing file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-fit">
              <Upload className="w-5 h-5" />
              <span>{isEditing ? 'Upload Additional Files' : 'Upload Files'}</span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.rtf,.md,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.svg"
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">New Files to Upload:</h4>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-500">({Math.round(file.size / 1024)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Slide Links */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Slide Links
          </label>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={newSlideLink}
                onChange={(e) => setNewSlideLink(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter slide URL"
              />
              <button
                type="button"
                onClick={addSlideLink}
                disabled={!newSlideLink.trim() || !isValidSlideUrl(newSlideLink.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            
            {lectureSlide.slideLinks.length > 0 && (
              <div className="space-y-2">
                {lectureSlide.slideLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-gray-500" />
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {link}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlideLink(index)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Video Links */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Video Links (YouTube & Google Drive)
          </label>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={newVideoLink}
                onChange={(e) => setNewVideoLink(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter YouTube or Google Drive video URL"
              />
              <button
                type="button"
                onClick={addVideoLink}
                disabled={!newVideoLink.trim() || !isValidVideoUrl(newVideoLink.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            
            {lectureSlide.videoLinks.length > 0 && (
              <div className="space-y-2">
                {lectureSlide.videoLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-gray-500" />
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                      >
                        {link}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideoLink(index)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {isEditing ? 'Update Lecture Slide' : 'Create Lecture Slide'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
