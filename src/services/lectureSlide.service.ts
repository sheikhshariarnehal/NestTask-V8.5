import { supabase } from '../lib/supabase';
import type { 
  LectureSlide, 
  NewLectureSlide, 
  LectureSlideRow,
  LectureSlideInsert,
  LectureSlideUpdate,
  LectureSlideFilters
} from '../types/lectureSlide';

/**
 * Map database row to LectureSlide type
 */
function mapLectureSlideFromDB(row: any): LectureSlide {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    sectionId: row.section_id,
    fileUrls: row.file_urls || [],
    originalFileNames: row.original_file_names || [],
    slideLinks: row.slide_links || [],
    videoLinks: row.video_links || [],
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    section: row.section ? {
      id: row.section.id,
      name: row.section.name,
      batch: row.section.batch ? {
        id: row.section.batch.id,
        name: row.section.batch.name,
        department: row.section.batch.department ? {
          id: row.section.batch.department.id,
          name: row.section.batch.department.name
        } : undefined
      } : undefined
    } : undefined,
    creator: row.creator ? {
      id: row.creator.id,
      name: row.creator.name,
      email: row.creator.email
    } : undefined
  };
}

/**
 * Upload file to lecture-slides storage bucket
 */
async function uploadFile(file: File, sectionId: string): Promise<{ url: string; originalName: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${sectionId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('lecture-slides')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('lecture-slides')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      originalName: file.name
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Check if user has permission to manage lecture slides for a section
 */
async function checkManagePermission(sectionId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: userData } = await supabase
      .from('users')
      .select('role, section_id')
      .eq('id', user.id)
      .single();

    if (!userData) return false;

    // Super admins can manage all lecture slides
    if (userData.role === 'super-admin') return true;

    // Section admins can manage lecture slides for their section
    if (userData.role === 'section_admin' && userData.section_id === sectionId) return true;

    return false;
  } catch (error) {
    console.error('Error checking manage permission:', error);
    return false;
  }
}

/**
 * Fetch lecture slides with optional filters
 */
export async function fetchLectureSlides(filters?: LectureSlideFilters): Promise<LectureSlide[]> {
  try {
    // Use simple query first to avoid foreign key issues
    let query = supabase
      .from('lecture_slides')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.sectionId) {
      query = query.eq('section_id', filters.sectionId);
    }

    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST106' || error.message.includes('relation "lecture_slides" does not exist')) {
        console.warn('Lecture slides table does not exist yet. Please run the migration.');
        return [];
      }
      throw error;
    }

    // Map data without foreign key relationships for now
    let lectureSlides = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      sectionId: row.section_id,
      fileUrls: row.file_urls || [],
      originalFileNames: row.original_file_names || [],
      slideLinks: row.slide_links || [],
      videoLinks: row.video_links || [],
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      // Add placeholder data for missing relationships
      section: null,
      creator: null
    }));

    // Apply search filter on client side for better performance
    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      lectureSlides = lectureSlides.filter(slide =>
        slide.title.toLowerCase().includes(searchTerm) ||
        slide.description.toLowerCase().includes(searchTerm)
      );
    }

    return lectureSlides;
  } catch (error) {
    console.error('Error fetching lecture slides:', error);
    throw error;
  }
}

/**
 * Create a new lecture slide
 */
export async function createLectureSlide(
  lectureSlide: NewLectureSlide,
  files: File[] = []
): Promise<LectureSlide> {
  try {
    // Check permissions
    const hasPermission = await checkManagePermission(lectureSlide.sectionId);
    if (!hasPermission) {
      throw new Error('Permission denied: You cannot create lecture slides for this section');
    }

    // Upload files if any
    let fileUrls: string[] = [];
    let originalFileNames: string[] = [];

    if (files.length > 0) {
      const uploadResults = await Promise.all(
        files.map(file => uploadFile(file, lectureSlide.sectionId))
      );
      
      fileUrls = uploadResults.map(result => result.url);
      originalFileNames = uploadResults.map(result => result.originalName);
    }

    // Create lecture slide record
    const insertData: LectureSlideInsert = {
      title: lectureSlide.title,
      description: lectureSlide.description,
      section_id: lectureSlide.sectionId,
      file_urls: [...lectureSlide.fileUrls, ...fileUrls],
      original_file_names: [...lectureSlide.originalFileNames, ...originalFileNames],
      slide_links: lectureSlide.slideLinks,
      video_links: lectureSlide.videoLinks
    };

    const { data, error } = await supabase
      .from('lecture_slides')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST106' || error.message.includes('relation "lecture_slides" does not exist')) {
        throw new Error('Lecture slides table does not exist. Please run the database migration first.');
      }
      throw error;
    }
    if (!data) throw new Error('No data returned from lecture slide creation');

    // Return simple mapped data without foreign key relationships
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      sectionId: data.section_id,
      fileUrls: data.file_urls || [],
      originalFileNames: data.original_file_names || [],
      slideLinks: data.slide_links || [],
      videoLinks: data.video_links || [],
      createdAt: data.created_at,
      createdBy: data.created_by,
      updatedAt: data.updated_at,
      // Add placeholder data for missing relationships
      section: null,
      creator: null
    };
  } catch (error) {
    console.error('Error creating lecture slide:', error);
    throw error;
  }
}

/**
 * Update an existing lecture slide
 */
