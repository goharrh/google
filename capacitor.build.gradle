export interface School {
  id: number;
  name: string;
  emis_code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export type Role = 'admin' | 'teacher';

export interface Employee {
  id: number;
  name: string | null;
  username: string | null;
  password: string | null;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login: string | null;
  reset_token: string | null;
  token_expiry: string | null;
  synced_at: string | null;
  cnic: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  designation: string | null;
  bps: string | null;
  tenure: string | null;
  personnel: string | null;
  emis: string | null;
  dob: string | null;
  date_of_entry: string | null;
  profile_picture_url?: string | null;
}

export interface Class {
  id: number;
  class_name: string | null;
  section_id: number | null;
  academic_year: string | null;
  room_no: string | null;
  subject: string | null;
  teacher_id: number | null;
  emis: string | null;
}

export interface Section {
  id: number;
  section_name: string | null;
  capacity?: number | null;
  emis: string | null;
}

export interface TeacherClassAssignment {
  id: number;
  teacher_id: number | null;
  class_id: number | null;
  section_id: number | null;
  period: string | null;
  from_date: string | null;
  to_date: string | null;
  emis: string | null;
}

export interface Student {
  id: number;
  name: string | null;
  admission_no: string | null;
  class_id: number | null;
  class_enrolment_date: string | null;
  class_status: string | null;
  student_status: string | null;
  enrollment_type: 'Public' | 'Private' | 'Dropout' | 'Fresh' | 'Other' | null;
  previous_school_name?: string | null;
  previous_school_emis?: string | null;
  session: string | null;
  date_of_birth: string | null;
  father_name: string | null;
  father_cnic: string | null;
  father_mobile_no: string | null;
  gender: string | null;
  section_id: number | null;
  emis: string | null;
  created_at?: string;
}

export interface StudentAttendance {
  id?: number;
  student_id: number;
  class_id: number;
  section_id?: number | null;
  teacher_id?: number | null;
  date: string;
  status: 'Present' | 'Absent' | 'Sick' | 'Leave';
  remarks?: string | null;
  emis: string | null;
}

export interface TeacherAttendance {
  id: number;
  teacher_id: number | null;
  attendance_date: string | null;
  check_in: string | null;
  check_out: string | null;
  duration: string | null;
  duration_seconds: number | null;
  status: string | null;
  emis: string | null;
}

export interface LeaveRequest {
  id: number;
  teacher_id: number | null;
  leave_type: string | null;
  from_date: string | null;
  to_date: string | null;
  days: number | null;
  reason: string | null;
  status: string | null;
  submitted_at: string | null;
  document_url?: string | null;
  emis: string | null;
}

export interface Session {
  id: number;
  name: string;
  emis: string | null;
}

export interface Semester {
  id: number;
  name: string;
  emis: string | null;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  emis: string | null;
}

export interface ClassSubject {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_id?: number | null;
  total_marks: number;
  passing_marks: number;
  emis: string | null;
}

export interface ExamResult {
  id: number;
  student_id: number;
  class_id: number;
  subject_id: number;
  session_id: number;
  semester_id: number;
  obtained_marks: number;
  total_marks: number;
  passing_marks: number;
  grade?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  teacher_id: number;
  emis: string | null;
}

export interface SchoolTimetable {
  id?: number;
  emis: string;
  working_days: string[];
  week_offs: string[];
  check_in_start: string;
  check_in_end: string;
  check_out_start: string;
  check_out_end: string;
  updated_at?: string;
}

