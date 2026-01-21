import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getInitials } from '../../utils/stringUtils';
import { transformRoutineData, extractCoursesFromSlots } from '../../utils/routineTransformer';
import type { RawRoutineData } from '../../types/rawRoutine';
import { useAuth } from '../../hooks/useAuth';
import { RoutineSkeleton } from './RoutineSkeleton';
import universityRoutineData from '../../data/universityRoutine.json';

export function RoutineView() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Transform the raw university JSON data (now imported at module level)
  const routineData = useMemo(() => {
    try {
      const rawData = universityRoutineData as RawRoutineData;
      const transformed = transformRoutineData(rawData);
      const extractedCourses = extractCoursesFromSlots(transformed.slots);
      return {
        currentRoutine: transformed,
        courses: extractedCourses
      };
    } catch (error) {
      console.error('Failed to transform routine data:', error);
      return {
        currentRoutine: {
          id: 'routine-1',
          name: 'No Routine Data',
          semester: 'N/A',
          isActive: true,
          slots: []
        },
        courses: []
      };
    }
  }, []);

  // Extract routine data
  const currentRoutine = routineData.currentRoutine;
  const courses = routineData.courses;

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 6 });
    return Array.from({ length: 6 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        dayNum: format(date, 'd'),
        dayName: format(date, 'EEE'),
        isSelected: format(date, 'EEEE') === format(selectedDate, 'EEEE')
      };
    });
  }, [selectedDate]);

  // Enrich slots with course data
  const enrichedSlots = useMemo(() => {
    if (!currentRoutine?.slots) {
      return [];
    }

    return currentRoutine.slots.map((slot: any) => {
      const course = courses.find((c: any) => c.id === slot.courseId);

      return {
        ...slot,
        course,
        courseName: slot.courseName || course?.title
      };
    });
  }, [currentRoutine, courses]);

  const filteredSlots = useMemo(() => {
    return enrichedSlots.filter((slot: any) => {
      const matchesSearch = searchTerm === '' ||
        slot.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.course?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSection = !selectedSection || slot.section === selectedSection;
      const matchesDay = format(selectedDate, 'EEEE') === slot.dayOfWeek;

      return matchesSearch && matchesSection && matchesDay;
    });
  }, [enrichedSlots, searchTerm, selectedSection, selectedDate]);

  const sections = useMemo(() => {
    const uniqueSections = new Set<string>();
    enrichedSlots.forEach((slot: any) => {
      if (slot.section) {
        uniqueSections.add(slot.section);
      }
    });
    return Array.from(uniqueSections).sort();
  }, [enrichedSlots]);

  // Auto-select user's section based on batch and section name
  useEffect(() => {
    if (hasAutoSelected || !user || sections.length === 0) {
      return;
    }

    // Construct the expected section format: "batchNumber_sectionLetter"
    // e.g., Batch "63" + Section "G" = "63_G"
    const batchNumber = user.batchName?.replace(/\D/g, ''); // Extract digits only (e.g., "Batch 63" -> "63")
    const sectionLetter = user.sectionName?.split(' ').pop()?.toUpperCase(); // Get last word (e.g., "Section G" -> "G")

    if (batchNumber && sectionLetter) {
      const expectedSection = `${batchNumber}_${sectionLetter}`;

      // Check if this section exists in the available sections
      if (sections.includes(expectedSection)) {
        setSelectedSection(expectedSection);
        setHasAutoSelected(true);
      }
    }
  }, [sections, user, hasAutoSelected]);

  // Memoize handlers to prevent recreating functions on each render
  const toggleMobileSearch = useCallback(() => {
    setIsMobileSearchVisible(prev => !prev);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(e.target.value);
  }, []);

  const handleDaySelect = useCallback((day: Date) => {
    setSelectedDate(day);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl mb-3 p-3 shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Mobile View Header */}
        <div className="flex flex-col space-y-3 sm:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Class Routine</h1>
            <button
              onClick={toggleMobileSearch}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentRoutine.name} - {currentRoutine.semester}
          </p>

          {/* Mobile Search Input */}
          {isMobileSearchVisible && (
            <div className="overflow-hidden transition-all duration-200 ease-in-out">
              <input
                type="text"
                placeholder="Search courses, teachers, rooms..."
                value={searchTerm}
                onChange={handleSearchChange}
                autoComplete="off"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {sections.length > 0 && (
            <select
              value={selectedSection}
              onChange={handleSectionChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          )}
        </div>

        {/* Desktop View Header */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Class Routine</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {currentRoutine.name} - {currentRoutine.semester}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {sections.length > 0 && (
              <select
                value={selectedSection}
                onChange={handleSectionChange}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoComplete="off"
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white w-64"
            />
          </div>
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => {
              const prevDay = addDays(selectedDate, -1);
              handleDaySelect(prevDay);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>

          <button
            onClick={() => {
              const nextDay = addDays(selectedDate, 1);
              handleDaySelect(nextDay);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {weekDays.map((day) => (
            <button
              key={day.dayName}
              onClick={() => handleDaySelect(day.date)}
              className={`
                flex flex-col items-center py-3 rounded-2xl transition-all duration-200
                ${day.isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                }
              `}
            >
              <span className={`text-xs font-semibold mb-1 uppercase tracking-wider ${day.isSelected ? 'text-blue-100' : ''}`}>
                {day.dayName}
              </span>
              <span className={`text-xl sm:text-2xl font-bold ${day.isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {day.dayNum}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Class Schedule */}
      <div className="space-y-2">
        {filteredSlots.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Clock className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              No Classes Scheduled
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              There are no classes for this day
              {selectedSection && ` in section ${selectedSection}`}
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
        ) : (
          filteredSlots
            .sort((a: any, b: any) => {
              // Convert time strings (HH:MM:SS or HH:MM) to comparable numbers
              // Bangladesh day shift: treat times 1:00-6:59 as PM (add 12 hours)
              const getTimeValue = (timeStr: string) => {
                let [hours, minutes] = timeStr.split(':').map(Number);
                // If hour is between 1 and 6, it's PM (13:00-18:00)
                if (hours >= 1 && hours <= 6) {
                  hours += 12;
                }
                return hours * 60 + minutes;
              };
              return getTimeValue(a.startTime) - getTimeValue(b.startTime);
            })
            .map((slot: any) => (
              <div
                key={slot.id}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 flex mb-3 group"
              >
                {/* Time Column */}
                <div className="w-16 sm:w-20 bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-between py-3 border-r border-blue-100 dark:border-blue-800/50 flex-shrink-0">
                  <div className="text-center w-full">
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                      {(() => {
                        let [hours, minutes] = slot.startTime.split(':').map(Number);
                        if (hours >= 1 && hours <= 6) hours += 12;
                        const display12Hour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                        return `${display12Hour}:${String(minutes).padStart(2, '0')}`;
                      })()}
                    </div>
                  </div>

                  <div className="flex-1 w-0.5 my-2 bg-blue-100 dark:bg-blue-900/50 rounded-full relative group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full"></div>
                  </div>

                  <div className="text-center w-full">
                    <div className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 leading-none">
                      {(() => {
                        let [hours, minutes] = slot.endTime.split(':').map(Number);
                        if (hours >= 1 && hours <= 6) hours += 12;
                        const display12Hour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                        return `${display12Hour}:${String(minutes).padStart(2, '0')}`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 px-3 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-0 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 mt-3 leading-tight line-clamp-2">
                    {slot.courseName || (slot.course ? slot.course.title : 'No Course Name')}
                  </h3>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Course</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate ml-2">
                        {slot.course?.code || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Section</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate ml-2">
                        {(() => {
                          const room = (slot.roomNumber || '').toString();
                          const isLabRoom = /lab/i.test(room);
                          const raw = slot.sectionRaw;
                          if (isLabRoom && raw) return raw;
                          return slot.section || 'N/A';
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Teacher</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate ml-2">
                        {slot.teacherName || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Room</span>
                      <span className="font-bold text-gray-900 dark:text-white text-right ml-2 break-words max-w-[60%]">
                        {slot.roomNumber || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}