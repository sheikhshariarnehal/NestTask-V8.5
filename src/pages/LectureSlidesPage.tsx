import { useState, useEffect } from 'react';
import { Search, Filter, FileText, User, AlertTriangle } from 'lucide-react';
import { LectureSlidesGrid } from '../components/lecture-slides/LectureSlidesGrid';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchLectureSlides } from '../services/lectureSlide.service';
import { useAuth } from '../hooks/useAuth';
import type { LectureSlide, LectureSlideFilters } from '../types/lectureSlide';

export function LectureSlidesPage() {
  const { user } = useAuth();
  const [lectureSlides, setLectureSlides] = useState<LectureSlide[]>([]);
  const [filteredSlides, setFilteredSlides] = useState<LectureSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    loadLectureSlides();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [lectureSlides, searchTerm, dateFilter]);

  const loadLectureSlides = async () => {
    if (!user?.sectionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filters: LectureSlideFilters = {
        sectionId: user.sectionId
      };

      const slides = await fetchLectureSlides(filters);
      setLectureSlides(slides);
      setTableExists(true);
    } catch (error: any) {
      console.error('Error loading lecture slides:', error);
      // Check if table doesn't exist
      if (error.message?.includes('table does not exist') || error.message?.includes('relation "lecture_slides" does not exist')) {
        setTableExists(false);
      } else {
        // Only show error for actual errors, not missing table
        console.error('Failed to load lecture slides:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...lectureSlides];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(slide =>
        slide.title.toLowerCase().includes(search) ||
        slide.description.toLowerCase().includes(search) ||
        slide.creator?.name.toLowerCase().includes(search)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(slide => 
        new Date(slide.createdAt) >= filterDate
      );
    }

    setFilteredSlides(filtered);
  };

  const getStatsData = () => {
    const totalSlides = lectureSlides.length;
    const totalFiles = lectureSlides.reduce((sum, slide) => sum + slide.fileUrls.length, 0);
    const totalLinks = lectureSlides.reduce((sum, slide) => sum + slide.slideLinks.length, 0);
    const totalVideos = lectureSlides.reduce((sum, slide) => sum + slide.videoLinks.length, 0);

    return { totalSlides, totalFiles, totalLinks, totalVideos };
  };

  const stats = getStatsData();

  if (loading) {
    return <LoadingScreen minimumLoadTime={500} showProgress={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lecture Slides
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Access all lecture slides and materials for your section
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{stats.totalSlides}</div>
              <div className="text-gray-500 dark:text-gray-400">Slides</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{stats.totalFiles}</div>
              <div className="text-gray-500 dark:text-gray-400">Files</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{stats.totalLinks}</div>
              <div className="text-gray-500 dark:text-gray-400">Links</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">{stats.totalVideos}</div>
              <div className="text-gray-500 dark:text-gray-400">Videos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search lecture slides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as 'all' | 'week' | 'month')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {filteredSlides.length} of {lectureSlides.length} lecture slides
          </span>
          {(searchTerm || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFilter('all');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Section Info */}
      {user?.sectionName && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <User className="w-4 h-4" />
            <span className="font-medium">
              Viewing slides for: {user.sectionName}
              {user.batchName && ` (${user.batchName})`}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {!tableExists ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-amber-900 dark:text-amber-100 mb-2">
            Feature Setup Required
          </h3>
          <p className="text-amber-700 dark:text-amber-300 mb-4">
            The lecture slides feature needs to be set up by your administrator.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Please contact your system administrator to run the database migration.
          </p>
        </div>
      ) : !user?.sectionId ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Section Assigned
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You need to be assigned to a section to view lecture slides.
          </p>
        </div>
      ) : (
        <LectureSlidesGrid
          lectureSlides={filteredSlides}
          loading={loading}
        />
      )}
    </div>
  );
}