/**
 * Routine Transformer Utility
 * Converts raw university JSON into the flat slot structure expected by RoutineView
 */

import type { RawRoutineData, RawDay } from '../types/rawRoutine';

export interface TransformedSlot {
  id: string;
  routineId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseId: string;
  courseName: string;
  section: string;
  sectionRaw?: string;
  teacherName: string;
  roomNumber: string;
}

export interface TransformedRoutine {
  id: string;
  name: string;
  semester: string;
  isActive: boolean;
  slots: TransformedSlot[];
}

/**
 * Capitalizes the first letter and lowercases the rest
 * Converts "SATURDAY" → "Saturday"
 */
function capitalizeDay(day: string): string {
  if (!day) return '';
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

/**
 * Parses a time range string into start and end times
 * Splits "08:30-10:00" → { startTime: "08:30", endTime: "10:00" }
 */
function parseTimeRange(timeRange: string): { startTime: string; endTime: string } {
  const [startTime, endTime] = timeRange.split('-').map(t => t.trim());
  return { startTime: startTime || '', endTime: endTime || '' };
}

function normalizeSectionGroup(section: string): string {
  if (!section) return '';
  // Group lab batches: "63_G1"/"63_G2" → "63_G" (keeps "63_G" as-is)
  return section.replace(/(_[A-Za-z])\d+$/, '$1');
}

/**
 * Parses course string into courseId and section
 * Parses "CSE227(65_C)" → { courseId: "CSE227", sectionRaw: "65_C", sectionGroup: "65_C" }
 * Parses "CSE331(63_G1)" → { courseId: "CSE331", sectionRaw: "63_G1", sectionGroup: "63_G" }
 * Parses "CSE227" → { courseId: "CSE227", sectionRaw: "", sectionGroup: "" }
 */
function parseCourseString(courseStr: string): { courseId: string; sectionRaw: string; sectionGroup: string } {
  if (!courseStr) return { courseId: '', sectionRaw: '', sectionGroup: '' };

  // Match pattern: COURSECODE(SECTION) or just COURSECODE
  const match = courseStr.match(/^([A-Za-z0-9]+)(?:\(([^)]+)\))?$/);

  if (match) {
    const courseId = match[1] || '';
    const sectionRaw = match[2] || '';
    const sectionGroup = normalizeSectionGroup(sectionRaw);
    return { courseId, sectionRaw, sectionGroup };
  }

  // Fallback: return the whole string as courseId
  return { courseId: courseStr, sectionRaw: '', sectionGroup: '' };
}

/**
 * Generates a unique ID for a slot
 */
function generateSlotId(dayOfWeek: string, timeIndex: number, room: string, courseId: string): string {
  return `${dayOfWeek.toLowerCase()}-${timeIndex}-${room}-${courseId}`.replace(/\s+/g, '-');
}

/**
 * Transforms a single raw day entry into transformed slots
 */
function transformDay(
  day: RawDay,
  routineId: string
): TransformedSlot[] {
  const slots: TransformedSlot[] = [];
  const dayOfWeek = capitalizeDay(day.day);
  
  // Iterate through each room entry
  for (const entry of day.entries) {
    const roomNumber = entry.room;
    
    // Iterate through each course in the entry (indexed by time_index)
    for (let timeIndex = 0; timeIndex < entry.courses.length; timeIndex++) {
      const courseData = entry.courses[timeIndex];
      
      // Skip null or empty courses
      if (!courseData || !courseData.course) {
        continue;
      }
      
      // Get the time slot for this index
      const timeSlot = day.timeslots[timeIndex];
      if (!timeSlot) {
        continue;
      }
      
      const { startTime, endTime } = parseTimeRange(timeSlot);
      const { courseId, sectionRaw, sectionGroup } = parseCourseString(courseData.course);
      
      const slot: TransformedSlot = {
        id: generateSlotId(dayOfWeek, timeIndex, roomNumber, courseId),
        routineId,
        dayOfWeek,
        startTime,
        endTime,
        courseId,
        courseName: courseData.title || courseId, // Use title if available, otherwise courseId
        section: sectionGroup,
        sectionRaw,
        teacherName: courseData.teacher || '',
        roomNumber
      };
      
      slots.push(slot);
    }
  }
  
  return slots;
}

/**
 * Main transformer function
 * Converts raw university JSON into the flat slot structure expected by RoutineView
 */
export function transformRoutineData(
  rawData: RawRoutineData,
  options?: {
    routineId?: string;
    name?: string;
    semester?: string;
    isActive?: boolean;
  }
): TransformedRoutine {
  const routineId = options?.routineId || 'routine-1';
  
  const slots: TransformedSlot[] = [];
  
  // Transform each day's data
  for (const day of rawData.routine) {
    const daySlots = transformDay(day, routineId);
    slots.push(...daySlots);
  }
  
  // Sort slots by day order and then by start time
  const dayOrder = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  slots.sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
  
  return {
    id: routineId,
    name: options?.name || rawData.name || 'University Routine',
    semester: options?.semester || rawData.semester || 'Current Semester',
    isActive: options?.isActive ?? true,
    slots
  };
}

/**
 * Extracts unique courses from transformed slots
 * Useful for building a course list
 */
export function extractCoursesFromSlots(slots: TransformedSlot[]): Array<{ id: string; title: string; code: string }> {
  const courseMap = new Map<string, { id: string; title: string; code: string }>();
  
  for (const slot of slots) {
    if (slot.courseId && !courseMap.has(slot.courseId)) {
      courseMap.set(slot.courseId, {
        id: slot.courseId,
        title: slot.courseName, // courseName already contains title or courseId
        code: slot.courseId
      });
    }
  }
  
  return Array.from(courseMap.values());
}

/**
 * Extracts unique sections from transformed slots
 */
export function extractSectionsFromSlots(slots: TransformedSlot[]): string[] {
  const sections = new Set<string>();
  
  for (const slot of slots) {
    if (slot.section) {
      sections.add(slot.section);
    }
  }
  
  return Array.from(sections).sort();
}