export async function updateLectureSlide(
  id: string,
  updates: Partial<NewLectureSlide>,
  newFiles: File[] = []
): Promise<LectureSlide> {
  try {
    // Get current lecture slide to check permissions
    const { data: currentSlide } = await supabase
      .from('lecture_slides')
      .select('section_id')
      .eq('id', id)
      .single();

    if (!currentSlide) {
      throw new Error('Lecture slide not found');
    }

    // Check permissions
    const hasPermission = await checkManagePermission(currentSlide.section_id);
    if (!hasPermission) {
      throw new Error('Permission denied: You cannot update this lecture slide');
    }

    // Upload new files if any
    let newFileUrls: string[] = [];
    let newOriginalFileNames: string[] = [];

    if (newFiles.length > 0) {
      const uploadResults = await Promise.all(
        newFiles.map(file => uploadFile(file, currentSlide.section_id))
      );
      
      newFileUrls = uploadResults.map(result => result.url);
      newOriginalFileNames = uploadResults.map(result => result.originalName);
    }

    // Prepare update data
    const updateData: LectureSlideUpdate = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.slideLinks !== undefined) updateData.slide_links = updates.slideLinks;
    if (updates.videoLinks !== undefined) updateData.video_links = updates.videoLinks;
    
    // Merge existing files with new files
    if (newFiles.length > 0) {
      updateData.file_urls = [...(updates.fileUrls || []), ...newFileUrls];
      updateData.original_file_names = [...(updates.originalFileNames || []), ...newOriginalFileNames];
    } else if (updates.fileUrls !== undefined) {
      updateData.file_urls = updates.fileUrls;
      updateData.original_file_names = updates.originalFileNames || [];
    }

    const { data, error } = await supabase
      .from('lecture_slides')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from lecture slide update');

    return mapLectureSlideFromDB(data);
  } catch (error) {
    console.error('Error updating lecture slide:', error);
    throw error;
  }
}

/**
 * Delete a lecture slide
 */
export async function deleteLectureSlide(id: string): Promise<void> {
  try {
    // Get current lecture slide to check permissions and get file URLs
    const { data: currentSlide } = await supabase
      .from('lecture_slides')
      .select('section_id, file_urls')
      .eq('id', id)
      .single();

    if (!currentSlide) {
      throw new Error('Lecture slide not found');
    }

    // Check permissions
    const hasPermission = await checkManagePermission(currentSlide.section_id);
    if (!hasPermission) {
      throw new Error('Permission denied: You cannot delete this lecture slide');
    }

    // Delete associated files from storage
    if (currentSlide.file_urls && currentSlide.file_urls.length > 0) {
      const filePaths = currentSlide.file_urls.map(url => {
        // Extract file path from URL
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        return `${currentSlide.section_id}/${fileName}`;
      });

      // Delete files from storage (don't throw if this fails)
      try {
        await supabase.storage
          .from('lecture-slides')
          .remove(filePaths);
      } catch (storageError) {
        console.warn('Error deleting files from storage:', storageError);
      }
    }

    // Delete lecture slide record
    const { error } = await supabase
      .from('lecture_slides')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting lecture slide:', error);
    throw error;
  }
}

/**
 * Get a single lecture slide by ID
 */
export async function getLectureSlide(id: string): Promise<LectureSlide | null> {
  try {
    const { data, error } = await supabase
      .from('lecture_slides')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data ? mapLectureSlideFromDB(data) : null;
  } catch (error) {
    console.error('Error getting lecture slide:', error);
    throw error;
  }
}

/**
 * Delete a specific file from a lecture slide
 */
export async function deleteLectureSlideFile(
  lectureSlideId: string,
  fileUrl: string,
  originalFileName: string
): Promise<LectureSlide> {
  try {
    // Get current lecture slide
    const currentSlide = await getLectureSlide(lectureSlideId);
    if (!currentSlide) {
      throw new Error('Lecture slide not found');
    }

    // Check permissions
    const hasPermission = await checkManagePermission(currentSlide.sectionId);
    if (!hasPermission) {
      throw new Error('Permission denied: You cannot modify this lecture slide');
    }

    // Remove file from arrays
    const updatedFileUrls = currentSlide.fileUrls.filter(url => url !== fileUrl);
    const updatedOriginalFileNames = currentSlide.originalFileNames.filter(name => name !== originalFileName);

    // Delete file from storage
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${currentSlide.sectionId}/${fileName}`;

      await supabase.storage
        .from('lecture-slides')
        .remove([filePath]);
    } catch (storageError) {
      console.warn('Error deleting file from storage:', storageError);
    }

    // Update lecture slide record
    return await updateLectureSlide(lectureSlideId, {
      ...currentSlide,
      fileUrls: updatedFileUrls,
      originalFileNames: updatedOriginalFileNames
    });
  } catch (error) {
    console.error('Error deleting lecture slide file:', error);
    throw error;
  }
}

/**
 * Get download URL for a file with original filename
 */
export function getFileDownloadUrl(fileUrl: string, originalFileName: string): string {
  // For direct download with original filename, we can use the download parameter
  const url = new URL(fileUrl);
  url.searchParams.set('download', originalFileName);
  return url.toString();
}

/**
 * Get file preview URL (for viewing in browser)
 */
export function getFilePreviewUrl(fileUrl: string): string {
  // Return the original URL for preview
  return fileUrl;
}

/**
 * Check if file can be previewed in browser
 */
export function canPreviewFile(fileName: string): boolean {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.txt'];
  return previewableExtensions.includes(extension);
}

/**
 * Download file with original filename
 */
export function downloadFile(fileUrl: string, originalFileName: string): void {
  const downloadUrl = getFileDownloadUrl(fileUrl, originalFileName);

  // Create a temporary anchor element to trigger download
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = originalFileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
