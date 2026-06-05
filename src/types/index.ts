// ─── Auth ───
export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

// ─── Course ───
export interface CourseDTO {
  id: string;
  name: string;
  semester: string;
  userId: string;
  studentCount: number;
  sessionCount: number;
  averageAttendanceRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  semester: string;
}

// ─── Student ───
export interface StudentDTO {
  id: string;
  studentId: string;
  name: string;
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  studentId: string;
  name: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; studentId: string; reason: string }[];
}

// ─── Attendance ───
export type SessionStatus = "active" | "ended";

export interface AttendanceSessionDTO {
  id: string;
  courseId: string;
  token: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  status: SessionStatus;
  checkInCount: number;
  totalStudents: number;
  createdAt: string;
}

export interface CreateSessionInput {
  duration: number; // 分钟
}

export interface AttendanceRecordDTO {
  id: string;
  sessionId: string;
  studentId: string;
  timestamp: string;
  student?: StudentDTO;
}

export interface CheckInInput {
  token: string;
  studentId: string;
  name: string;
}

export interface SessionDetail {
  session: AttendanceSessionDTO;
  course: { name: string; semester: string };
  present: StudentDTO[];
  absent: StudentDTO[];
  totalStudents: number;
}

export interface StudentStats {
  studentId: string;
  studentNum: string;
  name: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

// ─── Dashboard ───
export interface DashboardData {
  courseCount: number;
  studentCount: number;
  semesterSessionCount: number;
  averageAttendanceRate: number;
  recentCourses: CourseDTO[];
}

// ─── API ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
