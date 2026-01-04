import { Suspense, lazy, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAnnouncements } from '../../hooks/useAnnouncements';

const AnnouncementManager = lazy(() => import('../../components/admin/announcement/AnnouncementManager').then(module => ({ default: module.AnnouncementManager })));

interface AdminContext {
  isSectionAdmin: boolean;
  sectionId?: string;
}

export function AnnouncementsPage() {
  const { isSectionAdmin, sectionId } = useOutletContext<AdminContext>();
  const { announcements, createAnnouncement, deleteAnnouncement } = useAnnouncements();

  // Filter announcements for section admin
  const filteredAnnouncements = useMemo(() => {
    if (!isSectionAdmin || !sectionId) return announcements;
    return announcements.filter(announcement => {
      return !announcement.sectionId || announcement.sectionId === sectionId;
    });
  }, [announcements, isSectionAdmin, sectionId]);

  return (
    <Suspense fallback={
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    }>
      <AnnouncementManager 
        announcements={filteredAnnouncements}
        onCreateAnnouncement={createAnnouncement}
        onDeleteAnnouncement={deleteAnnouncement}
      />
    </Suspense>
  );
}
