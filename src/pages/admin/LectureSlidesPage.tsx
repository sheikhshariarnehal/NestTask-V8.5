import { Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';

const LectureSlidesManager = lazy(() => import('../../components/admin/lecture-slides/LectureSlidesManager').then(module => ({ default: module.LectureSlidesManager })));

interface AdminContext {
  sectionId?: string;
}

export function LectureSlidesPage() {
  const { sectionId } = useOutletContext<AdminContext>();

  // LectureSlidesManager requires a sectionId, so we need a fallback
  const effectiveSectionId = sectionId || 'default';

  return (
    <Suspense fallback={
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <LectureSlidesManager sectionId={effectiveSectionId} />
    </Suspense>
  );
}
