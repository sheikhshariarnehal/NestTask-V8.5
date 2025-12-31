import { useState } from 'react';
import { FileText } from 'lucide-react';
import { LectureSlidesCard } from './LectureSlidesCard';
import { LectureSlidesModal } from './LectureSlidesModal';
import type { LectureSlide } from '../../types/lectureSlide';

interface LectureSlidesGridProps {
  lectureSlides: LectureSlide[];
  loading?: boolean;
}

export function LectureSlidesGrid({ lectureSlides, loading = false }: LectureSlidesGridProps) {
  const [selectedSlide, setSelectedSlide] = useState<LectureSlide | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lectureSlides.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No lecture slides found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          There are no lecture slides available at the moment.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lectureSlides.map((slide) => (
          <LectureSlidesCard
            key={slide.id}
            lectureSlide={slide}
            onClick={() => setSelectedSlide(slide)}
          />
        ))}
      </div>

      {/* Modal */}
      {selectedSlide && (
        <LectureSlidesModal
          lectureSlide={selectedSlide}
          onClose={() => setSelectedSlide(null)}
        />
      )}
    </>
  );
}
