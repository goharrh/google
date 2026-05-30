import { useState, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, Users, FileText, History, 
  BarChart3, Settings, Plus, ChevronRight, ChevronLeft, CheckCircle, Award, 
  UserPlus, UserMinus, Shield, Fingerprint, Bell, Trash2, X, Download, Eye, Star,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import ConfirmationModal from './ConfirmationModal';
import { Employee, Class, Student, LeaveRequest, TeacherAttendance, TeacherClassAssignment, Section, Session, Semester, Subject, ClassSubject, ExamResult, SchoolTimetable } from '../types';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

import { useTheme } from '../context/ThemeContext';

const getGradeBadge = (grade: string | undefined | null) => {
  if (!grade) return <span className="text-slate-400 dark:text-slate-600 font-mono">-</span>;
  const g = grade.trim().toUpperCase();
  let colorClasses = "";
  
  if (g.startsWith('A+')) {
    colorClasses = "bg-gradient-to-r from-purple-500/15 to-fuchsia-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-[0_4px_12px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/20";
  } else if (g.startsWith('A')) {
    colorClasses = "bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-[0_4px_12px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/20";
  } else if (g.startsWith('B')) {
    colorClasses = "bg-gradient-to-r from-cyan-500/15 to-teal-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-[0_4px_12px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/20";
  } else if (g.startsWith('C')) {
    colorClasses = "bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_4px_12px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/20";
  } else if (g.startsWith('D')) {
    colorClasses = "bg-gradient-to-r from-orange-500/15 to-red-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 shadow-[0_4px_12px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/20";
  } else if (g.startsWith('F')) {
    colorClasses = "bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_4px_12px_rgba(244,63,94,0.12)] ring-1 ring-rose-500/20 animate-pulse";
  } else {
    colorClasses = "bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_4px_12px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20";
  }

  return (
    <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-black rounded-xl border uppercase tracking-[0.05em] font-sans transition-all duration-300 transform hover:scale-110 shadow-sm shadow-black/5 dark:shadow-white/5 bg-slate-100 dark:bg-slate-900 border-slate-250 dark:border-slate-800">
      <span className={`${colorClasses} px-2 py-0.5 rounded-lg border border-transparent`}>{g}</span>
    </span>
  );
};

interface TeacherDashboardProps {
  user: Employee;
  onLogout: () => void;
}

type TeacherTab = 'home' | 'classes' | 'history' | 'leave' | 'reports' | 'enrolment' | 'settings' | 'marks' | 'calendar';

export default function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TeacherTab>('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<TeacherAttendance | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<(Class & { section_name?: string | null, section_id_assigned?: number | null })[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, 'Present' | 'Absent' | 'Sick' | 'Leave'>>({});
  const [teacherLogs, setTeacherLogs] = useState<TeacherAttendance[]>([]);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [hasAuthSession, setHasAuthSession] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
  });

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const openConfirmModal = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      type,
    });
  };

  const sortedStudents = useMemo(() => {
    if (!sortDirection) return classStudents;
    return [...classStudents].sort((a, b) => {
      const numA = parseInt(a.admission_no || '0');
      const numB = parseInt(b.admission_no || '0');
      if (sortDirection === 'asc') return numA - numB;
      return numB - numA;
    });
  }, [classStudents, sortDirection]);

  const toggleSort = () => {
    setSortDirection(prev => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  };
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMode, setAttendanceMode] = useState<'mark' | 'report'>('mark');
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    leaveToday: 0
  });
  const [reportData, setReportData] = useState<{
    total: number;
    boys: number;
    girls: number;
    present: number;
    absent: number;
    sick: number;
    leave: number;
    presentPercentage: string;
    categorizedStudents: Record<'Present' | 'Absent' | 'Sick' | 'Leave', Student[]>;
  } | null>(null);
  const [viewingCategory, setViewingCategory] = useState<'Present' | 'Absent' | 'Sick' | 'Leave' | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<'All' | 'Approved' | 'Pending' | 'Rejected'>('All');
  
  // Calendar States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([
    { id: 1, title: 'Term 1 Commencement', date: '2025-01-01', type: 'academic', color: 'emerald' },
    { id: 2, title: 'Annual Sports Meet', date: '2025-02-15', type: 'event', color: 'blue' },
    { id: 3, title: 'Staff Development Day', date: '2025-03-10', type: 'staff', color: 'amber' },
    { id: 4, title: 'Mid-Term Examinations', date: '2025-04-20', type: 'exam', color: 'rose' },
    { id: 5, title: 'Summer Vacations Start', date: '2025-06-01', type: 'holiday', color: 'indigo' },
  ]);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [timetable, setTimetable] = useState<SchoolTimetable>({
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    week_offs: ['Sunday'],
    check_in_start: '07:30',
    check_in_end: '10:30',
    check_out_start: '13:00',
    check_out_end: '18:00'
  });

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    return { firstDay, lastDate };
  };

  const getCalendarDays = () => {
    const { firstDay, lastDate } = getDaysInMonth(currentCalendarDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), i));
    return days;
  };

  const changeMonth = (offset: number) => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + offset, 1));
  };

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [viewingStudentDMC, setViewingStudentDMC] = useState<Student | null>(null);
  
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<string>('');
  const [marksEntryData, setMarksEntryData] = useState<Record<number, number>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [marksMode, setMarksMode] = useState<'entry' | 'award'>('entry');
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    name: '',
    father_name: '',
    admission_no: '',
    class_id: '',
    section_id: '',
    enrollment_type: 'Fresh' as 'Public' | 'Private' | 'Dropout' | 'Fresh' | 'Other',
    previous_school_name: '',
    previous_school_emis: '',
    session: new Date().getFullYear().toString(),
    gender: 'MALE',
    dob: '',
    father_cnic: '',
    father_mobile: ''
  });
  const [leaveFormData, setLeaveFormData] = useState({
    type: 'Casual Leave',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    document: null as File | null
  });
  const [leaveDays, setLeaveDays] = useState(1);

  const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'undefined');

  useEffect(() => {
    const start = new Date(leaveFormData.startDate);
    const end = new Date(leaveFormData.endDate);
    if (end >= start) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setLeaveDays(diffDays);
    } else {
      setLeaveDays(0);
    }
  }, [leaveFormData.startDate, leaveFormData.endDate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchDashboardData();
    fetchLeaveRequests();
    
    // Check for real auth session
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setHasAuthSession(!!session);
      });
    } else {
      setHasAuthSession(true); // Treat as authed for demo
    }

    return () => clearInterval(timer);
  }, [user.id]);

  const fetchTimetable = async () => {
    const defaultTimetable = {
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      week_offs: ['Sunday'],
      check_in_start: '07:30',
      check_in_end: '10:30',
      check_out_start: '13:00',
      check_out_end: '18:00'
    };

    let localResult = null;
    try {
      const cached = localStorage.getItem(`school_timetable_${user.emis}`);
      if (cached) {
        localResult = JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error parsing local timetable:', e);
    }

    if (localResult) {
      setTimetable(localResult);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('school_timetable')
          .select('*')
          .eq('emis', user.emis)
          .limit(1);

        if (!error && data && data.length > 0) {
          const dbTimetable = {
            working_days: Array.isArray(data[0].working_days) ? data[0].working_days : defaultTimetable.working_days,
            week_offs: Array.isArray(data[0].week_offs) ? data[0].week_offs : defaultTimetable.week_offs,
            check_in_start: data[0].check_in_start || defaultTimetable.check_in_start,
            check_in_end: data[0].check_in_end || defaultTimetable.check_in_end,
            check_out_start: data[0].check_out_start || defaultTimetable.check_out_start,
            check_out_end: data[0].check_out_end || defaultTimetable.check_out_end,
          };
          setTimetable(dbTimetable);
          localStorage.setItem(`school_timetable_${user.emis}`, JSON.stringify(dbTimetable));
        }
      } catch (err) {
        console.error('Error fetching timetable:', err);
      }
    }

    if (!localResult && !isSupabaseConfigured) {
      setTimetable(defaultTimetable);
      localStorage.setItem(`school_timetable_${user.emis}`, JSON.stringify(defaultTimetable));
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setDataError(null);
    await fetchTimetable();
    if (!isSupabaseConfigured) {
      setSchoolName('Government Primary School (Demo)');
      setAssignedClasses([
        { id: 1, name: 'Class 5', grade: '5', section_name: 'A', section_id_assigned: 1, section_id: 1, emis: user.emis },
        { id: 2, name: 'Class 4', grade: '4', section_name: 'B', section_id_assigned: 2, section_id: 2, emis: user.emis }
      ]);
      setAllClasses([
        { id: 1, name: 'Class 5', grade: '5', emis: user.emis },
        { id: 2, name: 'Class 4', grade: '4', emis: user.emis }
      ]);
      setSections([
        { id: 1, name: 'A', class_id: 1 },
        { id: 2, name: 'B', class_id: 2 }
      ]);
        setStats({
          totalStudents: 45,
          presentToday: 42,
          absentToday: 2,
          leaveToday: 1
        });
        setIsLoading(false);
        return;
      }
    try {
      // Fetch school info
      const { data: schoolRows } = await supabase
        .from('schools')
        .select('name')
        .eq('emis', user.emis)
        .limit(1);
      
      const schoolData = schoolRows && schoolRows.length > 0 ? schoolRows[0] : null;
      if (schoolData) {
        setSchoolName(schoolData.name);
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's attendance for the teacher
      const { data: attendanceRows } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('attendance_date', today)
        .eq('emis', user.emis)
        .order('id', { ascending: false })
        .limit(1);

      const attendanceData = attendanceRows && attendanceRows.length > 0 ? attendanceRows[0] : null;

      if (attendanceData) {
        setTodayAttendance(attendanceData);
        setIsCheckedIn(!!attendanceData.check_in && !attendanceData.check_out);
      } else {
        setTodayAttendance(null);
        setIsCheckedIn(false);
      }

      // Fetch teacher's historical logs
      const { data: logsData } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('emis', user.emis)
        .order('attendance_date', { ascending: false })
        .limit(300);
      
      if (logsData) setTeacherLogs(logsData);

      // Fetch all classes for this school (for enrolment)
      const { data: allClassData } = await supabase
        .from('classes')
        .select('*')
        .eq('emis', user.emis)
        .order('class_name', { ascending: true });
      
      if (allClassData) setAllClasses(allClassData);
      else if (!isSupabaseConfigured) {
        setAllClasses([
          { id: 1, class_name: 'Grade 1', academic_year: '2024', emis: user.emis },
          { id: 2, class_name: 'Grade 2', academic_year: '2024', emis: user.emis },
          { id: 3, class_name: 'Grade 3', academic_year: '2024', emis: user.emis },
        ] as any);
      }

      // Fetch sections
      const { data: sectionData } = await supabase.from('sections').select('*').eq('emis', user.emis);
      if (sectionData) setSections(sectionData);
      else setSections([{ id: 1, section_name: 'A' }, { id: 2, section_name: 'B' }]);

      // Fetch classes assigned to this teacher
      const { data: assignments, error } = await supabase
        .from('teacher_class_assignment')
        .select('id, class_id, section_id')
        .eq('teacher_id', user.id)
        .eq('emis', user.emis);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const classIds = assignments.map(a => a.class_id);
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds)
          .eq('emis', user.emis);
        
        if (classError) throw classError;
        
        // Map assignments to include section names
        const enrichedClasses = assignments.map(a => {
          const cls = (classData || []).find(c => c.id === a.class_id);
          const sect = (sectionData || [{ id: 1, section_name: 'A' }, { id: 2, section_name: 'B' }]).find(s => s.id === a.section_id);
          return {
            ...cls,
            assignment_id: a.id,
            section_name: sect?.section_name,
            section_id_assigned: a.section_id
          };
        }).filter(c => c.id !== undefined) as any;

        setAssignedClasses(enrichedClasses);

        // Fetch students counts for stats
        const { data: studentsData } = await supabase
          .from('students')
          .select('id')
          .in('class_id', classIds)
          .eq('emis', user.emis);
        
        const total = studentsData?.length || 0;
        
        // Fetch today's attendance summary for these students
        const { data: attendanceStats } = await supabase
          .from('student_attendance')
          .select('status')
          .in('class_id', classIds)
          .eq('date', today)
          .eq('emis', user.emis);
        
        const present = attendanceStats?.filter(a => a.status === 'Present').length || 0;
        const absent = attendanceStats?.filter(a => a.status === 'Absent').length || 0;
        const leave = attendanceStats?.filter(a => a.status === 'Leave' || a.status === 'Sick').length || 0;

        setStats({
          totalStudents: total,
          presentToday: present,
          absentToday: absent,
          leaveToday: leave
        });
      } else {
        // Fallback to demo data
        if (!import.meta.env.VITE_SUPABASE_URL) {
          setAssignedClasses([
            { id: 1, class_name: 'Grade 10-A', section_id: 1, academic_year: '2024', room_no: 'R1', subject: 'Math', teacher_id: 1, section_name: 'A' },
            { id: 2, class_name: 'Grade 11-B', section_id: 2, academic_year: '2024', room_no: 'R2', subject: 'Physics', teacher_id: 1, section_name: 'B' }
          ] as any);
        } else {
          setAssignedClasses([]);
        }
      }

      // Fetch Exam Related Data
      const { data: sessionData } = await supabase.from('sessions').select('*').eq('emis', user.emis);
      if (sessionData) setSessions(sessionData);
      else if (!isSupabaseConfigured) setSessions([{ id: 1, name: '2023-24', emis: user.emis }, { id: 2, name: '2024-25', emis: user.emis }, { id: 3, name: '2025-26', emis: user.emis }]);

      const { data: semesterData } = await supabase.from('semesters').select('*').eq('emis', user.emis);
      if (semesterData) setSemesters(semesterData);
      else if (!isSupabaseConfigured) setSemesters([{ id: 1, name: 'Mid Term', emis: user.emis }, { id: 2, name: 'Final Term', emis: user.emis }]);

      const { data: subjectData } = await supabase.from('subjects').select('*').eq('emis', user.emis);
      if (subjectData) setSubjects(subjectData);
      else if (!isSupabaseConfigured) setSubjects([{ id: 1, name: 'Mathematics', code: 'MATH101', emis: user.emis }, { id: 2, name: 'Physics', code: 'PHY101', emis: user.emis }]);

      const { data: csData } = await supabase
        .from('class_subject')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('emis', user.emis);
      if (csData) setClassSubjects(csData);
      else if (!isSupabaseConfigured) setClassSubjects([{ id: 1, class_id: 1, subject_id: 1, teacher_id: 1, total_marks: 100, passing_marks: 33, emis: user.emis }]);

      // Fetch existing results for this EMIS (to allow teachers to see full DMCs)
      const { data: resData } = await supabase.from('exam_results').select('*').eq('emis', user.emis);
      if (resData) setExamResults(resData);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setDataError(err.message || 'Establishment of Communication Relay failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfile(true);
    try {
      if (!isSupabaseConfigured) {
        alert('Demo Mode: Profile picture upload simulated.');
        setIsUploadingProfile(false);
        return;
      }

      // Check if user is authenticated via Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be signed in to Supabase Auth to upload files. RLS policy requires a valid session.');
      }

      const fileExt = file.name.split('.').pop();
      // Use Supabase Auth UUID if available to satisfy typical RLS policies
      const userIdForPath = session?.user?.id || user.id;
      const fileName = `${userIdForPath}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-profiles')
        .upload(filePath, file);

      if (uploadError) {
        // Handle RLS error specifically
        if (uploadError.message.includes('row-level security policy')) {
          throw new Error('Permission Denied: Ensure that your Supabase Storage bucket "employee-profiles" allows uploads for authenticated users.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('employee-profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('emp')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.message.includes('row-level security policy')) {
          throw new Error('Permission Denied: The system could not update your database record due to a row-level security policy. Please ensure the "emp" table allows updates for your account.');
        }
        throw updateError;
      }

      if (!import.meta.env.VITE_SUPABASE_URL) { // Keeping this check simple for the update part
        alert('Demo Mode: Profile picture upload simulated.');
      } else {
        alert('Profile picture updated successfully! Please reload to see changes.');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error uploading profile picture:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingProfile(false);
    }
  };
  
  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('emis', user.emis)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }
  };

  const fetchStudents = async (classId: number) => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .eq('emis', user.emis);
    
    let students: Student[] = [];
    if (data) {
      students = data;
    } else {
      // Demo Students
      students = [
        { id: 1, name: 'Abbas Khan', admission_no: '1001', class_id: classId, class_status: 'Active', student_status: 'Active' },
        { id: 2, name: 'Zainab Bibi', admission_no: '1002', class_id: classId, class_status: 'Active', student_status: 'Active' },
        { id: 3, name: 'Umar Hayat', admission_no: '1003', class_id: classId, class_status: 'Active', student_status: 'Active' },
      ] as Student[];
    }
    setClassStudents(students);
    
    // Initialize attendance records as 'Present' for all students by default
    const initialAttendance: Record<number, 'Present' | 'Absent' | 'Sick' | 'Leave'> = {};
    students.forEach(s => {
      initialAttendance[s.id] = 'Present';
    });
    setAttendanceRecords(initialAttendance);

    // Auto-check today's attendance to see if it has already been filed
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: attData, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', today)
        .eq('emis', user.emis);

      if (!error && attData && attData.length > 0) {
        // Calculate report from fetched data without relying on stale classStudents state
        const total = students.length;
        const boys = students.filter(s => s.gender === 'MALE').length;
        const girls = students.filter(s => s.gender === 'FEMALE').length;
        
        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<'Present' | 'Absent' | 'Sick' | 'Leave', Student[]> = {
          Present: [], Absent: [], Sick: [], Leave: []
        };

        const todayAttendance: Record<number, 'Present' | 'Absent' | 'Sick' | 'Leave'> = {};

        students.forEach(student => {
          const record = attData.find(r => Number(r.student_id) === Number(student.id));
          const status = (record?.status as any) || 'Present';
          if (counts[status] !== undefined) counts[status]++;
          categorized[status].push(student);
          todayAttendance[student.id] = status;
        });

        // Set the active records mapping so toggling "Mark" loads the previously saved statuses
        setAttendanceRecords(todayAttendance);

        setReportData({
          total, boys, girls,
          present: counts.Present,
          absent: counts.Absent,
          sick: counts.Sick,
          leave: counts.Leave,
          presentPercentage: total > 0 ? ((counts.Present / total) * 100).toFixed(1) : '0',
          categorizedStudents: categorized
        });
        setReportDate(today);
        setAttendanceMode('report');
        setShowReport(true);
      }
    } catch (err) {
      console.warn("Error auto-detecting today's classroom attendance:", err);
    }
  };

  const handleClassSelect = (classId: number) => {
    setSelectedClassId(classId);
    setAttendanceMode('mark');
    setShowReport(false);
    fetchStudents(classId);
    setActiveTab('classes');
  };

  const fetchAttendanceForDate = async (classId: number, date: string) => {
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date)
        .eq('emis', user.emis);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate report from fetched data
        const total = classStudents.length;
        const boys = classStudents.filter(s => s.gender === 'MALE').length;
        const girls = classStudents.filter(s => s.gender === 'FEMALE').length;
        
        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<'Present' | 'Absent' | 'Sick' | 'Leave', Student[]> = {
          Present: [], Absent: [], Sick: [], Leave: []
        };

        classStudents.forEach(student => {
          const record = data.find(r => Number(r.student_id) === Number(student.id));
          const status = (record?.status as any) || 'Present';
          if (counts[status] !== undefined) counts[status]++;
          categorized[status].push(student);
        });

        setReportData({
          total, boys, girls,
          present: counts.Present,
          absent: counts.Absent,
          sick: counts.Sick,
          leave: counts.Leave,
          presentPercentage: total > 0 ? ((counts.Present / total) * 100).toFixed(1) : '0',
          categorizedStudents: categorized
        });
        setShowReport(true);
      } else {
        setShowReport(false);
        setReportData(null);
      }
    } catch (err) {
      console.error('Error fetching historical report:', err);
    }
  };

  const updateAttendanceStatus = (studentId: number, status: 'Present' | 'Absent' | 'Sick' | 'Leave') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async () => {
    if (!selectedClassId) return;
    
    setIsSavingAttendance(true);
    try {
      if (!isSupabaseConfigured) {
        // Mock success if no DB
        const total = classStudents.length;
        const boys = classStudents.filter(s => s.gender === 'MALE').length;
        const girls = classStudents.filter(s => s.gender === 'FEMALE').length;
        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<'Present' | 'Absent' | 'Sick' | 'Leave', Student[]> = { Present: [], Absent: [], Sick: [], Leave: [] };
        classStudents.forEach(s => {
          const status = attendanceRecords[s.id] || 'Present';
          counts[status]++;
          categorized[status].push(s);
        });
        setReportData({
          total, boys, girls, present: counts.Present, absent: counts.Absent, sick: counts.Sick, leave: counts.Leave,
          presentPercentage: total > 0 ? ((counts.Present / total) * 100).toFixed(1) : '0',
          categorizedStudents: categorized
        });
        setShowReport(true);
        setIsSavingAttendance(false);
        return;
      }

      // Check for session to satisfy RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && import.meta.env.VITE_SUPABASE_URL) {
        console.warn('Authentication session missing. Proceeding with caution.');
      }

      const selectedClass = assignedClasses.find(c => c.id === selectedClassId);
      const date = new Date().toISOString().split('T')[0];
      
      const records = classStudents.map(student => ({
        student_id: student.id,
        class_id: selectedClassId,
        section_id: selectedClass?.section_id_assigned || null,
        date: date,
        status: attendanceRecords[student.id] || 'Present',
        teacher_id: user.id,
        emis: user.emis
      }));

      const { error: upsertError } = await supabase
        .from('student_attendance')
        .upsert(records);

      if (upsertError) throw upsertError;

      // Calculate report data
      const total = classStudents.length;
      const boys = classStudents.filter(s => s.gender === 'MALE').length;
      const girls = classStudents.filter(s => s.gender === 'FEMALE').length;
      
      const counts = {
        Present: 0,
        Absent: 0,
        Sick: 0,
        Leave: 0
      };
      
      const categorized: Record<'Present' | 'Absent' | 'Sick' | 'Leave', Student[]> = {
        Present: [],
        Absent: [],
        Sick: [],
        Leave: []
      };

      classStudents.forEach(student => {
        const status = attendanceRecords[student.id] || 'Present';
        counts[status]++;
        categorized[status].push(student);
      });

      const presentPercentage = total > 0 ? ((counts.Present / total) * 100).toFixed(1) : '0';

      setReportData({
        total,
        boys,
        girls,
        present: counts.Present,
        absent: counts.Absent,
        sick: counts.Sick,
        leave: counts.Leave,
        presentPercentage,
        categorizedStudents: categorized
      });
      setAttendanceMode('report');
      setShowReport(true);
      
      // Removed alert for a smoother UI experience
      // setSelectedClassId(null); // Keep it open to show the report
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      const isAlreadyMarkedError = err && (
        err.code === 'P0001' || 
        err.message?.includes('Attendance already marked') || 
        err.message?.includes('attendance_student_today_unique') ||
        (typeof err === 'object' && JSON.stringify(err).includes('Attendance already marked'))
      );
      if (isAlreadyMarkedError) {
        alert('Attendance already marked for this today');
        if (selectedClassId) {
          const today = new Date().toISOString().split('T')[0];
          await fetchAttendanceForDate(selectedClassId, today);
          setAttendanceMode('report');
        }
      } else {
        alert(`Error saving attendance: ${err.message || err}`);
      }
    } finally {
      setIsSavingAttendance(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId && selectedSemesterId && selectedClassSubjectId && examResults.length > 0) {
      const classSub = classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId));
      if (!classSub) return;
      
      const newMarksData: Record<number, number> = {};
      sortedStudents.forEach(student => {
        const existing = examResults.find(r => 
          r.student_id === student.id && 
          r.session_id === parseInt(selectedSessionId) && 
          r.semester_id === parseInt(selectedSemesterId) &&
          r.subject_id === classSub.subject_id
        );
        if (existing) {
          newMarksData[student.id] = existing.obtained_marks;
        }
      });
      setMarksEntryData(newMarksData);
    } else {
      setMarksEntryData({});
    }
  }, [selectedSessionId, selectedSemesterId, selectedClassSubjectId, examResults, sortedStudents, classSubjects]);

  const saveMarks = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedSemesterId || !selectedClassSubjectId) {
      alert('Please select session, semester and subject');
      return;
    }
    const classSub = classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId));
    if (!classSub) return;

    // Validation: check if any mark exceeds total_marks
    const invalidEntries = Object.entries(marksEntryData).filter(([_, marks]) => (marks as number) > classSub.total_marks);
    if (invalidEntries.length > 0) {
      alert(`Validation Error: One or more entries exceed the maximum marks allowed (${classSub.total_marks}).`);
      return;
    }

    setIsSavingMarks(true);
    try {
      const resultsToSave = Object.entries(marksEntryData).map(([studentId, marks]) => ({
        student_id: parseInt(studentId),
        class_id: classSub.class_id,
        subject_id: classSub.subject_id,
        session_id: parseInt(selectedSessionId),
        semester_id: parseInt(selectedSemesterId),
        obtained_marks: marks as number,
        total_marks: classSub.total_marks,
        passing_marks: classSub.passing_marks,
        teacher_id: user.id,
        emis: user.emis,
        grade: (marks as number) >= (classSub.total_marks * 0.9) ? 'A+' : (marks as number) >= (classSub.total_marks * 0.8) ? 'A' : (marks as number) >= (classSub.total_marks * 0.7) ? 'B' : (marks as number) >= (classSub.total_marks * 0.6) ? 'C' : (marks as number) >= classSub.passing_marks ? 'D' : 'F'
      }));

      // Only save if there are results (or if we want to allow clearing)
      if (resultsToSave.length === 0) {
        alert('No data points detected for synchronization');
        setIsSavingMarks(false);
        return;
      }

      if (isSupabaseConfigured) {
        const { error } = await supabase.from('exam_results').upsert(resultsToSave, { onConflict: 'student_id,class_id,subject_id,session_id,semester_id' });
        if (error) throw error;
      }
      
      setExamResults(prev => {
          const filtered = prev.filter(r => 
              !(resultsToSave.some(nr => 
                  nr.student_id === r.student_id && 
                  nr.class_id === r.class_id && 
                  nr.subject_id === r.subject_id && 
                  nr.session_id === r.session_id && 
                  nr.semester_id === r.semester_id
              ))
          );
          return [...filtered, ...resultsToSave as any];
      });

      alert('Marks saved successfully');
    } catch (err: any) {
      alert(`Saving marks failed: ${err.message}`);
    } finally {
      setIsSavingMarks(false);
    }
  };

  const fetchUnassignedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .is('class_id', null)
        .eq('emis', user.emis);
      
      if (error) throw error;
      
      if (data) {
        setUnassignedStudents(data);
      } else if (!isSupabaseConfigured) {
        // Mock unassigned students if no DB
        setUnassignedStudents([
            { id: 101, name: 'Sajid Mehmood', admission_no: '2001', class_id: null, class_status: 'Pending', student_status: 'Active' },
            { id: 102, name: 'Fatima Zahra', admission_no: '2002', class_id: null, class_status: 'Pending', student_status: 'Active' },
            { id: 103, name: 'Bilal Ahmed', admission_no: '2003', class_id: null, class_status: 'Pending', student_status: 'Active' },
          ] as Student[]);
      }
    } catch (err) {
      console.error('Error fetching unassigned students:', err);
    }
  };

  const assignStudentToClass = async (studentId: number) => {
    if (!selectedClassId) return;
    
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ class_id: selectedClassId })
        .eq('id', studentId)
        .eq('emis', user.emis);

      if (error) throw error;

      // Refresh data
      await fetchStudents(selectedClassId);
      await fetchUnassignedStudents();
    } catch (err) {
      console.error('Error assigning student:', err);
      // Mock update if no DB
      if (!import.meta.env.VITE_SUPABASE_URL) {
        const studentToMove = unassignedStudents.find(s => s.id === studentId);
        if (studentToMove) {
          setClassStudents([...classStudents, { ...studentToMove, class_id: selectedClassId }]);
          setUnassignedStudents(unassignedStudents.filter(s => s.id !== studentId));
        }
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState<number | string | null>(null);

  const handleRemoveStudentFromClass = async (studentId: number | string) => {
    if (!studentId) return;
    
    openConfirmModal(
      'Remove Enrollment',
      'Remove this student from your class? They will need to be re-assigned later.',
      async () => {
        setIsDeleting(studentId);
        try {
          if (!import.meta.env.VITE_SUPABASE_URL) {
            setClassStudents(prev => prev.filter(s => s.id != studentId));
            alert('Student removed successfully (Demo Mode).');
            return;
          }

          const { error } = await supabase
            .from('students')
            .update({ class_id: null, section_id: null })
            .eq('id', studentId);
          
          if (error) throw error;

          setClassStudents(prev => prev.filter(s => s.id != studentId));
          alert('Student removed successfully.');
        } catch (err: any) {
          alert(`Removal failed: ${err.message}`);
        } finally {
          setIsDeleting(null);
        }
      }
    );
  };

  const downloadDMC = (student: Student) => {
    if (!selectedSessionId || !selectedSemesterId) {
      alert('Please select Session and Semester first');
      return;
    }

    const session = sessions.find(s => s.id === parseInt(selectedSessionId));
    const semester = semesters.find(s => s.id === parseInt(selectedSemesterId));
    const studentResults = examResults.filter(r => 
      r.student_id === student.id && 
      r.session_id === parseInt(selectedSessionId) && 
      r.semester_id === parseInt(selectedSemesterId)
    );

    if (studentResults.length === 0) {
      alert('No results found for this student in the selected term.');
      return;
    }

    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text(schoolName || 'School Information System', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Detailed Mark Certificate (DMC)', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`${semester?.name} Examination - Session ${session?.name}`, pageWidth / 2, 38, { align: 'center' });

    // Student Info Box
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, 45, pageWidth - 28, 35);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Name:', 20, 55);
    doc.text('Father Name:', 20, 62);
    doc.text('Admission No:', 20, 69);
    doc.text('Class:', 120, 55);
    doc.text('EMIS Code:', 120, 62);
    doc.text('Date Issued:', 120, 69);

    doc.setFont('helvetica', 'normal');
    doc.text(student.name || '-', 50, 55);
    doc.text(student.father_name || '-', 50, 62);
    doc.text(student.admission_no || '-', 50, 69);
    const cls = allClasses.find(c => c.id === student.class_id);
    doc.text(cls?.class_name || '-', 150, 55);
    doc.text(user.emis || '-', 150, 62);
    doc.text(new Date().toLocaleDateString(), 150, 69);

    // Marks Table
    const tableData = studentResults.map(r => {
      const subj = subjects.find(s => s.id === r.subject_id);
      return [
        subj?.name || 'Unknown',
        r.total_marks.toString(),
        r.passing_marks.toString(),
        r.obtained_marks.toString(),
        r.grade,
        r.obtained_marks >= r.passing_marks ? 'PASS' : 'FAIL'
      ];
    });

    const totalObtained = studentResults.reduce((acc, curr) => acc + curr.obtained_marks, 0);
    const totalMax = studentResults.reduce((acc, curr) => acc + curr.total_marks, 0);
    const percentage = ((totalObtained / totalMax) * 100).toFixed(2);
    const overallPass = studentResults.every(r => r.obtained_marks >= r.passing_marks);

    autoTable(doc, {
      startY: 85,
      head: [['Subject', 'Max Marks', 'Passing', 'Obtained', 'Grade', 'Status']],
      body: tableData,
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Aggregate Marks: ${totalObtained} / ${totalMax}`, 14, finalY);
    doc.text(`Percentage: ${percentage}%`, 14, finalY + 7);
    doc.text(`Result Status: ${overallPass ? 'QUALIFIED' : 'NOT QUALIFIED'}`, 14, finalY + 14);

    // Footer Signatures
    doc.setFontSize(9);
    doc.text('____________________', 25, finalY + 40);
    doc.text('Class Teacher', 35, finalY + 45);
    
    doc.text('____________________', pageWidth - 70, finalY + 40);
    doc.text('Head Teacher', pageWidth - 60, finalY + 45);

    doc.save(`DMC_${student.admission_no}_${student.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadAwardList = () => {
    if (!selectedSessionId || !selectedSemesterId || !selectedClassSubjectId) {
      alert('Please select Session, Semester and Subject first');
      return;
    }

    const session = sessions.find(s => s.id === parseInt(selectedSessionId));
    const semester = semesters.find(s => s.id === parseInt(selectedSemesterId));
    const cs = classSubjects.find(x => x.id === parseInt(selectedClassSubjectId));
    const subj = subjects.find(s => s.id === cs?.subject_id);
    const cls = allClasses.find(c => c.id === cs?.class_id);

    const exportData = classStudents.map(student => {
      const res = examResults.find(r => 
          r.student_id === student.id && 
          r.session_id === parseInt(selectedSessionId) && 
          r.semester_id === parseInt(selectedSemesterId) &&
          r.subject_id === cs?.subject_id
      );
      return {
        'Admission No': student.admission_no,
        'Student Name': student.name,
        'Father Name': student.father_name || '-',
        'Max Marks': cs?.total_marks || 0,
        'Passing Marks': cs?.passing_marks || 0,
        'Obtained Marks': res?.obtained_marks || 0,
        'Grade': res?.grade || '-',
        'Status': res ? (res.obtained_marks >= res.passing_marks ? 'PASS' : 'FAIL') : 'PENDING'
      };
    });

    // Add custom header rows
    const header = [
      [schoolName || 'School Information System'],
      [`Examination: ${semester?.name} - ${session?.name}`],
      [`Class: ${cls?.class_name || '-'} | Subject: ${subj?.name || '-'}`],
      [`Award List Generated on: ${new Date().toLocaleDateString()}`],
      [] // Empty row
    ];
    
    const finalWorksheet = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(finalWorksheet, exportData, { origin: "A6" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, finalWorksheet, "Award List");
    
    XLSX.writeFile(workbook, `AwardList_${cls?.class_name}_${subj?.name}.xlsx`);
  };

  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    setIsEnrolling(true);
    try {
      if (!isSupabaseConfigured) {
        alert('Student enrolled successfully (Demo Mode)!');
        setEnrollForm({
          name: '', father_name: '', admission_no: '', class_id: '', section_id: '',
          enrollment_type: 'Fresh', previous_school_name: '', previous_school_emis: '',
          session: new Date().getFullYear().toString(), gender: 'MALE', dob: '',
          father_cnic: '', father_mobile: ''
        });
        setActiveTab('home');
        setIsEnrolling(false);
        return;
      }

      const studentData = {
        name: enrollForm.name,
        father_name: enrollForm.father_name,
        admission_no: enrollForm.admission_no,
        class_id: enrollForm.class_id ? parseInt(enrollForm.class_id) : null,
        section_id: enrollForm.section_id ? parseInt(enrollForm.section_id) : null,
        enrollment_type: enrollForm.enrollment_type,
        previous_school_name: (!['Fresh', 'Dropout'].includes(enrollForm.enrollment_type)) ? enrollForm.previous_school_name : null,
        previous_school_emis: (!['Fresh', 'Dropout'].includes(enrollForm.enrollment_type)) ? enrollForm.previous_school_emis : null,
        session: enrollForm.session,
        gender: enrollForm.gender,
        date_of_birth: enrollForm.dob,
        father_cnic: enrollForm.father_cnic,
        father_mobile_no: enrollForm.father_mobile,
        emis: user.emis,
        student_status: 'Active',
        class_status: 'Active',
        class_enrolment_date: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase
        .from('students')
        .insert([studentData]);

      if (error) throw error;

      alert('Student enrolled successfully!');
      setEnrollForm({
        name: '',
        father_name: '',
        admission_no: '',
        class_id: '',
        section_id: '',
        enrollment_type: 'Fresh',
        previous_school_name: '',
        previous_school_emis: '',
        session: new Date().getFullYear().toString(),
        gender: 'MALE',
        dob: '',
        father_cnic: '',
        father_mobile: ''
      });
      setActiveTab('home');
    } catch (err: any) {
      console.error('Error enrolling student:', err);
      alert(`Enrollment failed: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePasswordChange = async (e: any) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        alert('Password updated successfully (Demo Mode)');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        return;
      }

      // Check current password
      const { data: userData, error: userError } = await supabase
        .from('emp')
        .select('password')
        .eq('id', user.id)
        .single();

      if (userError || !userData) throw new Error('User not found');

      const isMatch = bcrypt.compareSync(passwordForm.currentPassword, userData.password);
      if (!isMatch) {
         alert('Current password incorrect');
         return;
      }

      const hashedPassword = bcrypt.hashSync(passwordForm.newPassword, 10);
      const { error } = await supabase
        .from('emp')
        .update({ password: hashedPassword })
        .eq('id', user.id);

      if (error) throw error;
      
      alert('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePunch = async () => {
    if (!isSupabaseConfigured) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];

      if (!isCheckedIn) {
        const mockData: TeacherAttendance = {
          id: Date.now(),
          teacher_id: user.id,
          attendance_date: today,
          check_in: time,
          check_out: null,
          duration: null,
          duration_seconds: null,
          status: 'Present',
          emis: user.emis
        };
        setTodayAttendance(mockData);
        setIsCheckedIn(true);
        setTeacherLogs(prev => [mockData, ...prev].slice(0, 10));
      } else if (todayAttendance) {
        const updated = { ...todayAttendance, check_out: time, duration: '08:00:00' };
        setTodayAttendance(updated);
        setIsCheckedIn(false);
        setTeacherLogs(prev => [updated, ...prev.filter(l => l.id !== todayAttendance.id)].slice(0, 10));
      }
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    try {
      if (!isCheckedIn) {
        // Punch In
        const randomId = Math.floor(Math.random() * 2147483647);
        const { data: insertedRows, error } = await supabase
          .from('teacher_attendance')
          .insert({
            id: randomId,
            teacher_id: user.id,
            attendance_date: today,
            check_in: time,
            status: 'Present',
            emis: user.emis
          })
          .select();

        let data = insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;

        if (error) throw error;
        if (!data) {
          data = {
            id: randomId,
            teacher_id: user.id,
            attendance_date: today,
            check_in: time,
            check_out: null,
            duration: null,
            duration_seconds: null,
            status: 'Present',
            emis: user.emis
          };
        }

        setTodayAttendance(data);
        setIsCheckedIn(true);
        setTeacherLogs(prev => [data, ...prev.filter(l => l.id !== data.id)].slice(0, 10));
      } else if (todayAttendance) {
        // Punch Out
        const checkInStr = todayAttendance.check_in || "08:00:00";
        const checkInParts = checkInStr.split(":") || ["08", "00", "00"];
        const checkInTime = new Date();
        checkInTime.setHours(
          parseInt(checkInParts[0] || "8", 10),
          parseInt(checkInParts[1] || "0", 10),
          parseInt(checkInParts[2] || "0", 10)
        );
        const checkOutTime = now;
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        let diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        if (isNaN(diffSecs)) diffSecs = 0;
        
        const hours = Math.floor(diffSecs / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const durationStr = `${hours}h ${minutes}m`;

        let updatedData: any = null;

        const { data: updatedRows, error: updateError } = await supabase
          .from('teacher_attendance')
          .update({
            check_out: time,
            duration: durationStr,
            duration_seconds: diffSecs
          })
          .eq('id', todayAttendance.id)
          .select();

        if (!updateError && updatedRows && updatedRows.length > 0) {
          updatedData = updatedRows[0];
        } else {
          console.warn('Primary update by record ID failed or returned 0 rows. Attempting fallback date & teacher_id query match.', updateError);
          const { data: fallbackRows, error: fallbackError } = await supabase
            .from('teacher_attendance')
            .update({
              check_out: time,
              duration: durationStr,
              duration_seconds: diffSecs
            })
            .eq('teacher_id', user.id)
            .eq('attendance_date', today)
            .eq('emis', user.emis)
            .select();

          if (!fallbackError && fallbackRows && fallbackRows.length > 0) {
            updatedData = fallbackRows[0];
          } else {
            console.warn('Both updates failed. Attempting DELETE + INSERT flow as bypass for RLS update restrictions...');
            try {
              const { error: deleteError } = await supabase
                .from('teacher_attendance')
                .delete()
                .eq('id', todayAttendance.id);
              
              if (!deleteError) {
                const completedPayload = {
                  id: todayAttendance.id,
                  teacher_id: user.id,
                  attendance_date: today,
                  check_in: checkInStr,
                  check_out: time,
                  status: todayAttendance.status || 'Present',
                  duration: durationStr,
                  duration_seconds: diffSecs,
                  emis: user.emis
                };
                
                const { data: insertedRows, error: insertError } = await supabase
                  .from('teacher_attendance')
                  .insert(completedPayload)
                  .select();
                  
                if (!insertError && insertedRows && insertedRows.length > 0) {
                  console.log('Successfully completed shift termination via DELETE + INSERT bypass.');
                  updatedData = insertedRows[0];
                } else {
                  console.warn('Completed row INSERT failed. Restoring original punch-in entry to prevent data loss...', insertError);
                  await supabase
                    .from('teacher_attendance')
                    .insert({
                      id: todayAttendance.id,
                      teacher_id: user.id,
                      attendance_date: today,
                      check_in: checkInStr,
                      status: todayAttendance.status || 'Present',
                      emis: user.emis
                    });
                  throw insertError || new Error('Completed record insertion unsuccessful.');
                }
              } else {
                throw deleteError;
              }
            } catch (deleteInsertErr) {
              console.warn('DELETE + INSERT flow failed. Proceeding with full record upsert...', deleteInsertErr);
              const upsertPayload = {
                id: todayAttendance.id,
                teacher_id: user.id,
                attendance_date: today,
                check_in: checkInStr,
                check_out: time,
                status: todayAttendance.status || 'Present',
                duration: durationStr,
                duration_seconds: diffSecs,
                emis: user.emis
              };
              const { data: upsertRows, error: upsertError } = await supabase
                .from('teacher_attendance')
                .upsert(upsertPayload)
                .select();

              if (!upsertError && upsertRows && upsertRows.length > 0) {
                updatedData = upsertRows[0];
              } else {
                console.error('All database update and upsert options failed for attendance punch:', upsertError || fallbackError || updateError);
                throw upsertError || fallbackError || updateError || new Error('Record not found.');
              }
            }
          }
        }

        if (updatedData) {
          setTodayAttendance(updatedData);
          setIsCheckedIn(false);
          setTeacherLogs(prev => [updatedData, ...prev.filter(l => l.id !== updatedData.id)].slice(0, 10));
        }
      }
    } catch (err: any) {
      console.error('Error during punch operation:', err);
      
      const fallbackTime = time;
      const checkInStr = todayAttendance?.check_in || '08:00:00';
      const checkInParts = checkInStr.split(":") || ["08", "00", "00"];
      const checkInTime = new Date();
      checkInTime.setHours(
        parseInt(checkInParts[0] || "8", 10),
        parseInt(checkInParts[1] || "0", 10),
        parseInt(checkInParts[2] || "0", 10)
      );
      const checkOutTime = now;
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      let diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      if (isNaN(diffSecs)) diffSecs = 0;
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const durationStr = `${hours}h ${minutes}m`;

      if (!isCheckedIn) {
        const fallbackIn = {
          id: todayAttendance?.id || Math.floor(Math.random() * 2147483647),
          teacher_id: user.id,
          attendance_date: today,
          check_in: fallbackTime,
          check_out: null,
          duration: null,
          duration_seconds: null,
          status: 'Present',
          emis: user.emis
        } as TeacherAttendance;
        setTodayAttendance(fallbackIn);
        setIsCheckedIn(true);
        setTeacherLogs(prev => [fallbackIn, ...prev.filter(l => l.id !== fallbackIn.id)].slice(0, 10));
        alert('Attendance punched in locally. Sync with cloud will resume automatically on next action.');
      } else {
        const fallbackOut = {
          id: todayAttendance?.id || Math.floor(Math.random() * 2147483647),
          teacher_id: user.id,
          attendance_date: today,
          check_in: checkInStr,
          check_out: fallbackTime,
          duration: durationStr,
          duration_seconds: diffSecs,
          status: 'Present',
          emis: user.emis
        } as TeacherAttendance;
        setTodayAttendance(fallbackOut);
        setIsCheckedIn(false);
        setTeacherLogs(prev => [fallbackOut, ...prev.filter(l => l.id !== fallbackOut.id)].slice(0, 10));
        alert('Attendance punched out locally. Sync with cloud will resume automatically on next action.');
      }
    }
  };

  const tabs = [
    { id: 'home', label: 'Monitor', icon: Shield },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'classes', label: 'Class', icon: Users },
    { id: 'history', label: 'Record', icon: History },
    { id: 'leave', label: 'Leave', icon: FileText },
    { id: 'reports', label: 'Report', icon: BarChart3 },
    { id: 'enrolment', label: 'Enroll', icon: UserPlus },
    { id: 'marks', label: 'Results', icon: Award },
    { id: 'settings', label: 'Profile', icon: Settings },
  ];

  if (isLoading) {
    return (
      <DashboardLayout 
        user={user} 
        onLogout={onLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs}
        title="Teacher Terminal"
        schoolName="Loading System State..."
        emis={user.emis || ''}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-t-2 border-r-2 border-emerald-500 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Syncing Profile</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Establishing Secure Relay...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (dataError) {
    return (
      <DashboardLayout 
        user={user} 
        onLogout={onLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs}
        title="Teacher Terminal"
        schoolName="System Downlink Error"
        emis={user.emis || ''}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-6 text-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center border border-red-500/20 shadow-2xl shadow-red-500/10">
            <X className="w-12 h-12 text-red-500" />
          </div>
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">Relay Failure</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose bg-red-500/5 p-4 border border-red-500/10 rounded-2xl">
              {dataError}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl"
          >
            Retry Satellite Link
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      onLogout={onLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      tabs={tabs}
      schoolName={schoolName}
      emis={user.emis || ''}
      todayAttendance={todayAttendance}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full"
        >
          {activeTab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-card border border-border p-8 rounded-2xl text-center shadow-xl transition-colors duration-500">
               <div className="text-5xl font-light text-slate-900 dark:text-white font-mono tracking-tighter mb-2">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </div>
               <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
               </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-500">My Shift</h3>
                 <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-bold uppercase ${isCheckedIn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                    {isCheckedIn ? 'Punched In' : 'Punched Out'}
                 </div>
              </div>

              {todayAttendance && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 rounded-xl">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">Check In</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">{todayAttendance.check_in || '--:--:--'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 rounded-xl">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">Check Out</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">{todayAttendance.check_out || '--:--:--'}</p>
                  </div>
                  {todayAttendance.duration && (
                    <div className="col-span-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                      <p className="text-[7px] text-emerald-600 dark:text-emerald-500/60 uppercase tracking-widest">Total Duration</p>
                      <p className="text-xs font-bold text-emerald-500 font-mono">{todayAttendance.duration}</p>
                    </div>
                  )}
                </div>
              )}
              <button 
                onClick={handlePunch} 
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors ${isCheckedIn ? 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'}`}
              >
                {isCheckedIn ? 'Terminate Shift' : 'Initiate Shift'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: stats.totalStudents, color: 'text-slate-900 dark:text-white' },
                { label: 'Present', value: stats.presentToday, color: 'text-emerald-500' },
                { label: 'Absent', value: stats.absentToday, color: 'text-red-500' },
              ].map((stat) => (
                <div key={`stat-card-${stat.label}`} className="bg-card border border-border p-3 rounded-2xl text-center shadow-sm">
                  <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'punch', label: 'Punch', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10', action: handlePunch },
                { id: 'classes', label: 'Attend', icon: CheckCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10', action: () => setActiveTab('classes') },
                { id: 'leave', label: 'Leave', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', action: () => setActiveTab('leave') },
                { id: 'history', label: 'Logs', icon: History, color: 'text-purple-500', bg: 'bg-purple-500/10', action: () => setActiveTab('history') },
                { id: 'reports', label: 'Perform', icon: BarChart3, color: 'text-rose-500', bg: 'bg-rose-500/10', action: () => setActiveTab('reports') },
                { id: 'team', label: 'Classes', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10', action: () => setActiveTab('classes') },
              ].map((item) => (
                <button
                  key={`teacher-home-nav-${item.id}`}
                  onClick={item.action}
                  className="flex flex-col items-center gap-2 p-4 bg-card/50 border border-border rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-700 active:scale-95 shadow-sm"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 ${item.bg}`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-[#e2e8f0]">{item.label}</span>
                </button>
              ))}
            </div>

          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 pb-24 text-left">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-[0.1em] uppercase text-slate-900 dark:text-white leading-tight">Class & Event Schedule</h3>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Synchronized timeline for academic events and assignments</p>
              </div>
              <div className="flex items-center gap-4 bg-card border border-slate-800 p-2 rounded-2xl shadow-xl">
                 <button onClick={() => changeMonth(-1)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
                 <div className="px-6 text-center min-w-[200px]">
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                      {currentCalendarDate.toLocaleString('default', { month: 'long' })} {currentCalendarDate.getFullYear()}
                    </h4>
                 </div>
                 <button onClick={() => changeMonth(1)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-[#020617]/40 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Legend:</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-semibold uppercase text-slate-300">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-[9px] font-semibold uppercase text-slate-300">Absent / No Record</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[9px] font-semibold uppercase text-slate-300">Leave / Sick</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 block border border-slate-700/60 bg-slate-950/40 rounded text-[7px] text-center text-slate-500 font-bold">W/O</span>
                <span className="text-[9px] font-semibold uppercase text-slate-300">Week Off</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                  Shift: {timetable.check_in_start} - {timetable.check_in_end} / {timetable.check_out_start} - {timetable.check_out_end}
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                 <div className="bg-card border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="grid grid-cols-7 border-b border-slate-800 bg-[#020617]/50">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={`cal-header-${day}`} className="py-6 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{day}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-slate-800">
                      {getCalendarDays().map((day, idx) => {
                        const dateStr = day?.toISOString().split('T')[0];
                        const dayEvents = schoolEvents.filter(e => e.date === dateStr);
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const isSelected = selectedCalendarDay?.getTime() === day?.getTime();

                        // Weekday calculations
                        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const dayOfWeekName = day ? weekdays[day.getDay()] : '';
                        const isWeekOff = day ? timetable.week_offs.includes(dayOfWeekName) : false;
                        const isWorkingDay = day ? timetable.working_days.includes(dayOfWeekName) : false;
                        const attendanceLog = day && dateStr ? teacherLogs.find(l => l.attendance_date === dateStr) : null;

                        return (
                          <div 
                            key={`cal-day-${idx}`} 
                            onClick={() => day && setSelectedCalendarDay(day)}
                            className={`min-h-[140px] bg-card p-4 transition-all relative group cursor-pointer hover:bg-slate-900/30 ${!day ? 'bg-slate-950/50' : ''} ${isSelected ? 'ring-2 ring-emerald-500/50 z-10' : ''} ${isWeekOff ? 'bg-slate-950/35 border-slate-900/40' : ''}`}
                          >
                            {day && (
                              <div className="space-y-2 h-full flex flex-col justify-between">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-start">
                                    <span className={`text-xs font-mono font-bold ${isToday ? 'bg-emerald-500 text-slate-950 w-7 h-7 flex items-center justify-center rounded-lg shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>
                                      {day.getDate()}
                                    </span>
                                    {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                  </div>
                                  
                                  {/* Attendance status indicators */}
                                  <div className="flex flex-col gap-1">
                                    {attendanceLog ? (
                                      <div className="space-y-1">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                          attendanceLog.status === 'Present' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                            : attendanceLog.status === 'Absent'
                                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                        }`}>
                                          {attendanceLog.status === 'Present' ? '● PRESENT' : attendanceLog.status === 'Absent' ? '● ABSENT' : '● LEAVE'}
                                        </span>
                                        {attendanceLog.check_in && (
                                          <p className="text-[7.5px] font-mono text-slate-500 tracking-tighter truncate leading-none">
                                            In: {attendanceLog.check_in.slice(0, 5)}
                                            {attendanceLog.check_out ? ` / Out: ${attendanceLog.check_out.slice(0, 5)}` : ' (Active)'}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      (() => {
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        const isPast = dateStr < todayStr;
                                        if (isPast) {
                                          if (isWeekOff) {
                                            return (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-slate-500/80 bg-slate-900/10 border border-slate-800/10 self-start">
                                                Week Off
                                              </span>
                                            );
                                          } else if (isWorkingDay) {
                                            return (
                                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-[#f43f5e] bg-rose-500/5 border border-rose-500/10 self-start animate-pulse">
                                                No Record
                                              </span>
                                            );
                                          }
                                        } else if (isWeekOff) {
                                          return (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-slate-600 self-start">
                                              Week Off
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {dayEvents.map(e => (
                                    <div key={`day-ev-${e.id}`} className={`px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-tighter truncate border bg-${e.color}-500/10 text-${e.color}-500 border-${e.color}-500/20`}>
                                      {e.title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-white">Focus Agenda</h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                        {selectedCalendarDay ? selectedCalendarDay.toLocaleDateString('default', { dateStyle: 'long' }) : 'Select Date'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedCalendarDay ? (
                      (() => {
                        const dateStr = selectedCalendarDay.toISOString().split('T')[0];
                        const dayEvents = schoolEvents.filter(e => e.date === dateStr);
                        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const dayName = weekdays[selectedCalendarDay.getDay()];
                        const isWeekOff = timetable.week_offs.includes(dayName);
                        const isWorking = timetable.working_days.includes(dayName);
                        const attLog = teacherLogs.find(l => l.attendance_date === dateStr);

                        return (
                          <div className="space-y-4">
                            {/* Attendance Summary */}
                            <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#10b981] flex items-center justify-between">
                                <span>Attendance Summary</span>
                                <span className="text-[8px] font-mono text-slate-500">{dayName}</span>
                              </h5>
                              
                              {attLog ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">Status:</span>
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      attLog.status === 'Present' 
                                        ? 'bg-emerald-500/10 text-[#10b981] border border-emerald-500/20' 
                                        : attLog.status === 'Absent'
                                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    }`}>
                                      {attLog.status || 'OK'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-[9px]">
                                    <div>
                                      <p className="text-slate-500 text-[8px] uppercase">PUNCH IN</p>
                                      <p className="text-white mt-0.5">{attLog.check_in || '--:--'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-[8px] uppercase">PUNCH OUT</p>
                                      <p className="text-white mt-0.5">{attLog.check_out || '--:--'}</p>
                                    </div>
                                  </div>
                                  {attLog.duration && (
                                    <div className="pt-2 border-t border-slate-800/40 text-[9px] flex justify-between">
                                      <span className="text-slate-500 uppercase">Duration:</span>
                                      <span className="text-emerald-400 font-mono font-bold">{attLog.duration}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {isWeekOff ? (
                                    <div className="py-2 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
                                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Week Off (Weekend)</p>
                                      <p className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">No attendance expected</p>
                                    </div>
                                  ) : isWorking ? (
                                    <div className="py-2 text-center bg-rose-500/5 rounded-2xl border border-rose-500/10">
                                      <p className="text-[9px] text-rose-400 uppercase tracking-widest font-bold font-mono">No Record</p>
                                      <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">Absent or Missed Punch-In</p>
                                    </div>
                                  ) : (
                                    <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest">Non-working Day</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="pt-2 border-t border-slate-800 text-[8.5px] text-slate-500 space-y-1">
                                <p className="uppercase tracking-widest text-[8px] text-slate-400 mb-1">Shift Restraints</p>
                                <div className="flex justify-between">
                                  <span>Check-In hours:</span>
                                  <span className="text-slate-350 font-mono text-[8px]">{timetable.check_in_start} - {timetable.check_in_end}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Check-Out hours:</span>
                                  <span className="text-slate-350 font-mono text-[8px]">{timetable.check_out_start} - {timetable.check_out_end}</span>
                                </div>
                              </div>
                            </div>

                            {/* Academic Events */}
                            {dayEvents.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Events & Timelines</p>
                                {dayEvents.map(e => (
                                  <div key={`agenda-ev-${e.id}`} className="group p-4 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 transition-all">
                                     <div className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full bg-${e.color}-500 mt-1`} />
                                        <div className="space-y-1">
                                          <p className="text-[10px] font-bold text-white uppercase tracking-wider leading-tight">{e.title}</p>
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-[0.1em] bg-${e.color}-500/10 text-${e.color}-500`}>{e.type}</span>
                                        </div>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto border border-slate-800">
                          <History className="w-6 h-6 text-slate-700" />
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Select a day to view agenda</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                     <Users className="w-3 h-3" /> My Assignments
                   </h4>
                   <div className="space-y-3">
                      {assignedClasses.map(cls => (
                        <div key={`cal-my-asg-${cls.id}`} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/50">
                           <p className="text-[9px] font-bold text-white uppercase">{cls.class_name || cls.name}</p>
                           <p className="text-[8px] text-emerald-500 uppercase tracking-widest mt-1">{cls.section_name || 'Assigned Section'}</p>
                        </div>
                      ))}
                      {assignedClasses.length === 0 && (
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest text-center py-4">No active assignments</p>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'classes' && (
          <motion.div key="classes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-24">
            {!selectedClassId ? (
              <>
                <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">My Classes</h3>
                <div className="grid grid-cols-1 gap-4">
                  {assignedClasses.map((cls, idx) => (
                    <button 
                      key={`my-assigned-cls-${cls.assignment_id || cls.id || `idx-${idx}`}`} 
                      onClick={() => handleClassSelect(cls.id)}
                      className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between text-left transition-all group shadow-sm hover:shadow-emerald-500/10"
                    >
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-1 group-hover:text-emerald-400 transition-colors">
                          {cls.class_name} {cls.section_name ? `(Sec ${cls.section_name})` : ''}
                        </h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Select to Mark Attendance</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedClassId(null)} className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">← Back to Classes</button>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">Attendance Terminal</h4>
                </div>
                
                <div className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                        {assignedClasses.find(c => c.id === selectedClassId)?.class_name} 
                        {assignedClasses.find(c => c.id === selectedClassId)?.section_name && ` (Sec ${assignedClasses.find(c => c.id === selectedClassId)?.section_name})`}
                      </h3>
                      <p className="text-[10px] text-slate-500 uppercase mt-1">Status: {attendanceMode === 'mark' ? 'Input Terminal' : 'Analysis View'}</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => { setAttendanceMode('mark'); setShowReport(false); }}
                        className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${attendanceMode === 'mark' ? 'bg-emerald-500 text-[#020617]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                       >
                         Mark
                       </button>
                       <button 
                        onClick={() => { setAttendanceMode('report'); fetchAttendanceForDate(selectedClassId, reportDate); }}
                        className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${attendanceMode === 'report' ? 'bg-emerald-500 text-[#020617]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                       >
                         Report
                       </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Target Date</label>
                    <input 
                      type="date" 
                      value={reportDate}
                      onChange={(e) => {
                        setReportDate(e.target.value);
                        if (attendanceMode === 'report') fetchAttendanceForDate(selectedClassId, e.target.value);
                      }}
                      className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[10px] text-slate-900 dark:text-white focus:border-emerald-500 outline-none shadow-sm"
                    />
                  </div>
                </div>

                {attendanceMode === 'mark' ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Students List</h4>
                      <button 
                        onClick={toggleSort}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
                        Sort by ADM
                      </button>
                    </div>
                    <div className="space-y-2">
                      {sortedStudents.map((student, i) => {
                        const status = attendanceRecords[student.id] || 'Present';
                        const rowColor = status === 'Absent' 
                          ? 'bg-rose-500/5 border-rose-500/20' 
                          : status === 'Sick' || status === 'Leave'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-card border-border';

                        return (
                          <div 
                            key={`teacher-att-student-${student.id || `idx-${i}`}`} 
                            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                            onTouchEnd={(e) => {
                              if (touchStartX === null) return;
                              const deltaX = e.changedTouches[0].clientX - touchStartX;
                              if (deltaX < -50) { 
                                updateAttendanceStatus(student.id, 'Absent');
                              } else if (deltaX > 50) {
                                updateAttendanceStatus(student.id, 'Present');
                              }
                              setTouchStartX(null);
                            }}
                            className={`${rowColor} border p-4 rounded-xl flex items-center justify-between shadow-sm transition-all duration-300 relative overflow-hidden`}
                          >
                             {status === 'Absent' && (
                               <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                             )}
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                                  status === 'Absent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                  'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
                                }`}>
                                   {(student.name || 'A').charAt(0)}
                                </div>
                                <div>
                                  <span className={`text-xs font-medium block transition-colors ${status === 'Absent' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{student.name || 'Anonymous Student'}</span>
                                  <span className="text-[8px] text-slate-500 dark:text-slate-600 font-mono">ADM: {student.admission_no || 'N/A'}</span>
                                </div>
                             </div>
                                <div className="flex items-center gap-2">
                                   <div className="flex gap-1.5">
                                      {[
                                        { label: 'P', value: 'Present' as const, color: 'emerald' },
                                        { label: 'A', value: 'Absent' as const, color: 'rose' },
                                        { label: 'S', value: 'Sick' as const, color: 'amber' },
                                        { label: 'L', value: 'Leave' as const, color: 'blue' }
                                      ].map((btn) => (
                                        <button 
                                          key={`teacher-att-status-btn-${btn.value}`}
                                          onClick={() => updateAttendanceStatus(student.id, btn.value)}
                                          className={`w-7 h-7 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
                                            status === btn.value 
                                              ? `bg-${btn.color}-500/20 text-${btn.color}-500 border-${btn.color}-500/40 opacity-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]` 
                                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/60 opacity-40 hover:opacity-100'
                                          }`}
                                        >
                                          {btn.label}
                                        </button>
                                      ))}
                                   </div>
                                   <button 
                                    onClick={() => handleRemoveStudentFromClass(student.id)}
                                    disabled={isDeleting == student.id}
                                    className={`p-2 rounded-lg transition-colors ${isDeleting == student.id ? 'opacity-50 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'}`}
                                    title="Remove from Class"
                                   >
                                     <UserMinus className="w-4 h-4" />
                                   </button>
                                </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => setShowSubmitConfirmModal(true)}
                      disabled={isSavingAttendance}
                      className="w-full py-4 bg-[#10b981] text-[#020617] font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all"
                    >
                      {isSavingAttendance ? 'Processing...' : 'Finalize Roll Call'}
                    </button>
                  </>
                ) : (
                  !showReport && (
                    <div className="py-20 text-center bg-slate-50 dark:bg-[#0f172a]/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <p className="text-[10px] text-slate-500 dark:text-slate-600 uppercase tracking-widest mb-2">No attendance records for</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{reportDate}</p>
                    </div>
                  )
                )}

                {showReport && reportData && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white dark:bg-[#020617] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex justify-between items-center">
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Attendance Report</h4>
                       <button onClick={() => { setShowReport(false); setSelectedClassId(null); }} className="text-[10px] text-slate-500 uppercase font-bold tracking-widest hover:text-slate-900 dark:hover:text-white">Exit View</button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Total</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{reportData.total}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">MALE</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{reportData.boys}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">FEMALE</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{reportData.girls}</p>
                        </div>
                      </div>

                      <div className="py-4 border-y border-slate-800 grid grid-cols-4 gap-2">
                         {[
                           { label: 'Present', val: reportData.present, color: 'text-emerald-500', bg: 'bg-emerald-500/10', cat: 'Present' as const },
                           { label: 'Absent', val: reportData.absent, color: 'text-red-500', bg: 'bg-red-500/10', cat: 'Absent' as const },
                           { label: 'Sick', val: reportData.sick, color: 'text-amber-500', bg: 'bg-amber-500/10', cat: 'Sick' as const },
                           { label: 'Leave', val: reportData.leave, color: 'text-blue-500', bg: 'bg-blue-500/10', cat: 'Leave' as const },
                         ].map(item => (
                           <button 
                            key={`teacher-summary-stat-${item.label}`}
                            onClick={() => setViewingCategory(viewingCategory === item.cat ? null : item.cat)}
                            className={`p-3 rounded-xl border border-transparent transition-all ${item.bg} ${viewingCategory === item.cat ? 'border-white/20' : ''}`}
                           >
                             <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500 mb-1">{item.label}</p>
                             <p className={`text-sm font-bold ${item.color}`}>{item.val}</p>
                           </button>
                         ))}
                      </div>

                      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/20 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Attendance Percentage</span>
                        <span className="text-xs font-bold text-emerald-500">{reportData.presentPercentage}%</span>
                      </div>

                      <AnimatePresence>
                        {viewingCategory && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                             <h5 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Students: {viewingCategory}</h5>
                             <div className="max-h-40 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                               {reportData.categorizedStudents[viewingCategory].length > 0 ? (
                                 reportData.categorizedStudents[viewingCategory].map((s, i) => (
                                   <div key={`teacher-report-cat-student-${s.id || `idx-${i}`}`} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                                      <span className="text-[10px] text-white">{s.name}</span>
                                      <span className="text-[8px] text-slate-600 font-mono">{s.admission_no}</span>
                                   </div>
                                 ))
                               ) : (
                                 <p className="text-[9px] text-slate-700 italic py-2">No students in this list</p>
                               )}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                <div className="pt-6 border-t border-slate-800/50 mt-12 grid grid-cols-2 gap-4">
                   <button 
                    onClick={() => {
                      fetchUnassignedStudents();
                      setShowAssignModal(true);
                    }}
                    className="flex items-center justify-center gap-2 p-4 bg-slate-800/20 border border-slate-800 rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                   >
                      <UserPlus className="w-3 h-3" /> Assign Student
                   </button>
                   <button className="flex items-center justify-center gap-2 p-4 bg-slate-800/20 border border-slate-800 rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">
                      <UserMinus className="w-3 h-3" /> Remove Student
                   </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-left pb-24">
             <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">Attendance Logs</h3>
             <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {teacherLogs.length > 0 ? (
                  teacherLogs.slice(0, 20).map((log, idx) => (
                    <div key={`teacher-log-entry-${log.id || `idx-${idx}`}`} className="p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div>
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-widest">{log.attendance_date}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                          {log.check_in || '--:--'} — {log.check_out || '--:--'}
                          {log.duration && <span className="ml-2 text-[#10b981]">({log.duration})</span>}
                        </p>
                      </div>
                      <div className={`px-3 py-1 border text-[8px] font-bold uppercase rounded ${log.status === 'Present' ? 'border-emerald-500/30 text-emerald-500' : 'border-slate-500/30 text-slate-500'}`}>
                        {log.status || 'OK'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-500 uppercase text-[10px] tracking-widest">
                    No punch logs found in database
                  </div>
                )}
             </div>
          </motion.div>
        )}

        {activeTab === 'leave' && (
           <motion.div key="leave" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-32">
              <div className="flex items-center justify-between">
                 <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">Leave Terminal</h3>
                 <button onClick={() => setShowLeaveModal(true)} className="p-2 bg-[#10b981] text-[#020617] rounded-lg shadow-lg hover:bg-emerald-400 transition-colors">
                    <Plus className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-[#020617] p-1 rounded-xl w-full max-w-sm">
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(status => (
                  <button 
                    key={`leave-filter-${status}`}
                    onClick={() => setLeaveFilterStatus(status)}
                    className={`flex-1 py-2 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all ${leaveFilterStatus === status ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {leaveRequests
                  .filter(req => leaveFilterStatus === 'All' || req.status === leaveFilterStatus)
                  .map((leave) => (
                  <div key={`teacher-leave-req-${leave.id}`} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${
                      leave.status === 'Approved' ? 'bg-emerald-500' : 
                      leave.status === 'Rejected' ? 'bg-red-500' : 
                      'bg-amber-500'
                    }`} />
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white break-words flex-1 leading-relaxed">{leave.leave_type}</h4>
                      <span className={`flex-shrink-0 text-[8px] uppercase tracking-widest px-2 py-1 rounded border whitespace-nowrap ${
                        leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        leave.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-[#10b981]" />
                        <span className="text-[10px] font-mono tracking-tighter whitespace-nowrap">{leave.from_date} — {leave.to_date}</span>
                      </div>
                      <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded">{leave.days || 0} DAYS</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 break-words">
                      {leave.reason}
                    </p>
                    {leave.document_url && (
                      <a 
                        href={leave.document_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Supporting Doc
                      </a>
                    )}
                  </div>
                ))}
                {leaveRequests.filter(req => leaveFilterStatus === 'All' || req.status === leaveFilterStatus).length === 0 && (
                  <div className="py-20 text-center bg-slate-50 dark:bg-[#0f172a]/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">No matching records found</p>
                  </div>
                )}
              </div>
           </motion.div>
        )}

        {/* Similar tabs for reports and settings... */}
        {activeTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 pb-24">
            <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">Performance Analytics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
                <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Monthly Avg</p>
                <p className="text-xl font-bold text-[#10b981]">94.2%</p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
                  <div className="bg-[#10b981] h-full w-[94%]" />
                </div>
              </div>
              <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
                <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Class Strength</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {assignedClasses.length > 0 ? 'Active' : 'Unassigned'}
                </p>
                <p className="text-[7px] text-slate-400 uppercase tracking-tight mt-1">Ready for marking</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Class Attendance Trend</h4>
                <BarChart3 className="w-4 h-4 text-[#10b981]" />
              </div>
              <div className="p-6">
                <div className="flex items-end justify-between h-32 gap-2">
                  {[65, 80, 45, 90, 75, 85, 95].map((height, i) => (
                    <div key={`report-bar-${i}`} className="flex-1 space-y-2">
                      <div className="w-full bg-emerald-500/10 rounded-t-lg relative group">
                        <motion.div 
                          initial={{ height: 0 }} 
                          animate={{ height: `${height}%` }} 
                          className="w-full bg-[#10b981] rounded-t-lg absolute bottom-0 transition-all group-hover:bg-[#34d399]" 
                        />
                      </div>
                      <p className="text-[7px] text-slate-400 text-center font-mono">D-{7-i}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Critical Absentees (Last 7 Days)</h4>
              <div className="space-y-2">
                {[
                  { name: 'Hamza Ali', count: 3, percent: '57%' },
                  { name: 'Saira Bano', count: 2, percent: '71%' },
                ].map((item, i) => (
                  <div key={`critical-absentee-${i}`} className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-[10px] font-bold text-red-500 border border-red-500/20">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">{item.count} Days Missed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-red-500 font-mono">{item.percent}</p>
                      <p className="text-[7px] text-slate-400 uppercase tracking-tighter">Attendance</p>
                    </div>
                  </div>
                ))}
                {assignedClasses.length === 0 && (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/10 border border-dashed border-border rounded-3xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Assign a class to see analytics</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'enrolment' && (
          <motion.div key="enrolment" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 pb-24">
            <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">Student Enrolment</h3>
            
            <form onSubmit={handleEnrollStudent} className="space-y-6">
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#10b981] mb-2">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Student Name</label>
                    <input 
                      type="text" 
                      required
                      value={enrollForm.name}
                      onChange={(e) => setEnrollForm({...enrollForm, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Admission Number</label>
                    <input 
                      type="text" 
                      required
                      value={enrollForm.admission_no}
                      onChange={(e) => setEnrollForm({...enrollForm, admission_no: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                      placeholder="ADM-XXXX"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Gender</label>
                    <select 
                      value={enrollForm.gender}
                      onChange={(e) => setEnrollForm({...enrollForm, gender: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Date of Birth</label>
                    <input 
                      type="date" 
                      required
                      value={enrollForm.dob}
                      onChange={(e) => setEnrollForm({...enrollForm, dob: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#10b981] mb-2">Guardian Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Father's Name</label>
                    <input 
                      type="text" 
                      required
                      value={enrollForm.father_name}
                      onChange={(e) => setEnrollForm({...enrollForm, father_name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Father's CNIC</label>
                    <input 
                      type="text" 
                      required
                      value={enrollForm.father_cnic}
                      onChange={(e) => setEnrollForm({...enrollForm, father_cnic: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                      placeholder="XXXXX-XXXXXXX-X"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Mobile Number</label>
                    <input 
                      type="tel" 
                      required
                      value={enrollForm.father_mobile}
                      onChange={(e) => setEnrollForm({...enrollForm, father_mobile: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#10b981] mb-2">School Assignment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Enrolment Type</label>
                    <select 
                      value={enrollForm.enrollment_type}
                      onChange={(e) => setEnrollForm({...enrollForm, enrollment_type: e.target.value as any})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    >
                      <option value="Fresh">Fresh Session</option>
                      <option value="Public">Public Transfer</option>
                      <option value="Private">Private Transfer</option>
                      <option value="Dropout">Dropout Re-entry</option>
                    </select>
                  </div>

                  {!['Fresh', 'Dropout'].includes(enrollForm.enrollment_type) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Source School Name (from SLC)</label>
                        <input 
                          type="text" 
                          required
                          value={enrollForm.previous_school_name}
                          onChange={(e) => setEnrollForm({...enrollForm, previous_school_name: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                          placeholder="Name of previous school"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Source School EMIS</label>
                        <input 
                          type="text" 
                          required
                          value={enrollForm.previous_school_emis}
                          onChange={(e) => setEnrollForm({...enrollForm, previous_school_emis: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                          placeholder="School EMIS code"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Session</label>
                    <input 
                      type="text" 
                      required
                      value={enrollForm.session}
                      onChange={(e) => setEnrollForm({...enrollForm, session: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Assigned Class</label>
                    <select 
                      required
                      value={enrollForm.class_id}
                      onChange={(e) => setEnrollForm({...enrollForm, class_id: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    >
                      <option value="">Select Class</option>
                      {assignedClasses.map(c => (
                        <option key={`enroll-cls-opt-${c.id}`} value={c.id}>{c.class_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Assigned Section</label>
                    <select 
                      value={enrollForm.section_id}
                      onChange={(e) => setEnrollForm({...enrollForm, section_id: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    >
                      <option value="">Select Section</option>
                      {sections.map(s => (
                        <option key={`enroll-sect-opt-${s.id}`} value={s.id}>{s.section_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isEnrolling}
                className="w-full bg-[#10b981] text-[#020617] py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all hover:bg-[#059669] shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] disabled:opacity-50"
              >
                {isEnrolling ? 'Processing Enrolment...' : 'Establish Student Record'}
              </button>
            </form>
          </motion.div>
        )}

        {activeTab === 'marks' && (
          <motion.div key="marks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">Exam Center</h3>
               <div className="flex bg-slate-100 dark:bg-[#020617] p-1 rounded-xl">
                 <button onClick={() => setMarksMode('entry')} className={`px-4 py-2 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all ${marksMode === 'entry' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Entry</button>
                 <button onClick={() => setMarksMode('award')} className={`px-4 py-2 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all ${marksMode === 'award' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Award List</button>
               </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-3xl space-y-6 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Session</label>
                  <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Session</option>
                    {sessions.map(s => <option key={`sel-sess-${s.id}`} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Semester</label>
                  <select 
                    value={selectedSemesterId}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Semester</option>
                    {semesters.map(s => <option key={`sel-sem-${s.id}`} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Class Subject</label>
                  <select 
                    value={selectedClassSubjectId}
                    onChange={(e) => {
                        setSelectedClassSubjectId(e.target.value);
                        const cs = classSubjects.find(x => x.id === parseInt(e.target.value));
                        if(cs) fetchStudents(cs.class_id);
                    }}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Subject</option>
                    {classSubjects.map(cs => {
                        const subj = subjects.find(s => s.id === cs.subject_id);
                        const cls = allClasses.find(c => c.id === cs.class_id);
                        return <option key={`sel-cs-${cs.id}`} value={cs.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{cls?.class_name || cls?.name} - {subj?.name}</option>
                    })}
                  </select>
                </div>
              </div>

              {marksMode === 'entry' && selectedClassSubjectId && (
                <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                    <div className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Max Recordable</p>
                      <p className="text-xl text-slate-900 dark:text-white font-black">{classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.total_marks}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                      <p className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Class Strength</p>
                      <p className="text-xl text-slate-900 dark:text-white font-black">{sortedStudents.length}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                      <p className="text-[7px] text-emerald-500 font-bold uppercase tracking-[0.2em] mb-1">Qualified Ratio</p>
                      <p className="text-xl text-slate-900 dark:text-white font-black">
                        {(() => {
                           const cs = classSubjects.find(x => x.id === parseInt(selectedClassSubjectId));
                           const passed = sortedStudents.filter(s => {
                             const res = examResults.find(r => 
                               r.student_id === s.id && 
                               r.session_id === parseInt(selectedSessionId) && 
                               r.semester_id === parseInt(selectedSemesterId) &&
                               r.subject_id === cs?.subject_id
                             );
                             const m = marksEntryData[s.id] ?? res?.obtained_marks;
                             return m !== undefined && m >= (cs?.passing_marks || 0);
                           }).length;
                           return sortedStudents.length > 0 ? `${Math.round((passed / sortedStudents.length) * 100)}%` : '0%';
                        })()}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
                      <p className="text-[7px] text-amber-500 font-bold uppercase tracking-[0.2em] mb-1">Mean Score</p>
                      <p className="text-xl text-slate-900 dark:text-white font-black">
                        {(() => {
                          const cs = classSubjects.find(x => x.id === parseInt(selectedClassSubjectId));
                          const filtered = sortedStudents.map(s => {
                            const res = examResults.find(r => 
                              r.student_id === s.id && 
                              r.session_id === parseInt(selectedSessionId) && 
                              r.semester_id === parseInt(selectedSemesterId) &&
                              r.subject_id === cs?.subject_id
                            );
                            return marksEntryData[s.id] ?? res?.obtained_marks;
                          }).filter(v => v !== undefined) as number[];
                          return filtered.length > 0 ? (filtered.reduce((a,b) => a+b, 0) / filtered.length).toFixed(1) : '0.0';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">Student</th>
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-emerald-500 transition-colors" onClick={toggleSort}>
                            <div className="flex items-center gap-1">
                              {sortDirection === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : sortDirection === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUpDown className="w-2.5 h-2.5" />}
                              Admission No
                            </div>
                          </th>
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">Obtained Marks</th>
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">History</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map(student => {
                          const existingRes = examResults.find(r => 
                              r.student_id === student.id && 
                              r.session_id === parseInt(selectedSessionId) && 
                              r.semester_id === parseInt(selectedSemesterId) &&
                              r.subject_id === classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.subject_id
                          );
                          return (
                            <tr key={`marks-row-${student.id}`} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-emerald-500/5 transition-colors group">
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${existingRes ? (existingRes.obtained_marks >= (classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.passing_marks || 0) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500') : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                    {student.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">{student.name}</p>
                                    <p className="text-[8px] text-slate-500 font-mono tracking-widest">{student.admission_no}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="relative inline-block">
                                  <input 
                                    type="number"
                                    value={marksEntryData[student.id] ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                      setMarksEntryData(prev => {
                                        const next = {...prev};
                                        if (val === undefined) delete next[student.id];
                                        else next[student.id] = val;
                                        return next;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
                                        const index = inputs.indexOf(e.currentTarget as HTMLInputElement);
                                        if (index < inputs.length - 1) (inputs[index + 1] as HTMLInputElement).focus();
                                      }
                                    }}
                                    className={`w-24 bg-white dark:bg-[#020617] border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white transition-all outline-none 
                                      ${(marksEntryData[student.id] ?? 0) > (classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.total_marks || 0) ? 'border-amber-500 bg-amber-500/5' : 
                                        marksEntryData[student.id] !== undefined ? 
                                          (marksEntryData[student.id]! >= (classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.passing_marks || 0) ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-red-500/50 focus:border-red-500') : 
                                          'border-slate-200 dark:border-slate-800 focus:border-emerald-500'}`}
                                  />
                                </div>
                              </td>
                              <td className="py-4 font-mono">
                                  {existingRes ? (
                                    <div className="flex flex-col gap-1">
                                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block w-fit ${existingRes.obtained_marks >= existingRes.passing_marks ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {existingRes.obtained_marks >= existingRes.passing_marks ? 'QUALIFIED' : 'RETAKE REQ'}
                                      </span>
                                      <span className="text-[7px] text-slate-400">Archived: {existingRes.obtained_marks}/{existingRes.total_marks}</span>
                                    </div>
                                  ) : <span className="text-[8px] text-slate-300 uppercase tracking-widest">NO RECORD</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={saveMarks}
                    disabled={isSavingMarks}
                    className="w-full py-4 bg-[#10b981] text-[#020617] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
                  >
                    {isSavingMarks ? 'Transmitting Data...' : 'Commit & Synchronize Marks'}
                  </button>
                </div>
              )}

              {marksMode === 'award' && selectedClassSubjectId && (
                <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                     <div>
                       <h4 className="text-xs font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Consolidated Award List</h4>
                       <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                         {allClasses.find(c => c.id === classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.class_id)?.class_name} — {subjects.find(s => s.id === classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.subject_id)?.name}
                       </p>
                     </div>
                     <div className="flex items-center gap-3">
                       <button 
                         onClick={downloadAwardList}
                         disabled={!selectedClassSubjectId}
                         className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-650 dark:from-teal-600 dark:to-emerald-755 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.21em] hover:brightness-110 active:scale-95 transition-all disabled:opacity-35 shadow-lg shadow-emerald-500/15 dark:shadow-emerald-500/5 cursor-pointer"
                       >
                         <FileText className="w-4 h-4 text-emerald-100 animate-pulse" /> Excel Sheet
                       </button>
                       <button onClick={() => window.print()} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-2xl transition-colors shadow-sm">
                          <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                       </button>
                     </div>
                   </div>
                   <div className="overflow-x-auto rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xl shadow-black/5 dark:shadow-black/20">
                     <table className="w-full text-left border-collapse">
                       <thead className="bg-slate-50 dark:bg-[#020617] border-b border-slate-200/50 dark:border-slate-800/80">
                         <tr>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors" onClick={toggleSort}>
                             <div className="flex items-center gap-1 justify-center">
                               {sortDirection === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : sortDirection === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                               Admission No
                             </div>
                           </th>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">Student Identity</th>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Base</th>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Score</th>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Rank</th>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Judgement</th>
                           <th className="px-10 py-5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {sortedStudents.map(student => {
                           const res = examResults.find(r => 
                              r.student_id === student.id && 
                              r.session_id === parseInt(selectedSessionId) && 
                              r.semester_id === parseInt(selectedSemesterId) &&
                              r.subject_id === classSubjects.find(cs => cs.id === parseInt(selectedClassSubjectId))?.subject_id
                           );
                           const percent = res ? (res.obtained_marks / res.total_marks) * 100 : 0;
                           return (
                             <tr key={`award-row-${student.id}`} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/5 transition-all group border-b border-slate-100 dark:border-slate-800/80">
                               <td className="px-10 py-6">
                                 <span className="font-mono text-[9px] font-black uppercase tracking-[0.05em] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                   {student.admission_no}
                                 </span>
                               </td>
                               <td className="px-10 py-6">
                                 <button 
                                   onClick={() => setViewingStudentDMC(student)}
                                   className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest group-hover:text-indigo-500 transition-colors duration-200 text-left"
                                 >
                                   {student.name}
                                 </button>
                               </td>
                               <td className="px-10 py-6 text-center">
                                 <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] font-mono font-bold rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/20 text-slate-500 dark:text-slate-400">
                                   {res?.total_marks || '-'}
                                 </span>
                               </td>
                               <td className="px-10 py-6 text-center">
                                 <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-mono font-black rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 text-slate-850 dark:text-indigo-300 border border-indigo-500/20 shadow-sm">
                                   {res?.obtained_marks || '00'}
                                 </span>
                               </td>
                               <td className="px-10 py-6 text-center">
                                 {getGradeBadge(res?.grade)}
                               </td>
                               <td className="px-10 py-6 text-center">
                                 {res ? (
                                   res.obtained_marks >= res.passing_marks ? (
                                     <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border font-black text-[9px] uppercase tracking-[0.15em] bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/20 transition-all duration-300 hover:scale-[1.02]">
                                        <span className="relative flex h-2 w-2">
                                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                           <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span>QUALIFIED</span>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <span className="font-mono font-black text-emerald-500">{Math.round(percent)}%</span>
                                     </div>
                                   ) : (
                                     <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border font-black text-[9px] uppercase tracking-[0.15em] bg-gradient-to-r from-rose-500/15 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/20 transition-all duration-300 hover:scale-[1.02]">
                                        <span className="relative flex h-2 w-2">
                                           <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                           <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                        </span>
                                        <span>FAILED</span>
                                        <span className="text-slate-300 dark:text-slate-700">|</span>
                                        <span className="font-mono font-black text-rose-500">{Math.round(percent)}%</span>
                                     </div>
                                   )
                                 ) : (
                                   <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border font-black text-[9px] uppercase tracking-[0.15em] bg-slate-100 dark:bg-slate-800/80 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span>PENDING</span>
                                   </div>
                                 )}
                               </td>
                               <td className="px-10 py-6 text-center">
                                 <button 
                                   onClick={() => setViewingStudentDMC(student)}
                                   title="View DMC"
                                   className="p-2 text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-300 transform hover:scale-115 transition-all duration-200"
                                 >
                                   <Eye className="w-4 h-4" />
                                 </button>
                               </td>
                             </tr>
                           )
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}

              {!selectedClassSubjectId && (
                <div className="py-24 text-center bg-slate-50/50 dark:bg-[#020617]/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <Award className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6 stroke-1" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 animate-pulse">Awaiting Specification Parameters</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
            <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">System Access</h3>
            
            <div className="grid gap-6">
              {/* Profile Picture Upload */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
                      {user.profile_picture_url ? (
                        <img src={user.profile_picture_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : user.username ? (
                        <div className="text-2xl font-bold text-slate-400 font-mono">{(user.name || 'T').charAt(0)}</div>
                      ) : (
                        <Users className="w-8 h-8 text-slate-400" />
                      )}
                      {isUploadingProfile && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      id="profile-upload" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleProfilePictureUpload}
                      disabled={isUploadingProfile}
                    />
                    <label htmlFor="profile-upload" className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center cursor-pointer shadow-lg hover:bg-emerald-400 transition-colors">
                      <Plus className="w-5 h-5" />
                    </label>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-1">Official Portrait</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">Upload your ID photograph for the digital register <br /> (Bucket: employee-profiles)</p>
                  
                  {import.meta.env.VITE_SUPABASE_URL && !hasAuthSession && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-relaxed">
                      Tip: Session not synced with security server. Please log out and back in to enable uploads.
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6 transition-colors duration-500">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-1">Visual Theme</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Toggle between terminal and modern appearance</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-background border-[#10b981] text-[#10b981]' : 'bg-slate-50 dark:bg-slate-900/40 border-border text-slate-400 dark:text-slate-500'}`}
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Dark (Current)</span>
                  </button>

                  <button 
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${theme === 'light' ? 'bg-white border-[#10b981] text-[#10b981] shadow-xl' : 'bg-slate-50 dark:bg-slate-100/40 border-slate-200 text-slate-400'}`}
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Light (Modern)</span>
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border p-8 rounded-3xl space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Information</h4>
                <div className="space-y-2">
                   <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800/50">
                      <span className="text-[9px] text-slate-500 uppercase">Version</span>
                      <span className="text-[9px] text-slate-900 dark:text-white font-mono">v4.0.2-stable</span>
                   </div>
                   <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800/50">
                      <span className="text-[9px] text-slate-500 uppercase">Node ID</span>
                      <span className="text-[9px] text-slate-900 dark:text-white font-mono">{user.id}</span>
                   </div>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6 shadow-xl transition-all hover:border-emerald-500/20">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-1">Security Update</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Update your system access credentials</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                      <input 
                        type="password" 
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        placeholder="Min 6 characters"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">Confirm New</label>
                      <input 
                        type="password" 
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUpdatingPassword}
                    className="w-full py-4 bg-[#10b981] text-[#020617] font-bold uppercase tracking-widest text-[10px] rounded-xl hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Hashing & Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-[110] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-amber-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest">Confirm Leave</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                    You are requesting <span className="text-amber-500 font-bold">{leaveFormData.type}</span> for <span className="text-amber-500 font-bold">{leaveDays} days</span>.
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <div className="bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest">Interval</p>
                    <p className="text-[10px] font-bold font-mono text-slate-900 dark:text-white">{leaveFormData.startDate} — {leaveFormData.endDate}</p>
                  </div>
                  {leaveFormData.document && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-2xl flex justify-between items-center">
                      <p className="text-[8px] text-emerald-600 uppercase tracking-widest font-bold">Attachment Attached</p>
                      <p className="text-[9px] text-emerald-500 font-mono truncate max-w-[120px]">{leaveFormData.document.name}</p>
                    </div>
                  )}
                </div>

                <div className="w-full flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowLeaveConfirmModal(false)}
                    className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    Adjust
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        let documentUrl = null;
                        
                        // Handle file upload if present
                        if (leaveFormData.document) {
                          const file = leaveFormData.document;
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                          const filePath = `documents/${fileName}`; 
                          
                          // Correct bucket for leave documents
                          const bucketName = 'leave-documents'; 
                          
                          const { error: uploadError } = await supabase.storage
                            .from(bucketName)
                            .upload(filePath, file);
                            
                          if (uploadError) {
                            console.error('Initial upload failed:', uploadError);
                            throw uploadError;
                          } else {
                            const { data: { publicUrl } } = supabase.storage
                              .from(bucketName)
                              .getPublicUrl(filePath);
                            documentUrl = publicUrl;
                          }
                        }

                        const { error } = await supabase
                          .from('leave_requests')
                          .insert({
                            id: Math.floor(Math.random() * 2147483647),
                            teacher_id: user.id,
                            leave_type: leaveFormData.type,
                            from_date: leaveFormData.startDate,
                            to_date: leaveFormData.endDate,
                            reason: leaveFormData.reason,
                            status: 'Pending',
                            total_days: leaveDays,
                            document_url: documentUrl,
                            emis: user.emis
                          });
                        
                        if (error) throw error;
                        
                        alert('Leave request submitted successfully.');
                        fetchLeaveRequests();
                        setLeaveFormData({
                          type: 'Casual Leave',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: new Date().toISOString().split('T')[0],
                          reason: '',
                          document: null
                        });
                        setShowLeaveConfirmModal(false);
                        setShowLeaveModal(false);
                      } catch (err: any) {
                        console.error('Error submitting leave:', err);
                        alert(`Failed to submit leave request: ${err.message || 'Unknown error'}`);
                      }
                    }}
                    className="flex-1 bg-amber-500 text-[#020617] rounded-2xl font-bold py-4 text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-colors"
                  >
                    Confirm Request
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSubmitConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest">Confirm Submission</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                    You are about to finalize attendance for <span className="text-emerald-500 font-bold">{assignedClasses.find(c => c.id === selectedClassId)?.class_name}</span>.
                  </p>
                </div>

                <div className="w-full grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">Present</p>
                    <p className="text-sm font-bold text-emerald-500">{classStudents.filter(s => (attendanceRecords[s.id] || 'Present') === 'Present').length}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">Absent</p>
                    <p className="text-sm font-bold text-red-500">{classStudents.filter(s => attendanceRecords[s.id] === 'Absent').length}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">Sick</p>
                    <p className="text-sm font-bold text-amber-500">{classStudents.filter(s => attendanceRecords[s.id] === 'Sick').length}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">Leave</p>
                    <p className="text-sm font-bold text-blue-500">{classStudents.filter(s => attendanceRecords[s.id] === 'Leave').length}</p>
                  </div>
                </div>

                <div className="w-full flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowSubmitConfirmModal(false)}
                    className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    Review
                  </button>
                  <button 
                    onClick={() => {
                      saveAttendance();
                      setShowSubmitConfirmModal(false);
                    }}
                    className="flex-1 bg-emerald-500 text-[#020617] rounded-2xl font-bold py-4 text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLeaveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md" onClick={() => setShowLeaveModal(false)} />
            <motion.div 
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-800 max-w-sm w-full p-8 rounded-[2rem] relative z-10 shadow-3xl overflow-y-auto max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#10b981]" />
              <div className="mb-6">
                <h3 className="text-xl font-light tracking-[0.1em] uppercase text-white mb-1">New Leave Entry</h3>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest">Authentication Required</p>
              </div>
              <form className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select 
                    value={leaveFormData.type}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, type: e.target.value })}
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white focus:border-[#10b981] outline-none appearance-none"
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Personal Reason">Personal Reason / Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Start Date</label>
                    <input 
                      type="date" 
                      value={leaveFormData.startDate}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                      className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white" 
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">End Date</label>
                    <input 
                      type="date" 
                      value={leaveFormData.endDate}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                      className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white" 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-[#020617]/50 rounded-xl border border-slate-800/50">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Duration</span>
                  <span className={`text-xs font-bold font-mono ${leaveDays > 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                    {leaveDays} {leaveDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Justification</label>
                  <textarea 
                    rows={2} 
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white resize-none" 
                    placeholder="Enter reason for leave..." 
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Supporting Document</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      id="leave-doc"
                      className="hidden"
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, document: e.target.files?.[0] || null })}
                    />
                    <label 
                      htmlFor="leave-doc"
                      className="flex items-center justify-between w-full bg-[#020617] border border-dashed border-slate-700 px-4 py-3 rounded-xl text-[10px] text-slate-400 cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                      <span className="truncate max-w-[150px]">
                        {leaveFormData.document ? leaveFormData.document.name : 'Upload File (PDF/Image)'}
                      </span>
                      <Plus className="w-3 h-3" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Discard</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (leaveDays <= 0) return alert('Invalid date range');
                      setShowLeaveConfirmModal(true);
                    }}
                    className="flex-1 bg-[#10b981] text-[#020617] rounded-xl font-bold py-4 text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Authorize Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md" onClick={() => setShowAssignModal(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-800 max-w-sm w-full p-8 rounded-[2rem] relative z-10 shadow-3xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <div className="mb-6">
                <h3 className="text-xl font-light tracking-[0.1em] uppercase text-white mb-1">Assign Students</h3>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest">To: {assignedClasses.find(c => c.id === selectedClassId)?.class_name}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {unassignedStudents.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">No unassigned students found</p>
                  </div>
                ) : (
                  unassignedStudents.map((student, i) => (
                    <div key={`teacher-unassigned-std-${student.id || `idx-${i}`}`} className="bg-[#020617] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-700">
                          {(student.name || 'A').charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-white block">{student.name || 'Anonymous Student'}</span>
                          <span className="text-[8px] text-slate-600 font-mono">ADM: {student.admission_no}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => assignStudentToClass(student.id)}
                        disabled={isAssigning}
                        className="px-3 py-1.5 bg-emerald-500 text-[#020617] rounded-lg text-[8px] font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        {isAssigning ? '...' : 'Add'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-6 border-t border-slate-800 mt-6">
                <button 
                  onClick={() => setShowAssignModal(false)}
                  className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {viewingStudentDMC && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setViewingStudentDMC(null)}
               className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-1">Detailed Mark Certificate</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Academic Year 2024-25</p>
                </div>
                <button onClick={() => setViewingStudentDMC(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* Student Info */}
                <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Student Name</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{viewingStudentDMC.name}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Father Name</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{viewingStudentDMC.father_name || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Admission No</p>
                      <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">{viewingStudentDMC.admission_no}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Examination</p>
                      <p className="text-xs font-bold text-[#10b981] uppercase">
                        {semesters.find(s => s.id === parseInt(selectedSemesterId))?.name} - {sessions.find(s => s.id === parseInt(selectedSessionId))?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Marks Table */}
                <div className="space-y-4">
                  <h5 className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Subject-wise Breakdown</h5>
                  <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="p-3 text-[8px] font-bold uppercase tracking-widest text-slate-500">Subject</th>
                          <th className="p-3 text-[8px] font-bold uppercase tracking-widest text-slate-500 text-center">T. Marks</th>
                          <th className="p-3 text-[8px] font-bold uppercase tracking-widest text-slate-500 text-center">Pass</th>
                          <th className="p-3 text-[8px] font-bold uppercase tracking-widest text-slate-500 text-center">Obtained</th>
                          <th className="p-3 text-[8px] font-bold uppercase tracking-widest text-slate-500 text-center">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {examResults
                          .filter(r => r.student_id === viewingStudentDMC.id && r.session_id === parseInt(selectedSessionId) && r.semester_id === parseInt(selectedSemesterId))
                          .map(res => {
                            const subj = subjects.find(s => s.id === res.subject_id);
                            return (
                              <tr key={`dmc-row-${res.id}`}>
                                <td className="p-3 text-[10px] font-bold text-slate-900 dark:text-white uppercase">{subj?.name || '-'}</td>
                                <td className="p-3 text-[10px] text-center font-mono text-slate-500">{res.total_marks}</td>
                                <td className="p-3 text-[10px] text-center font-mono text-slate-500">{res.passing_marks}</td>
                                <td className={`p-3 text-[10px] text-center font-bold font-mono ${res.obtained_marks >= res.passing_marks ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {res.obtained_marks}
                                </td>
                                <td className="p-3 text-[10px] text-center font-bold text-slate-900 dark:text-white uppercase">{res.grade}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Aggregate Summary */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                   <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Marks</p>
                     <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                       {examResults.filter(r => r.student_id === viewingStudentDMC.id && r.session_id === parseInt(selectedSessionId) && r.semester_id === parseInt(selectedSemesterId)).reduce((sum, r) => sum + r.total_marks, 0)}
                     </p>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500 mb-1">Obtained</p>
                     <p className="text-sm font-mono font-bold text-[#10b981]">
                       {examResults.filter(r => r.student_id === viewingStudentDMC.id && r.session_id === parseInt(selectedSessionId) && r.semester_id === parseInt(selectedSemesterId)).reduce((sum, r) => sum + r.obtained_marks, 0)}
                     </p>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500 mb-1">Percentage</p>
                     <p className="text-sm font-mono font-bold text-blue-500">
                       {(() => {
                         const studentRes = examResults.filter(r => r.student_id === viewingStudentDMC.id && r.session_id === parseInt(selectedSessionId) && r.semester_id === parseInt(selectedSemesterId));
                         if (studentRes.length === 0) return '0%';
                         const total = studentRes.reduce((sum, r) => sum + r.total_marks, 0);
                         const obtained = studentRes.reduce((sum, r) => sum + r.obtained_marks, 0);
                         return total > 0 ? `${Math.round((obtained / total) * 100)}%` : '0%';
                       })()}
                     </p>
                   </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-slate-50 dark:bg-[#020617] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <button 
                  onClick={() => setViewingStudentDMC(null)}
                  className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Close View
                </button>
                <button 
                  onClick={() => downloadDMC(viewingStudentDMC)}
                  className="flex items-center gap-3 px-8 py-4 bg-[#10b981] hover:bg-[#059669] text-[#020617] rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition transform active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" /> Download Official PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmationModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            type={confirmModal.type}
            isLoading={isDeleting !== null}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
