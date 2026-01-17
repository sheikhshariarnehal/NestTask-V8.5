import { useState, useEffect } from 'react';
import { LectureSlidesForm } from './LectureSlidesForm';
import { LectureSlidesList } from './LectureSlidesList';
import { LectureSlidesPreview } from './LectureSlidesPreview';
import { 
  fetchLectureSlides, 
  createLectureSlide, 
  updateLectureSlide, 
  deleteLectureSlide 
} from '../../../services/lectureSlide.service';
import type { LectureSlide, NewLectureSlide } from '../../../types/lectureSlide';
import { showSuccessToast, showErrorToast } from '../../../utils/notifications';

interface LectureSlidesManagerProps {
  sectionId: string;
}

export function LectureSlidesManager({ sectionId }: LectureSlidesManagerProps) {
  const [lectureSlides, setLectureSlides] = useState<LectureSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlide, setEditingSlide] = useState<LectureSlide | null>(null);
  const [previewSlide, setPreviewSlide] = useState<LectureSlide | null>(null);

  useEffect(() => {
    loadLectureSlides();
  }, [sectionId]);

  const loadLectureSlides = async () => {
    try {
      setLoading(true);
      const slides = await fetchLectureSlides({ sectionId });
      setLectureSlides(slides);
    } catch (error: any) {
      console.error('Error loading lecture slides:', error);
      if (error.message && error.message.includes('table does not exist')) {
        showErrorToast('Lecture slides feature is not set up yet. Please contact your administrator to run the database migration.');
      } else {
        showErrorToast('Failed to load lecture slides');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlide = async (slideData: NewLectureSlide, files: File[]) => {
    try {
      const newSlide = await createLectureSlide(slideData, files);
      setLectureSlides(prev => [newSlide, ...prev]);
      showSuccessToast('Lecture slide created successfully');
    } catch (error: any) {
      console.error('Error creating lecture slide:', error);
      showErrorToast(error.message || 'Failed to create lecture slide');
      throw error;
    }
  };

  const handleUpdateSlide = async (slideData: NewLectureSlide, files: File[]) => {
    if (!editingSlide) return;

    try {
      const updatedSlide = await updateLectureSlide(editingSlide.id, slideData, files);
      setLectureSlides(prev => 
        prev.map(slide => slide.id === editingSlide.id ? updatedSlide : slide)
      );
      setEditingSlide(null);
      showSuccessToast('Lecture slide updated successfully');
    } catch (error: any) {
      console.error('Error updating lecture slide:', error);
      showErrorToast(error.message || 'Failed to update lecture slide');
      throw error;
    }
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      await deleteLectureSlide(id);
      setLectureSlides(prev => prev.filter(slide => slide.id !== id));
      showSuccessToast('Lecture slide deleted successfully');
    } catch (error: any) {
      console.error('Error deleting lecture slide:', error);
      showErrorToast(error.message || 'Failed to delete lecture slide');
      throw error;
    }
  };

  const handleEditSlide = (slide: LectureSlide) => {
    setEditingSlide(slide);
    setPreviewSlide(null);
  };

  const handleViewSlide = (slide: LectureSlide) => {
    setPreviewSlide(slide);
    setEditingSlide(null);
  };

  const handleCancelEdit = () => {
    setEditingSlide(null);
  };

  const handleClosePreview = () => {
    setPreviewSlide(null);
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <LectureSlidesForm
        onSubmit={editingSlide ? handleUpdateSlide : handleCreateSlide}
        sectionId={sectionId}
        initialData={editingSlide || undefined}
        isEditing={!!editingSlide}
      />

      {/* Cancel Edit Button */}
      {editingSlide && (
        <div className="flex justify-end">
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* List Section */}
      <LectureSlidesList
        lectureSlides={lectureSlides}
        onEdit={handleEditSlide}
        onDelete={handleDeleteSlide}
        onView={handleViewSlide}
        loading={loading}
      />

      {/* Preview Modal */}
      {previewSlide && (
        <LectureSlidesPreview
          lectureSlide={previewSlide}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}
