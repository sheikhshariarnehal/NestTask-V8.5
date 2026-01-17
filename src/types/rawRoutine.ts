/**
 * Raw University Routine JSON Types
 * These types represent the structure of the raw JSON provided by the university
 */

export interface RawCourse {
  /** Course code with section, e.g., "CSE227(65_C)" */
  course: string | null;
  /** Teacher name, e.g., "Dr. John Smith" */
  teacher?: string | null;
  /** Course title/name, e.g., "Data Structures and Algorithms" */
  title?: string | null;
}

export interface RawEntry {
  /** Room number, e.g., "301" or "Lab-1" */
  room: string;
  /** Array of courses indexed by time_index */
  courses: (RawCourse | null)[];
}

export interface RawDay {
  /** Day name in uppercase, e.g., "SATURDAY" */
  day: string;
  /** Time slot ranges, e.g., ["08:30-10:00", "10:00-11:30"] */
  timeslots: string[];
  /** Room entries with their courses */
  entries: RawEntry[];
}

export interface RawRoutineData {
  /** Routine name, e.g., "Spring 2026" */
  name?: string;
  /** Semester info, e.g., "Semester 1" */
  semester?: string;
  /** Array of day schedules */
  routine: RawDay[];
}
