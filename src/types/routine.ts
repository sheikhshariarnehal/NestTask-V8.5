export interface Course {
  id: string;
  title: string;
  code: string;
  credits?: number;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineSlot {
  id: string;
  routineId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseId?: string;
  courseName?: string;
  teacherId?: string;
  teacherName?: string;
  roomNumber?: string;
  section?: string;
  sectionRaw?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Routine {
  id: string;
  name: string;
  semester: string;
  isActive: boolean;
  slots: RoutineSlot[];
  createdAt?: string;
  updatedAt?: string;
}
