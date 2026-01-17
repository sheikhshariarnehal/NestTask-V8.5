/**
 * Lecture Slide Types and Interfaces
 */

export interface LectureSlide {
  id: string;
  title: string;
  description: string;
  sectionId: string;
  fileUrls: string[];
  originalFileNames: string[];
  slideLinks: string[];
  videoLinks: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  // Optional fields for joined data (can be null until migration is applied)
  section?: {
    id: string;
    name: string;
    batch?: {
      id: string;
      name: string;
      department?: {
        id: string;
        name: string;
      };
    };
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export type NewLectureSlide = Omit<LectureSlide, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'section' | 'creator'>;

export interface LectureSlideFile {
  url: string;
  originalName: string;
  size?: number;
  type?: string;
}

export interface LectureSlideLink {
  url: string;
  title?: string;
  description?: string;
}

export interface LectureSlideVideo {
  url: string;
  title?: string;
  platform: 'youtube' | 'google-drive' | 'other';
  embedUrl?: string;
}

// Database row type for Supabase
export interface LectureSlideRow {
  id: string;
  title: string;
  description: string;
  section_id: string;
  file_urls: string[];
  original_file_names: string[];
  slide_links: string[];
  video_links: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
}

// Insert type for Supabase
export interface LectureSlideInsert {
  id?: string;
  title: string;
  description?: string;
  section_id: string;
  file_urls?: string[];
  original_file_names?: string[];
  slide_links?: string[];
  video_links?: string[];
  created_by?: string;
}

// Update type for Supabase
export interface LectureSlideUpdate {
  title?: string;
  description?: string;
  section_id?: string;
  file_urls?: string[];
  original_file_names?: string[];
  slide_links?: string[];
  video_links?: string[];
  updated_at?: string;
}

// Form data interface for creating/editing lecture slides
export interface LectureSlideFormData {
  title: string;
  description: string;
  files: File[];
  slideLinks: string[];
  videoLinks: string[];
}

// Filter and search options
export interface LectureSlideFilters {
  sectionId?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
}

// Utility functions for video URL processing
export const getVideoEmbedUrl = (url: string): string | null => {
  // YouTube URL patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Google Drive URL patterns
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  return null;
};

export const getVideoPlatform = (url: string): 'youtube' | 'google-drive' | 'other' => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('drive.google.com')) {
    return 'google-drive';
  }
  return 'other';
};

export const isValidVideoUrl = (url: string): boolean => {
  try {
    new URL(url);
    return getVideoEmbedUrl(url) !== null;
  } catch {
    return false;
  }
};

export const isValidSlideUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// File type validation
export const ALLOWED_FILE_TYPES = [
  '.pdf',
  '.ppt',
  '.pptx',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.md',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg'
];

export const isValidFileType = (fileName: string): boolean => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return ALLOWED_FILE_TYPES.includes(extension);
};

export const getFileIcon = (fileName: string): string => {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  switch (extension) {
    case '.pdf':
      return '📄';
    case '.ppt':
    case '.pptx':
      return '📊';
    case '.doc':
    case '.docx':
      return '📝';
    case '.xls':
    case '.xlsx':
      return '📈';
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.svg':
      return '🖼️';
    default:
      return '📁';
  }
};
