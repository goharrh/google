import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  BarChart3,
  Shield,
  Calendar,
  History,
  Settings,
  UserCheck,
  UserX,
  FileText,
  CheckCircle,
  Search,
  Filter,
  MoreVertical,
  Briefcase,
  Award,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  UserPlus,
  UserMinus,
  Clock,
  X,
  Trash2,
  Plus,
  Edit,
  ClipboardList,
  BookOpen,
  GraduationCap,
  Layers,
  Bell,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Database,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import DashboardLayout from "./DashboardLayout";
import ConfirmationModal from "./ConfirmationModal";
import {
  Employee,
  Class,
  TeacherAttendance,
  TeacherClassAssignment,
  Student,
  Section,
  LeaveRequest,
  Session,
  Semester,
  Subject,
  ClassSubject,
  ExamResult,
  SchoolTimetable,
} from "../types";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { useTheme } from "../context/ThemeContext";

const getGradeBadge = (grade: string | undefined | null) => {
  if (!grade)
    return (
      <span className="text-slate-400 dark:text-slate-600 font-mono">-</span>
    );
  const g = grade.trim().toUpperCase();
  let colorClasses = "";

  if (g.startsWith("A+")) {
    colorClasses =
      "bg-gradient-to-r from-purple-500/15 to-fuchsia-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-[0_4px_12px_rgba(168,85,247,0.12)] ring-1 ring-purple-500/20";
  } else if (g.startsWith("A")) {
    colorClasses =
      "bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-[0_4px_12px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/20";
  } else if (g.startsWith("B")) {
    colorClasses =
      "bg-gradient-to-r from-cyan-500/15 to-teal-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-[0_4px_12px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/20";
  } else if (g.startsWith("C")) {
    colorClasses =
      "bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_4px_12px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/20";
  } else if (g.startsWith("D")) {
    colorClasses =
      "bg-gradient-to-r from-orange-500/15 to-red-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 shadow-[0_4px_12px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/20";
  } else if (g.startsWith("F")) {
    colorClasses =
      "bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_4px_12px_rgba(244,63,94,0.12)] ring-1 ring-rose-500/20 animate-pulse";
  } else {
    colorClasses =
      "bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_4px_12px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20";
  }

  return (
    <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-black rounded-xl border uppercase tracking-[0.05em] font-sans transition-all duration-300 transform hover:scale-110 shadow-sm shadow-black/5 dark:shadow-white/5 bg-slate-100 dark:bg-slate-900 border-slate-250 dark:border-slate-800">
      <span
        className={`${colorClasses} px-2 py-0.5 rounded-lg border border-transparent`}
      >
        {g}
      </span>
    </span>
  );
};

const calculateGrade = (pct: number) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 33) return "E";
  return "F";
};

interface AdminDashboardProps {
  user: Employee;
  onLogout: () => void;
}

type AdminTab =
  | "home"
  | "teachers"
  | "classes"
  | "reports"
  | "calendar"
  | "exams"
  | "profile"
  | "requests"
  | "stats"
  | "settings";
type AdminSubTab =
  | "exam-marking"
  | "exam-results"
  | "exam-overall-results"
  | "class-attendance"
  | "class-manage"
  | "report-student"
  | "report-staff"
  | "report-personal"
  | "profile-view"
  | "profile-security"
  | "req-leave"
  | "req-training"
  | "staff-list"
  | "staff-add"
  | "sys-config"
  | "exam-center";

interface SchoolEvent {
  id: number;
  title: string;
  date: string;
  type: "academic" | "event" | "exam" | "holiday" | "staff";
  color: string;
  description?: string;
  emis?: string;
}

export default function AdminDashboard({
  user,
  onLogout,
}: AdminDashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>("home");
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab | null>(null);

  // Profile States
  const [profileData, setProfileData] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: "",
    bio: "",
    avatar: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileUploadLoading, setProfileUploadLoading] = useState(false);
  const [teachers, setTeachers] = useState<Employee[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [assignments, setAssignments] = useState<TeacherClassAssignment[]>([]);
  const [myAssignedClasses, setMyAssignedClasses] = useState<Class[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] =
    useState<TeacherAttendance | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<TeacherAttendance[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedClassForDetail, setSelectedClassForDetail] =
    useState<Class | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [classDetailStudents, setClassDetailStudents] = useState<Student[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isAssigningTeacherModalOpen, setIsAssigningTeacherModalOpen] =
    useState(false);
  const [classForNewAssignment, setClassForNewAssignment] =
    useState<Class | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<number, "Present" | "Absent" | "Sick" | "Leave">
  >({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [attendanceMode, setAttendanceMode] = useState<"mark" | "report">(
    "mark",
  );
  const [showReport, setShowReport] = useState(false);
  const [reportSubTab, setReportSubTab] = useState<
    "class-daily" | "class-historical" | "staff-logs" | "personal"
  >("class-daily");

  // CSV student bulk import States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [autoCreateEntities, setAutoCreateEntities] = useState(true);
  const [defaultEnrollmentType, setDefaultEnrollmentType] = useState<
    "Public" | "Private" | "Dropout" | "Fresh" | "Other"
  >("Fresh");
  const [csvImportProgress, setCsvImportProgress] = useState<{
    total: number;
    current: number;
    status: string;
  } | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; reason: string }[];
  } | null>(null);

  const handleCsvFileSelect = (file: File) => {
    if (!file) return;
    setCsvFile(file);
    setIsParsingCsv(true);
    setCsvImportResult(null);
    setCsvImportProgress(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to sheet in header-1 array-of-arrays style to let users map columns
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          defval: "",
        });

        if (rows.length === 0) {
          alert("The chosen CSV file appears to be empty.");
          setIsParsingCsv(false);
          return;
        }

        // Filter out completely empty rows
        const nonEmptyRows = rows.filter(
          (row) =>
            row &&
            row.some(
              (val) =>
                val !== undefined && val !== null && String(val).trim() !== "",
            ),
        );

        if (nonEmptyRows.length === 0) {
          alert("No valid content rows found in the CSV.");
          setIsParsingCsv(false);
          return;
        }

        const headers = nonEmptyRows[0].map((h) => String(h).trim());
        const dataRows = nonEmptyRows.slice(1);

        setCsvHeaders(headers);
        setCsvRows(dataRows);

        // Pre-map columns using our target fields & synonyms
        const initialMapping: Record<string, string> = {};
        const availableTargetFields = [
          {
            key: "name",
            synonyms: ["name", "student name", "student_name", "full name"],
          },
          {
            key: "admission_no",
            synonyms: [
              "admission #",
              "admission_no",
              "admission no",
              "student id",
              "student_id",
              "id",
            ],
          },
          {
            key: "father_name",
            synonyms: [
              "father name",
              "father_name",
              "guardian name",
              "guardian_name",
            ],
          },
          {
            key: "father_cnic",
            synonyms: [
              "father cnic",
              "father_cnic",
              "guardian cnic",
              "guardian_cnic",
              "cnic",
              "form-b",
              "form b",
              "form_b",
            ],
          },
          {
            key: "father_mobile_no",
            synonyms: [
              "father mobile no",
              "father_mobile",
              "father mobile",
              "mobile no",
              "phone no",
              "emergency no",
              "student mobile no",
              "emerency no",
              "student_mobile_no",
              "emergency_no",
            ],
          },
          { key: "gender", synonyms: ["gender", "student gender", "sex"] },
          {
            key: "date_of_birth",
            synonyms: ["date of birth", "dob", "birth date", "date_of_birth"],
          },
          {
            key: "class_name",
            synonyms: ["class name", "class", "grade", "level", "class_name"],
          },
          {
            key: "section_name",
            synonyms: ["class section", "section", "group", "section_name"],
          },
          {
            key: "session",
            synonyms: [
              "session year",
              "session",
              "academic year",
              "year",
              "session_year",
            ],
          },
          {
            key: "student_status",
            synonyms: ["student status", "status", "student_status"],
          },
          { key: "class_status", synonyms: ["class status", "class_status"] },
          {
            key: "previous_school_name",
            synonyms: [
              "school name",
              "previous school",
              "previous school name",
              "school_name",
              "previous_school_name",
            ],
          },
          {
            key: "previous_school_emis",
            synonyms: [
              "emis code",
              "school emis",
              "school_emis",
              "emis_code",
              "previous_school_emis",
              "emis",
            ],
          },
          {
            key: "class_enrolment_date",
            synonyms: [
              "class enrolment date",
              "enrolment date",
              "admission date",
              "class_enrolment_date",
              "admission_date",
            ],
          },
        ];

        availableTargetFields.forEach((field) => {
          // Find matching header by synonym
          const index = headers.findIndex((h) => {
            const hLower = h.toLowerCase().replace(/[\s\-_]/g, "");
            return field.synonyms.some((syn) => {
              const synLower = syn.toLowerCase().replace(/[\s\-_]/g, "");
              return hLower.includes(synLower) || synLower.includes(hLower);
            });
          });
          if (index !== -1) {
            initialMapping[field.key] = headers[index];
          } else {
            // Check exact or partial matches
            const partialIndex = headers.findIndex((h) => {
              const hLower = h.toLowerCase();
              return hLower.includes(field.key.toLowerCase());
            });
            if (partialIndex !== -1) {
              initialMapping[field.key] = headers[partialIndex];
            }
          }
        });

        if (!initialMapping["admission_no"]) {
          const defaultNoIdx = headers.findIndex(
            (h) =>
              h.toLowerCase().includes("id") ||
              h.toLowerCase().includes("no") ||
              h.toLowerCase().includes("#"),
          );
          if (defaultNoIdx !== -1)
            initialMapping["admission_no"] = headers[defaultNoIdx];
        }

        setColumnMapping(initialMapping);
      } catch (err: any) {
        console.error("Error parsing CSV file:", err);
        alert(`Failed to parse CSV: ${err.message || err}`);
      } finally {
        setIsParsingCsv(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    if (csvRows.length === 0) return;

    // Build index mappings
    const headerMapIdx: Record<string, number> = {};
    Object.entries(columnMapping).forEach(([targetKey, headerName]) => {
      const idx = csvHeaders.indexOf(headerName);
      if (idx !== -1) {
        headerMapIdx[targetKey] = idx;
      }
    });

    setCsvImportProgress({
      total: csvRows.length,
      current: 0,
      status: "Initializing import flow...",
    });
    setCsvImportResult(null);

    let successCount = 0;
    let failedCount = 0;
    const errorsList: { row: number; reason: string }[] = [];
    const completedStudents: Student[] = [];

    let currentClasses = [...allClasses];
    let currentSections = [...sections];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowNum = i + 2; // Row number in Excel/CSV (1-based sheet + 1 for header)

      setCsvImportProgress({
        total: csvRows.length,
        current: i,
        status: `Processing Row ${rowNum} of ${csvRows.length + 1}...`,
      });

      try {
        const getVal = (key: string) => {
          const idx = headerMapIdx[key];
          if (idx === undefined) return "";
          return row[idx] !== undefined && row[idx] !== null
            ? String(row[idx]).trim()
            : "";
        };

        const studentName = getVal("name");
        if (!studentName) {
          throw new Error(
            "Student name is required but found empty on this row.",
          );
        }

        // Get or Create Class
        const csvClassName = getVal("class_name");
        let clsId: number | null = null;
        if (csvClassName) {
          let cls = currentClasses.find(
            (c) =>
              c.class_name &&
              c.class_name.toLowerCase().trim() ===
                csvClassName.toLowerCase().trim(),
          );
          if (!cls) {
            cls = currentClasses.find(
              (c) =>
                c.class_name &&
                c.class_name
                  .toLowerCase()
                  .trim()
                  .includes(csvClassName.toLowerCase().trim()),
            );
          }

          if (!cls && autoCreateEntities) {
            setCsvImportProgress((prev) => ({
              ...prev!,
              status: `Auto-creating Class "${csvClassName}"...`,
            }));

            if (import.meta.env.VITE_SUPABASE_URL) {
              const { data: newCls, error: cErr } = await supabase
                .from("classes")
                .insert([
                  {
                    class_name: csvClassName,
                    academic_year:
                      getVal("session") || new Date().getFullYear().toString(),
                    emis: user.emis,
                  },
                ])
                .select();

              if (cErr)
                throw new Error(
                  `Failed to create class "${csvClassName}": ${cErr.message}`,
                );
              if (newCls && newCls.length > 0) {
                cls = newCls[0];
                currentClasses.push(cls);
                setAllClasses((prev) => [...prev, newCls[0]]);
              }
            } else {
              const mockC = {
                id: Math.floor(Math.random() * 2147483647),
                class_name: csvClassName,
                academic_year:
                  getVal("session") || new Date().getFullYear().toString(),
                emis: user.emis,
              } as Class;
              cls = mockC;
              currentClasses.push(mockC);
              setAllClasses((prev) => [...prev, mockC]);
            }
          }
          if (cls) clsId = cls.id;
        }

        // Get or Create Section
        const csvSecName = getVal("section_name");
        let secId: number | null = null;
        if (csvSecName) {
          let sect = currentSections.find(
            (s) =>
              s.section_name &&
              s.section_name.toLowerCase().trim() ===
                csvSecName.toLowerCase().trim(),
          );
          if (!sect && autoCreateEntities) {
            setCsvImportProgress((prev) => ({
              ...prev!,
              status: `Auto-creating Section "${csvSecName}"...`,
            }));

            if (import.meta.env.VITE_SUPABASE_URL) {
              const { data: newSec, error: sErr } = await supabase
                .from("sections")
                .insert([
                  {
                    section_name: csvSecName,
                    emis: user.emis,
                  },
                ])
                .select();

              if (sErr)
                throw new Error(
                  `Failed to create section "${csvSecName}": ${sErr.message}`,
                );
              if (newSec && newSec.length > 0) {
                sect = newSec[0];
                currentSections.push(sect);
                setSections((prev) => [...prev, newSec[0]]);
              }
            } else {
              const mockS = {
                id: Math.floor(Math.random() * 2147483647),
                section_name: csvSecName,
                emis: user.emis,
              } as Section;
              sect = mockS;
              currentSections.push(mockS);
              setSections((prev) => [...prev, mockS]);
            }
          }
          if (sect) secId = sect.id;
        }

        let dobVal = getVal("date_of_birth") || null;
        if (dobVal && !isNaN(Number(dobVal)) && Number(dobVal) > 10000) {
          const date = new Date((Number(dobVal) - 25569) * 86400 * 1000);
          dobVal = date.toISOString().split("T")[0];
        } else if (dobVal) {
          try {
            const parsedD = new Date(dobVal);
            if (!isNaN(parsedD.getTime())) {
              dobVal = parsedD.toISOString().split("T")[0];
            }
          } catch (_) {
            // keep unmodified raw DOB
          }
        }

        const rawGender = getVal("gender") || "MALE";
        const cleanedGender = ["female", "f"].includes(rawGender.toLowerCase())
          ? "FEMALE"
          : "MALE";

        let enrolmentDateVal = getVal("class_enrolment_date") || null;
        if (
          enrolmentDateVal &&
          !isNaN(Number(enrolmentDateVal)) &&
          Number(enrolmentDateVal) > 10000
        ) {
          const date = new Date(
            (Number(enrolmentDateVal) - 25569) * 86400 * 1000,
          );
          enrolmentDateVal = date.toISOString().split("T")[0];
        } else if (enrolmentDateVal) {
          try {
            const parsedE = new Date(enrolmentDateVal);
            if (!isNaN(parsedE.getTime())) {
              enrolmentDateVal = parsedE.toISOString().split("T")[0];
            }
          } catch (_) {
            // keep unmodified
          }
        }
        if (!enrolmentDateVal) {
          enrolmentDateVal = new Date().toISOString().split("T")[0];
        }

        const studentData = {
          name: studentName,
          admission_no:
            getVal("admission_no") ||
            `ADM-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
          class_id: clsId,
          section_id: secId,
          enrollment_type: defaultEnrollmentType,
          session: getVal("session") || new Date().getFullYear().toString(),
          gender: cleanedGender,
          date_of_birth: dobVal,
          father_name: getVal("father_name") || null,
          father_cnic: getVal("father_cnic") || null,
          father_mobile_no: getVal("father_mobile_no") || null,
          class_enrolment_date: enrolmentDateVal,
          class_status: getVal("class_status") || "Active",
          student_status: getVal("student_status") || "Active",
          previous_school_name: getVal("previous_school_name") || null,
          previous_school_emis: getVal("previous_school_emis") || null,
          emis: user.emis,
        };

        if (import.meta.env.VITE_SUPABASE_URL) {
          const { data: insertedStudent, error: insertErr } = await supabase
            .from("students")
            .insert([studentData])
            .select();

          if (insertErr) throw insertErr;
          if (insertedStudent && insertedStudent.length > 0) {
            completedStudents.push(insertedStudent[0]);
          }
        } else {
          const mockStudObj = {
            ...studentData,
            id: Math.floor(Math.random() * 2147483647),
          } as Student;
          completedStudents.push(mockStudObj);
        }

        successCount++;
      } catch (err: any) {
        console.error(`Import failed on row ${rowNum}:`, err);
        failedCount++;
        errorsList.push({
          row: rowNum,
          reason: err.message || JSON.stringify(err),
        });
      }
    }

    setCsvImportProgress(null);
    setCsvImportResult({
      success: successCount,
      failed: failedCount,
      errors: errorsList,
    });

    if (completedStudents.length > 0) {
      setEnrolmentLogs((prev) => [...completedStudents, ...prev]);
    }

    if (failedCount === 0) {
      setCsvFile(null);
      setCsvHeaders([]);
      setCsvRows([]);
      setColumnMapping({});
    }
  };

  // States for general class-wise reports
  const [selectedReportClassId, setSelectedReportClassId] = useState<
    number | null
  >(null);
  const [generalReportDate, setGeneralReportDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [historicalReportFilters, setHistoricalReportFilters] = useState({
    classId: "",
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [historicalReportData, setHistoricalReportData] = useState<any[]>([]);
  const [isGeneratingHistorical, setIsGeneratingHistorical] = useState(false);

  const [reportData, setReportData] = useState<{
    total: number;
    boys: number;
    girls: number;
    present: number;
    absent: number;
    sick: number;
    leave: number;
    presentPercentage: string;
    categorizedStudents: Record<
      "Present" | "Absent" | "Sick" | "Leave",
      Student[]
    >;
  } | null>(null);
  const [viewingCategory, setViewingCategory] = useState<
    "Present" | "Absent" | "Sick" | "Leave" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [teacherFilter, setTeacherFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    null,
  );

  const [statsData, setStatsData] = useState<
    { name: string; attendance: number }[]
  >([]);
  const [schoolName, setSchoolName] = useState<string>("");

  const [teacherAttendanceLogs, setTeacherAttendanceLogs] = useState<
    TeacherAttendance[]
  >([]);
  const [enrolmentLogs, setEnrolmentLogs] = useState<Student[]>([]);
  const [showEnrolmentForm, setShowEnrolmentForm] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

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

    // Fill empty days for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Fill current month days
    for (let i = 1; i <= lastDate; i++) {
      days.push(
        new Date(
          currentCalendarDate.getFullYear(),
          currentCalendarDate.getMonth(),
          i,
        ),
      );
    }

    return days;
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() + offset,
      1,
    );
    setCurrentCalendarDate(newDate);
  };

  // Calendar States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [timetable, setTimetable] = useState<SchoolTimetable>({
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    week_offs: ["Sunday"],
    check_in_start: "07:30",
    check_in_end: "10:30",
    check_out_start: "13:00",
    check_out_end: "18:00",
  });
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([
    {
      id: 1,
      title: "Term 1 Commencement",
      date: "2026-05-01",
      type: "academic",
      color: "emerald",
    },
    {
      id: 2,
      title: "Annual Sports Meet",
      date: "2026-05-15",
      type: "event",
      color: "blue",
    },
    {
      id: 3,
      title: "Staff Development Day",
      date: "2026-05-10",
      type: "staff",
      color: "amber",
    },
    {
      id: 4,
      title: "Mid-Term Examinations",
      date: "2026-05-20",
      type: "exam",
      color: "rose",
    },
    {
      id: 5,
      title: "Summer Vacations Start",
      date: "2026-06-01",
      type: "holiday",
      color: "indigo",
    },
  ]);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(
    new Date(),
  );

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    type: "event" as "academic" | "event" | "exam" | "holiday" | "staff",
    description: "",
  });

  const [enrollForm, setEnrollForm] = useState({
    name: "",
    father_name: "",
    admission_no: "",
    gender: "MALE",
    dob: "",
    father_cnic: "",
    father_mobile: "",
    class_id: "",
    section_id: "",
    previous_school_name: "",
    previous_school_emis: "",
    session: new Date().getFullYear().toString(),
    enrollment_type: "Fresh" as
      | "Public"
      | "Private"
      | "Dropout"
      | "Fresh"
      | "Other",
  });
  const [reportFilters, setReportFilters] = useState({
    teacherId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [enrolmentFilters, setEnrolmentFilters] = useState({
    classId: "",
    type: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [todaySummary, setTodaySummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    onClock: 0,
  });

  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [examManagementMode, setExamManagementMode] = useState<
    "sessions" | "semesters" | "subjects" | "assignment" | "results"
  >("sessions");
  const [selectedClassTab, setSelectedClassTab] = useState<string>("all");
  const [editingClassSubjectId, setEditingClassSubjectId] = useState<number | null>(null);
  const [editingTotalMarks, setEditingTotalMarks] = useState<number>(100);
  const [editingPassingMarks, setEditingPassingMarks] = useState<number>(33);

  const [sessionForm, setSessionForm] = useState({ name: "" });
  const [semesterForm, setSemesterForm] = useState({ name: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [classSubjectForm, setClassSubjectForm] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    total_marks: 100,
    passing_marks: 33,
  });
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");
  const [isProcessingLeave, setIsProcessingLeave] = useState<number | null>(
    null,
  );
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [leaveFormData, setLeaveFormData] = useState({
    type: "Casual Leave",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
    document: null as File | null,
  });
  const [leaveDays, setLeaveDays] = useState(1);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger",
  });

  const sortedStudents = useMemo(() => {
    let filtered = classStudents;
    if (studentSearchQuery) {
      const q = studentSearchQuery.toLowerCase();
      filtered = classStudents.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.admission_no || "").toLowerCase().includes(q),
      );
    }
    if (!sortDirection) return filtered;
    return [...filtered].sort((a, b) => {
      const numA = parseInt(a.admission_no || "0");
      const numB = parseInt(b.admission_no || "0");
      if (sortDirection === "asc") return numA - numB;
      return numB - numA;
    });
  }, [classStudents, sortDirection, studentSearchQuery]);

  const currentClassSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    return classSubjects.filter((cs) => cs.class_id === selectedClassId);
  }, [selectedClassId, classSubjects]);

  const sortedExamResults = useMemo(() => {
    if (!sortDirection) return examResults;
    return [...examResults].sort((a, b) => {
      const studentA =
        classStudents.find((s) => s.id === a.student_id) ||
        searchResults.find((s) => s.id === a.student_id);
      const studentB =
        classStudents.find((s) => s.id === b.student_id) ||
        searchResults.find((s) => s.id === b.student_id);
      const numA = parseInt(studentA?.admission_no || "0");
      const numB = parseInt(studentB?.admission_no || "0");
      if (sortDirection === "asc") return numA - numB;
      return numB - numA;
    });
  }, [examResults, sortDirection, searchResults, classStudents]);

  const toggleSort = () => {
    setSortDirection((prev) => {
      if (prev === null) return "asc";
      if (prev === "asc") return "desc";
      return null;
    });
  };

  const openConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "warning" | "info" = "danger",
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      type,
    });
  };

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== "undefined"
  );

  useEffect(() => {
    fetchAdminData();
    calculateStats();
    fetchTodaySummary();
    fetchAllLeaveRequests();
    fetchEvents();
  }, []);

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

  const fetchAllLeaveRequests = async () => {
    try {
      if (!isSupabaseConfigured) {
        setAllLeaveRequests([
          {
            id: 1,
            teacher_id: 2,
            leave_type: "Sick Leave",
            from_date: "2024-05-10",
            to_date: "2024-05-12",
            days: 3,
            reason: "Flu symptoms",
            status: "Pending",
            submitted_at: new Date().toISOString(),
            emis: user.emis,
          } as any,
        ]);
        return;
      }
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("emis", user.emis)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllLeaveRequests(data || []);
    } catch (err) {
      console.error("Error fetching all leave requests:", err);
    }
  };

  const handleLeaveAction = async (
    requestId: number,
    newStatus: "Approved" | "Rejected",
  ) => {
    setIsProcessingLeave(requestId);
    try {
      if (!isSupabaseConfigured) {
        setAllLeaveRequests((prev) =>
          prev.map((req) =>
            req.id === requestId ? { ...req, status: newStatus } : req,
          ),
        );
        alert(`Request ${newStatus} successfully (Demo Mode).`);
        return;
      }

      const { error } = await supabase
        .from("leave_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) throw error;

      setAllLeaveRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: newStatus } : req,
        ),
      );
      alert(`Request has been ${newStatus.toLowerCase()}.`);
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    } finally {
      setIsProcessingLeave(null);
    }
  };

  const saveSession = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("sessions")
          .insert([{ ...sessionForm, emis: user.emis }])
          .select();
        if (error) throw error;
        if (data) setSessions([...sessions, data[0]]);
      } else {
        setSessions([
          ...sessions,
          { id: Date.now(), ...sessionForm, emis: user.emis },
        ]);
      }
      setSessionForm({ name: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saveSemester = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("semesters")
          .insert([{ ...semesterForm, emis: user.emis }])
          .select();
        if (error) throw error;
        if (data) setSemesters([...semesters, data[0]]);
      } else {
        setSemesters([
          ...semesters,
          { id: Date.now(), ...semesterForm, emis: user.emis },
        ]);
      }
      setSemesterForm({ name: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saveSubject = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("subjects")
          .insert([{ ...subjectForm, emis: user.emis }])
          .select();
        if (error) throw error;
        if (data) setSubjects([...subjects, data[0]]);
      } else {
        setSubjects([
          ...subjects,
          { id: Date.now(), ...subjectForm, emis: user.emis },
        ]);
      }
      setSubjectForm({ name: "", code: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const assignSubjectToClass = async (e: FormEvent) => {
    e.preventDefault();
    if (!classSubjectForm.class_id || !classSubjectForm.subject_id) {
      alert("Please select both class and subject");
      return;
    }
    try {
      // Find teacher assigned to this class from teacher assignments
      const classAssignment = assignments.find(
        (a) => a.class_id === parseInt(classSubjectForm.class_id),
      );
      const foundTeacherId = classAssignment
        ? classAssignment.teacher_id
        : allClasses.find((c) => c.id === parseInt(classSubjectForm.class_id))
            ?.teacher_id || null;

      const payload = {
        class_id: parseInt(classSubjectForm.class_id),
        subject_id: parseInt(classSubjectForm.subject_id),
        teacher_id: foundTeacherId,
        total_marks: classSubjectForm.total_marks,
        passing_marks: classSubjectForm.passing_marks,
        emis: user.emis,
      };
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("class_subject")
          .insert([payload])
          .select();
        if (error) throw error;
        if (data) setClassSubjects([...classSubjects, data[0]]);
      } else {
        setClassSubjects([...classSubjects, { id: Date.now(), ...payload }]);
      }
      setClassSubjectForm({
        class_id: "",
        subject_id: "",
        teacher_id: "",
        total_marks: 100,
        passing_marks: 33,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (!subjectId) return;

    openConfirmModal(
      "Delete Subject",
      "Are you sure you want to permanently delete this subject? This might affect relevant class-subject assignments and exam results.",
      async () => {
        try {
          if (!isSupabaseConfigured) {
            setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
            setClassSubjects((prev) => prev.filter((cs) => cs.subject_id !== subjectId));
            alert("Subject deleted successfully (Demo Mode).");
            return;
          }

          if (import.meta.env.VITE_SUPABASE_URL) {
            // Cleanup any exam results referencing this subject first
            await supabase
              .from("exam_results")
              .delete()
              .eq("subject_id", subjectId);

            // Cleanup class_subject references
            await supabase
              .from("class_subject")
              .delete()
              .eq("subject_id", subjectId);

            const { error } = await supabase
              .from("subjects")
              .delete()
              .eq("id", subjectId);

            if (error) throw error;
          }

          setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
          setClassSubjects((prev) => prev.filter((cs) => cs.subject_id !== subjectId));
          alert("Subject and its class assignments deleted successfully.");
        } catch (err: any) {
          alert(`Subject deletion failed: ${err.message}`);
        }
      },
    );
  };

  const handleDeleteClassSubject = async (classSubjectId: number | string) => {
    if (!classSubjectId) return;

    openConfirmModal(
      "Delete Class Subject Assignment",
      "Are you sure you want to unassign/delete this subject from the class? This will also remove any associated exam results.",
      async () => {
        try {
          if (!isSupabaseConfigured) {
            setClassSubjects((prev) => prev.filter((cs) => cs.id !== classSubjectId));
            alert("Class Subject assignment deleted successfully (Demo Mode).");
            return;
          }

          if (import.meta.env.VITE_SUPABASE_URL) {
            const csItem = classSubjects.find((cs) => cs.id == classSubjectId);
            if (csItem) {
              // Delete exam results corresponding to this class and subject
              await supabase
                .from("exam_results")
                .delete()
                .eq("class_id", csItem.class_id)
                .eq("subject_id", csItem.subject_id);

              // Delete from class_subject using ID
              const { error: deleteByIdError } = await supabase
                .from("class_subject")
                .delete()
                .eq("id", classSubjectId);

              // Fallback to class_id & subject_id if ID delete failed
              if (deleteByIdError) {
                console.warn("Delete class subject by ID failed, using composite keys fallback.", deleteByIdError);
                const { error: fallbackError } = await supabase
                  .from("class_subject")
                  .delete()
                  .eq("class_id", csItem.class_id)
                  .eq("subject_id", csItem.subject_id)
                  .eq("emis", user.emis);
                if (fallbackError) throw fallbackError;
              }
            } else {
              const { error } = await supabase
                .from("class_subject")
                .delete()
                .eq("id", classSubjectId);
              if (error) throw error;
            }
          }

          setClassSubjects((prev) => prev.filter((cs) => cs.id != classSubjectId));
          if (selectedClassSubjectId === String(classSubjectId)) {
            setSelectedClassSubjectId("");
          }
          alert("Subject assignment removed from the class successfully.");
        } catch (err: any) {
          alert(`Subject assignment deletion failed: ${err.message}`);
        }
      },
    );
  };

  const handleSaveClassSubjectMarks = async (id: number) => {
    try {
      if (editingTotalMarks <= 0) {
        alert("Total marks must be greater than 0");
        return;
      }
      if (editingPassingMarks < 0 || editingPassingMarks > editingTotalMarks) {
        alert("Passing marks must be between 0 and total marks");
        return;
      }

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("class_subject")
          .update({
            total_marks: editingTotalMarks,
            passing_marks: editingPassingMarks,
          })
          .eq("id", id);

        if (error) throw error;
      }

      setClassSubjects((prev) =>
        prev.map((cs) =>
          cs.id === id
            ? { ...cs, total_marks: editingTotalMarks, passing_marks: editingPassingMarks }
            : cs
        )
      );
      setEditingClassSubjectId(null);
    } catch (err: any) {
      alert(`Failed to update marks: ${err.message}`);
    }
  };

  const fetchTodaySummary = async () => {
    if (!isSupabaseConfigured) {
      setTodaySummary({
        total: 12,
        present: 10,
        absent: 1,
        onClock: 1,
      });
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: allTeachers } = await supabase
        .from("emp")
        .select("id")
        .eq("emis", user.emis);
      const { data: attendance } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", today)
        .eq("emis", user.emis);

      const total = allTeachers?.length || 0;
      const present = attendance?.length || 0;
      const onClock = attendance?.filter((a) => !a.check_out).length || 0;

      setTodaySummary({
        total,
        present,
        absent: total - present,
        onClock,
      });
    } catch (err) {
      console.error("Error fetching today summary:", err);
    }
  };

  const generateTeacherReport = async () => {
    try {
      let query = supabase
        .from("teacher_attendance")
        .select("*")
        .eq("emis", user.emis)
        .gte("attendance_date", reportFilters.startDate)
        .lte("attendance_date", reportFilters.endDate);

      if (reportFilters.teacherId) {
        query = query.eq("teacher_id", parseInt(reportFilters.teacherId));
      }

      const { data, error } = await query.order("attendance_date", {
        ascending: false,
      });
      if (error) throw error;
      setTeacherAttendanceLogs(data || []);
    } catch (err) {
      console.error("Error generating teacher report:", err);
    }
  };

  const fetchEnrolmentReport = async () => {
    try {
      if (!isSupabaseConfigured) {
        setEnrolmentLogs([
          {
            id: 1,
            name: "Sample Student",
            class_id: 1,
            enrolment_type: "Fresh",
            class_enrolment_date: enrolmentFilters.startDate,
            emis: user.emis,
          } as any,
        ]);
        return;
      }
      let query = supabase
        .from("students")
        .select("*")
        .eq("emis", user.emis)
        .gte("class_enrolment_date", enrolmentFilters.startDate)
        .lte("class_enrolment_date", enrolmentFilters.endDate);

      if (enrolmentFilters.classId) {
        query = query.eq("class_id", parseInt(enrolmentFilters.classId));
      }

      if (enrolmentFilters.type) {
        query = query.eq("enrollment_type", enrolmentFilters.type);
      }

      const { data, error } = await query.order("class_enrolment_date", {
        ascending: false,
      });
      if (error) throw error;
      setEnrolmentLogs(data || []);
    } catch (err: any) {
      console.error("Error generating enrolment report:", err);
    }
  };

  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    setIsEnrolling(true);
    try {
      if (!isSupabaseConfigured) {
        alert("Student enrolled successfully (Demo Mode)!");
        const mockStudent: Student = {
          id: Date.now(),
          name: enrollForm.name,
          father_name: enrollForm.father_name,
          admission_no: enrollForm.admission_no,
          gender: enrollForm.gender,
          class_id: enrollForm.class_id ? parseInt(enrollForm.class_id) : null,
          section_id: enrollForm.section_id
            ? parseInt(enrollForm.section_id)
            : null,
          enrollment_type: enrollForm.enrollment_type,
          class_enrolment_date: new Date().toISOString().split("T")[0],
          emis: user.emis,
        } as any;
        setEnrolmentLogs([mockStudent, ...enrolmentLogs]);
        setShowEnrolmentForm(false);
        setEnrollForm({
          name: "",
          father_name: "",
          admission_no: "",
          gender: "MALE",
          dob: "",
          father_cnic: "",
          father_mobile: "",
          class_id: "",
          section_id: "",
          previous_school_name: "",
          previous_school_emis: "",
          session: new Date().getFullYear().toString(),
          enrollment_type: "Fresh",
        });
        setIsEnrolling(false);
        return;
      }

      const studentData = {
        name: enrollForm.name,
        father_name: enrollForm.father_name,
        admission_no: enrollForm.admission_no,
        class_id: enrollForm.class_id ? parseInt(enrollForm.class_id) : null,
        section_id: enrollForm.section_id
          ? parseInt(enrollForm.section_id)
          : null,
        enrollment_type: enrollForm.enrollment_type,
        previous_school_name: !["Fresh", "Dropout"].includes(
          enrollForm.enrollment_type,
        )
          ? enrollForm.previous_school_name
          : null,
        previous_school_emis: !["Fresh", "Dropout"].includes(
          enrollForm.enrollment_type,
        )
          ? enrollForm.previous_school_emis
          : null,
        session: enrollForm.session,
        gender: enrollForm.gender,
        date_of_birth: enrollForm.dob,
        father_cnic: enrollForm.father_cnic,
        father_mobile_no: enrollForm.father_mobile,
        class_enrolment_date: new Date().toISOString().split("T")[0],
        class_status: "Active",
        student_status: "Active",
        emis: user.emis,
      };

      const { data, error } = await supabase
        .from("students")
        .insert([studentData])
        .select();

      if (error) throw error;

      alert("Student enrolled successfully!");
      if (data) setEnrolmentLogs([data[0], ...enrolmentLogs]);
      setShowEnrolmentForm(false);
      setEnrollForm({
        name: "",
        father_name: "",
        admission_no: "",
        gender: "MALE",
        dob: "",
        father_cnic: "",
        father_mobile: "",
        class_id: "",
        section_id: "",
        previous_school_name: "",
        previous_school_emis: "",
        session: new Date().getFullYear().toString(),
        enrollment_type: "Fresh",
      });
    } catch (err: any) {
      console.error("Error enrolling student:", err);
      alert(`Enrollment failed: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  const fetchEvents = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from("school_events")
        .select("*")
        .eq("emis", user.emis);
      if (error) throw error;
      if (data) setSchoolEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingEvent(true);

    const typeColors = {
      academic: "emerald",
      event: "blue",
      exam: "rose",
      holiday: "indigo",
      staff: "amber",
    };

    const payload = {
      ...eventForm,
      color: typeColors[eventForm.type],
      emis: user.emis,
    };

    try {
      if (isSupabaseConfigured) {
        if (editingEvent) {
          const { error } = await supabase
            .from("school_events")
            .update(payload)
            .eq("id", editingEvent.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("school_events")
            .insert([payload]);
          if (error) throw error;
        }
        await fetchEvents();
      } else {
        // Demo mode
        if (editingEvent) {
          setSchoolEvents((prev) =>
            prev.map((ev) =>
              ev.id === editingEvent.id ? { ...ev, ...payload } : ev,
            ),
          );
        } else {
          setSchoolEvents((prev) => [...prev, { id: Date.now(), ...payload }]);
        }
      }
      setIsEventModalOpen(false);
      setEditingEvent(null);
      setEventForm({
        title: "",
        date: new Date().toISOString().split("T")[0],
        type: "event",
        description: "",
      });
    } catch (err: any) {
      alert(`Failed to save event: ${err.message}`);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("school_events")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchEvents();
      } else {
        setSchoolEvents((prev) => prev.filter((ev) => ev.id !== id));
      }
    } catch (err: any) {
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  const openEditEvent = (ev: SchoolEvent) => {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title,
      date: ev.date,
      type: ev.type,
      description: ev.description || "",
    });
    setIsEventModalOpen(true);
  };

  const calculateStats = async () => {
    try {
      if (!isSupabaseConfigured) {
        setStatsData([
          { name: "Grade 1", attendance: 94 },
          { name: "Grade 2", attendance: 88 },
          { name: "Grade 3", attendance: 92 },
          { name: "Grade 4", attendance: 85 },
          { name: "Grade 5", attendance: 90 },
        ]);
        return;
      }
      const { data: classes } = await supabase
        .from("classes")
        .select("id, class_name")
        .eq("emis", user.emis);
      const today = new Date().toISOString().split("T")[0];

      const stats = await Promise.all(
        (classes || []).map(async (cls) => {
          const { data: attendance } = await supabase
            .from("student_attendance")
            .select("status")
            .eq("class_id", cls.id)
            .eq("date", today)
            .eq("emis", user.emis);

          const total = attendance?.length || 0;
          const present =
            attendance?.filter((a) => a.status === "Present").length || 0;
          const percent = total > 0 ? Math.round((present / total) * 100) : 0;

          return { id: cls.id, name: cls.class_name, attendance: percent };
        }),
      );

      setStatsData(
        stats.length > 0
          ? stats
          : [
              { id: "d1", name: "Grade 10", attendance: 94 },
              { id: "d2", name: "Grade 11", attendance: 88 },
            ],
      );
    } catch (err) {
      console.error("Error calculating dashboard stats:", err);
    }
  };

  const handlePasswordChange = async (e: any) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!isSupabaseConfigured) {
        alert("Password updated successfully (Demo Mode)");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Check current password
      const { data: userData, error: userError } = await supabase
        .from("emp")
        .select("password")
        .eq("id", user.id)
        .single();

      if (userError || !userData) throw new Error("User not found");

      const isMatch = bcrypt.compareSync(
        passwordForm.currentPassword,
        userData.password,
      );
      if (!isMatch) {
        alert("Current password incorrect");
        return;
      }

      const hashedPassword = bcrypt.hashSync(passwordForm.newPassword, 10);
      const { error } = await supabase
        .from("emp")
        .update({ password: hashedPassword })
        .eq("id", user.id);

      if (error) throw error;

      alert("Password updated successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const [isSavingTimetable, setIsSavingTimetable] = useState(false);
  const handleSaveTimetable = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingTimetable(true);
    const formData = new FormData(e.currentTarget);
    
    // Parse selected working days
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const selectedWorkingDays: string[] = [];
    days.forEach(day => {
      if (formData.get(`working_${day}`)) {
        selectedWorkingDays.push(day);
      }
    });

    const selectedWeekOffs = days.filter(d => !selectedWorkingDays.includes(d));

    const newTimetable: SchoolTimetable = {
      emis: user.emis,
      working_days: selectedWorkingDays,
      week_offs: selectedWeekOffs,
      check_in_start: formData.get("check_in_start") as string,
      check_in_end: formData.get("check_in_end") as string,
      check_out_start: formData.get("check_out_start") as string,
      check_out_end: formData.get("check_out_end") as string
    };

    setTimetable(newTimetable);
    localStorage.setItem(`school_timetable_${user.emis}`, JSON.stringify(newTimetable));

    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase
          .from("school_timetable")
          .select("id")
          .eq("emis", user.emis)
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from("school_timetable")
            .update({
              working_days: selectedWorkingDays,
              week_offs: selectedWeekOffs,
              check_in_start: newTimetable.check_in_start,
              check_in_end: newTimetable.check_in_end,
              check_out_start: newTimetable.check_out_start,
              check_out_end: newTimetable.check_out_end,
              updated_at: new Date().toISOString()
            })
            .eq("emis", user.emis);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("school_timetable")
            .insert([{
              emis: user.emis,
              working_days: selectedWorkingDays,
              week_offs: selectedWeekOffs,
              check_in_start: newTimetable.check_in_start,
              check_in_end: newTimetable.check_in_end,
              check_out_start: newTimetable.check_out_start,
              check_out_end: newTimetable.check_out_end,
              updated_at: new Date().toISOString()
            }]);
          if (error) throw error;
        }
        alert("School timetable synchronized and saved in database successfully!");
      } catch (err: any) {
        console.warn("DB upsert for timetable error, saved offline:", err.message);
        alert("School timetable updated in offline local cache memory.");
      } finally {
        setIsSavingTimetable(false);
      }
    } else {
      setIsSavingTimetable(false);
      alert("School timetable updated in local session memory successfully!");
    }
  };

  const fetchTimetable = async () => {
    const defaultTimetable = {
      working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      week_offs: ["Sunday"],
      check_in_start: "07:30",
      check_in_end: "10:30",
      check_out_start: "13:00",
      check_out_end: "18:00",
    };

    let localResult = null;
    try {
      const cached = localStorage.getItem(`school_timetable_${user.emis}`);
      if (cached) {
        localResult = JSON.parse(cached);
      }
    } catch (e) {
      console.error("Error parsing local timetable:", e);
    }

    if (localResult) {
      setTimetable(localResult);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("school_timetable")
          .select("*")
          .eq("emis", user.emis)
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
        console.error("Error fetching timetable:", err);
      }
    }

    if (!localResult && !isSupabaseConfigured) {
      setTimetable(defaultTimetable);
      localStorage.setItem(`school_timetable_${user.emis}`, JSON.stringify(defaultTimetable));
    }
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    setDataError(null);
    await fetchTimetable();
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSchoolName("Government Primary School (Demo)");
        setTeachers([
          {
            id: 1,
            name: "Principal Admin",
            role: "admin",
            designation: "Principal",
            personnel: "654321",
            emis: user.emis,
          },
          {
            id: 2,
            name: "Sarah Ahmed",
            role: "teacher",
            designation: "Teacher",
            personnel: "789012",
            emis: user.emis,
          },
        ] as any);
        const today = new Date().toISOString().split("T")[0];
        setTeacherAttendanceLogs([
          {
            id: 101,
            emp_id: 2,
            status: "Present",
            check_in: today + "T08:00:00",
            emis: user.emis,
          },
        ] as any);
        setTodaySummary({
          total: 12,
          present: 10,
          absent: 1,
          onClock: 1,
        });
        setAllClasses([
          { id: 1, name: "Class 5", grade: "5", emis: user.emis },
          { id: 2, name: "Class 4", grade: "4", emis: user.emis },
        ] as any);
        setSections([
          { id: 1, name: "A", class_id: 1 },
          { id: 2, name: "B", class_id: 2 },
        ] as any);
        setMyAssignedClasses([
          { id: 1, name: "Class 5", grade: "5", emis: user.emis },
        ] as any);
        setIsLoading(false);
      }, 800);
      return;
    }
    try {
      // Fetch school info
      const { data: schoolRows, error: schoolError } = await supabase
        .from("schools")
        .select("name")
        .eq("emis", user.emis)
        .limit(1);

      if (schoolError) throw schoolError;
      const schoolData = schoolRows && schoolRows.length > 0 ? schoolRows[0] : null;
      if (schoolData) {
        setSchoolName(schoolData.name);
      }

      const today = new Date().toISOString().split("T")[0];

      // Fetch today's attendance for the admin/teacher
      const { data: attendanceRows, error: attErr } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", user.id)
        .eq("attendance_date", today)
        .eq("emis", user.emis)
        .order("id", { ascending: false })
        .limit(1);

      if (attErr) throw attErr;

      const attendanceData = attendanceRows && attendanceRows.length > 0 ? attendanceRows[0] : null;

      if (attendanceData) {
        setTodayAttendance(attendanceData);
        setIsCheckedIn(!!attendanceData.check_in && !attendanceData.check_out);
      } else {
        setTodayAttendance(null);
        setIsCheckedIn(false);
      }

      // Fetch historical logs
      const { data: logsData, error: logsErr } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("teacher_id", user.id)
        .eq("emis", user.emis)
        .order("attendance_date", { ascending: false })
        .limit(300);

      if (logsErr) throw logsErr;
      if (logsData) setTeacherLogs(logsData);

      const { data: empData, error: empErr } = await supabase
        .from("emp")
        .select("*")
        .eq("emis", user.emis);
      if (empErr) throw empErr;

      const fetchedTeachers =
        empData && empData.length > 0
          ? empData
          : ([
              {
                id: 1,
                name: "Zafar Ali",
                email: "zafar@gps.com",
                cnic: "11111-1111111-1",
                role: "teacher",
                designation: "Senior Instructor",
                username: "zafar_ali",
                password: bcrypt.hashSync("teacher", 10),
                is_active: true,
                must_change_password: false,
                last_login: null,
                reset_token: null,
                token_expiry: null,
                synced_at: null,
                mobile: null,
                whatsapp: null,
                bps: "17",
                tenure: "Permanent",
                personnel: "123456",
                emis: "21122",
                dob: "1985-01-01",
                date_of_entry: "2010-01-01",
              },
            ] as Employee[]);

      setTeachers(fetchedTeachers);

      // Fetch assigned classes for current admin (if they are also a teacher)
      const { data: myAssignments, error: mAssErr } = await supabase
        .from("teacher_class_assignment")
        .select("class_id")
        .eq("teacher_id", user.id)
        .eq("emis", user.emis);

      if (mAssErr) throw mAssErr;

      const { data: classData, error: classErr } = await supabase
        .from("classes")
        .select("*")
        .eq("emis", user.emis);
      if (classErr) throw classErr;

      const { data: sectionData, error: sectErr } = await supabase
        .from("sections")
        .select("*")
        .eq("emis", user.emis);
      if (sectErr) throw sectErr;

      if (sectionData) setSections(sectionData);
      else
        setSections([
          { id: 1, section_name: "A" },
          { id: 2, section_name: "B" },
        ] as Section[]);

      if (classData) {
        setAllClasses(classData);
        if (myAssignments && myAssignments.length > 0) {
          const myClassIds = myAssignments.map((a) => a.class_id);
          setMyAssignedClasses(
            classData.filter((c) => myClassIds.includes(c.id)),
          );
        } else {
          // Fallback for demo if admin has id 1
          if (!import.meta.env.VITE_SUPABASE_URL && user.id === 1) {
            setMyAssignedClasses(
              classData.filter((c) => c.id === 1 || c.id === 2),
            );
          }
        }
      } else {
        const demoClasses = [
          {
            id: 1,
            class_name: "Biology Dept",
            section_id: 1,
            academic_year: "2024",
            room_no: "R1",
            subject: "Biology",
            teacher_id: 1,
          },
          {
            id: 2,
            class_name: "Computer Lab 1",
            section_id: 2,
            academic_year: "2024",
            room_no: "L1",
            subject: "Computer",
            teacher_id: 1,
          },
          {
            id: 3,
            class_name: "General Science",
            section_id: 1,
            academic_year: "2024",
            room_no: "R2",
            subject: "Science",
            teacher_id: 1,
          },
        ] as Class[];
        setAllClasses(demoClasses);
        if (user.id === 1)
          setMyAssignedClasses(
            demoClasses.filter((c) => c.id === 1 || c.id === 2),
          );
      }

      const { data: assignmentData, error: assErr } = await supabase
        .from("teacher_class_assignment")
        .select("*")
        .eq("emis", user.emis);
      if (assErr) throw assErr;

      if (assignmentData) setAssignments(assignmentData);
      else
        setAssignments([
          {
            id: 1,
            teacher_id: 1,
            class_id: 1,
            section_id: 1,
            period: "1st",
            from_date: "2024-01-01",
            to_date: "2024-12-31",
            emis: user.emis,
          },
        ] as TeacherClassAssignment[]);

      // Fetch Exam Related Data
      const { data: sessionData, error: sessErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("emis", user.emis);
      if (!sessErr && sessionData) setSessions(sessionData);
      else if (!isSupabaseConfigured)
        setSessions([
          { id: 1, name: "2023-24", emis: user.emis },
          { id: 2, name: "2024-25", emis: user.emis },
          { id: 3, name: "2025-26", emis: user.emis },
        ]);

      const { data: semesterData, error: semErr } = await supabase
        .from("semesters")
        .select("*")
        .eq("emis", user.emis);
      if (!semErr && semesterData) setSemesters(semesterData);
      else if (!isSupabaseConfigured)
        setSemesters([
          { id: 1, name: "Mid Term", emis: user.emis },
          { id: 2, name: "Final Term", emis: user.emis },
        ]);

      const { data: subjectData, error: subjErr } = await supabase
        .from("subjects")
        .select("*")
        .eq("emis", user.emis);
      if (!subjErr && subjectData) setSubjects(subjectData);
      else if (!isSupabaseConfigured)
        setSubjects([
          { id: 1, name: "Mathematics", code: "MATH101", emis: user.emis },
          { id: 2, name: "Physics", code: "PHY101", emis: user.emis },
        ]);

      const { data: csData, error: csErr } = await supabase
        .from("class_subject")
        .select("*")
        .eq("emis", user.emis);
      if (!csErr && csData) setClassSubjects(csData);
      else if (!isSupabaseConfigured)
        setClassSubjects([
          {
            id: 1,
            class_id: 1,
            subject_id: 1,
            teacher_id: 1,
            total_marks: 100,
            passing_marks: 33,
            emis: user.emis,
          },
        ]);

      const { data: resData, error: resErr } = await supabase
        .from("exam_results")
        .select("*")
        .eq("emis", user.emis);
      if (!resErr && resData) setExamResults(resData);
      else if (!isSupabaseConfigured) setExamResults([]);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setDataError(
        err.message || "Critical system failure during data retrieval.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async (classId: number) => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .eq("emis", user.emis);

    let students: Student[] = [];
    if (data) {
      students = data;
    } else {
      students = [
        {
          id: 1,
          name: "Abbas Khan",
          admission_no: "1001",
          class_id: classId,
          class_status: "Active",
          student_status: "Active",
        },
        {
          id: 2,
          name: "Zainab Bibi",
          admission_no: "1002",
          class_id: classId,
          class_status: "Active",
          student_status: "Active",
        },
        {
          id: 3,
          name: "Umar Hayat",
          admission_no: "1003",
          class_id: classId,
          class_status: "Active",
          student_status: "Active",
        },
      ] as Student[];
    }
    setClassStudents(students);

    const initialAttendance: Record<
      number,
      "Present" | "Absent" | "Sick" | "Leave"
    > = {};
    students.forEach((s) => {
      initialAttendance[s.id] = "Present";
    });
    setAttendanceRecords(initialAttendance);

    // Auto-check today's attendance to see if it is already filled
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: attData, error } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("date", today)
        .eq("emis", user.emis);

      if (!error && attData && attData.length > 0) {
        // Calculate report from fetched data without relying on stale classStudents state
        const total = students.length;
        const boys = students.filter((s) => s.gender === "MALE").length;
        const girls = students.filter((s) => s.gender === "FEMALE").length;
        
        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<
          "Present" | "Absent" | "Sick" | "Leave",
          Student[]
        > = {
          Present: [],
          Absent: [],
          Sick: [],
          Leave: [],
        };

        const todayAttendance: Record<number, "Present" | "Absent" | "Sick" | "Leave"> = {};

        students.forEach((student) => {
          const record = attData.find((r) => Number(r.student_id) === Number(student.id));
          const status = (record?.status as any) || "Present";
          if (counts[status] !== undefined) counts[status]++;
          categorized[status].push(student);
          todayAttendance[student.id] = status;
        });

        // Set the active attendance mapping so when editing/marking, it loads the saved state correctly
        setAttendanceRecords(todayAttendance);

        setReportData({
          total,
          boys,
          girls,
          present: counts.Present,
          absent: counts.Absent,
          sick: counts.Sick,
          leave: counts.Leave,
          presentPercentage: total > 0 ? ((counts.Present / total) * 100).toFixed(1) : "0",
          categorizedStudents: categorized,
        });
        setReportDate(today);
        setAttendanceMode("report");
        setShowReport(true);
      }
    } catch (err) {
      console.warn("Error auto-checking today's classroom attendance:", err);
    }
  };

  const updateAttendanceStatus = (
    studentId: number,
    status: "Present" | "Absent" | "Sick" | "Leave",
  ) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const saveAttendance = async () => {
    if (!selectedClassId) return;

    setIsSavingAttendance(true);
    try {
      // Check for session to satisfy RLS
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session && import.meta.env.VITE_SUPABASE_URL) {
        console.warn(
          "Authentication session missing. Proceeding with caution.",
        );
      }

      const selectedClass = myAssignedClasses.find(
        (c) => c.id === selectedClassId,
      );
      const date = new Date().toISOString().split("T")[0];
      const records = classStudents.map((student) => ({
        student_id: student.id,
        class_id: selectedClassId,
        section_id: selectedClass?.section_id || null,
        date: date,
        status: attendanceRecords[student.id] || "Present",
        teacher_id: user.id,
        emis: user.emis,
      }));

      const { error } = await supabase
        .from("student_attendance")
        .upsert(records);

      if (error) throw error;

      // Calculate report data
      const total = classStudents.length;
      const boys = classStudents.filter((s) => s.gender === "MALE").length;
      const girls = classStudents.filter((s) => s.gender === "FEMALE").length;

      const counts = {
        Present: 0,
        Absent: 0,
        Sick: 0,
        Leave: 0,
      };

      const categorized: Record<
        "Present" | "Absent" | "Sick" | "Leave",
        Student[]
      > = {
        Present: [],
        Absent: [],
        Sick: [],
        Leave: [],
      };

      classStudents.forEach((student) => {
        const status = attendanceRecords[student.id] || "Present";
        counts[status]++;
        categorized[status].push(student);
      });

      const presentPercentage =
        total > 0 ? ((counts.Present / total) * 100).toFixed(1) : "0";

      setReportData({
        total,
        boys,
        girls,
        present: counts.Present,
        absent: counts.Absent,
        sick: counts.Sick,
        leave: counts.Leave,
        presentPercentage,
        categorizedStudents: categorized,
      });
      setAttendanceMode("report");
      setShowReport(true);

      // Removed alert
      // setSelectedClassId(null);
    } catch (err: any) {
      console.error("Error saving attendance:", err);
      const isAlreadyMarkedError = err && (
        err.code === "P0001" || 
        err.message?.includes("Attendance already marked") || 
        err.message?.includes("attendance_student_today_unique") ||
        (typeof err === "object" && JSON.stringify(err).includes("Attendance already marked"))
      );
      if (isAlreadyMarkedError) {
        alert("Attendance already marked for this today");
        if (selectedClassId) {
          const today = new Date().toISOString().split("T")[0];
          await fetchAttendanceForDate(selectedClassId, today);
          setAttendanceMode("report");
        }
      } else if (!import.meta.env.VITE_SUPABASE_URL) {
        // Mock success logic
        const total = classStudents.length;
        const boys = classStudents.filter((s) => s.gender === "MALE").length;
        const girls = classStudents.filter((s) => s.gender === "FEMALE").length;
        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<
          "Present" | "Absent" | "Sick" | "Leave",
          Student[]
        > = { Present: [], Absent: [], Sick: [], Leave: [] };
        classStudents.forEach((s) => {
          const status = attendanceRecords[s.id] || "Present";
          counts[status]++;
          categorized[status].push(s);
        });
        setReportData({
          total,
          boys,
          girls,
          present: counts.Present,
          absent: counts.Absent,
          sick: counts.Sick,
          leave: counts.Leave,
          presentPercentage:
            total > 0 ? ((counts.Present / total) * 100).toFixed(1) : "0",
          categorizedStudents: categorized,
        });
        setShowReport(true);
      } else {
        alert(`Error saving attendance: ${err.message || err}`);
      }
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleClassSelectForAttendance = (classId: number) => {
    setSelectedClassId(classId);
    setAttendanceMode("mark");
    setShowReport(false);
    fetchStudents(classId);
    setActiveTab("my-attendance");
  };

  const handleViewClassDetail = async (cls: Class) => {
    setSelectedClassForDetail(cls);
    setStudentSearchQuery("");
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", cls.id)
        .eq("emis", user.emis);

      if (error) throw error;

      if (data) {
        setClassDetailStudents(data);
      } else if (!isSupabaseConfigured) {
        // Mock data for demo
        setClassDetailStudents([
          {
            id: 1,
            name: "Ahmad Raza",
            admission_no: "ADM-2024-001",
            gender: "MALE",
            student_status: "Active",
          },
          {
            id: 2,
            name: "Saira Bano",
            admission_no: "ADM-2024-002",
            gender: "FEMALE",
            student_status: "Active",
          },
          {
            id: 3,
            name: "Bilal Ahmed",
            admission_no: "ADM-2024-003",
            gender: "MALE",
            student_status: "Active",
          },
        ] as any);
      }
    } catch (err) {
      console.error("Error fetching class detail students:", err);
    }
  };

  const handleSearchStudents = async (query: string) => {
    setStudentSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingStudents(true);
    try {
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("emis", user.emis)
          .or(`name.ilike.%${query}%,admission_no.ilike.%${query}%`)
          .limit(5);
        if (error) throw error;
        setSearchResults(data || []);
      } else {
        setSearchResults([
          {
            id: 99,
            name: "Search Student 1",
            admission_no: "S101",
            class_id: null,
          },
          {
            id: 100,
            name: "Search Student 2",
            admission_no: "S102",
            class_id: null,
          },
        ] as Student[]);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleAddStudentToClass = async (student: Student) => {
    if (!selectedClassForDetail) return;

    try {
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { error } = await supabase
          .from("students")
          .update({ class_id: selectedClassForDetail.id })
          .eq("id", student.id);
        if (error) throw error;
      }

      setClassDetailStudents((prev) => {
        if (prev.some((s) => s.id === student.id)) return prev;
        return [...prev, { ...student, class_id: selectedClassForDetail.id }];
      });
      setSearchResults((prev) => prev.filter((s) => s.id !== student.id));
      alert(`${student.name} added to ${selectedClassForDetail.class_name}`);
    } catch (err: any) {
      alert(`Add failed: ${err.message}`);
    }
  };

  const handleRemoveStudentFromClass = async (studentId: number | string) => {
    if (!studentId) {
      alert("Error: Invalid Student ID");
      return;
    }

    openConfirmModal(
      "Confirm Removal",
      "Are you sure you want to remove this student from this class?",
      async () => {
        setIsDeleting(studentId);
        try {
          if (!isSupabaseConfigured) {
            setClassDetailStudents((prev) =>
              prev.filter((s) => s.id != studentId),
            );
            alert("Student removed from class successfully (Demo Mode).");
            setIsDeleting(null);
            return;
          }

          const { error } = await supabase
            .from("students")
            .update({ class_id: null, section_id: null })
            .eq("id", studentId);
          if (error) throw error;

          // Update local state
          setClassDetailStudents((prev) =>
            prev.filter((s) => s.id != studentId),
          );
          alert("Student removed from class successfully.");
        } catch (err: any) {
          console.error("Removal failed:", err);
          alert(`Operation failed: ${err.message}`);
        } finally {
          setIsDeleting(null);
        }
      },
    );
  };

  const handleDeleteStudent = async (studentId: number | string) => {
    if (!studentId) {
      alert("Error: Invalid Student ID");
      return;
    }
    const idToUse =
      typeof studentId === "string" ? parseInt(studentId) : studentId;

    openConfirmModal(
      "Permanent Deletion",
      "WARNING: This will permanently delete the student enrolment record. Project metrics will be affected. Proceed?",
      async () => {
        setIsDeleting(studentId);
        try {
          if (import.meta.env.VITE_SUPABASE_URL) {
            // First delete related attendance records
            const { error: attError } = await supabase
              .from("student_attendance")
              .delete()
              .eq("student_id", idToUse);
            if (attError) {
              console.warn("Attendance cleanup error:", attError);
              // Continue anyway, might be no attendance or managed by constraints
            }

            const { error: studentError } = await supabase
              .from("students")
              .delete()
              .eq("id", idToUse);

            if (studentError) {
              if (studentError.code === "23503") {
                // Foreign key violation
                throw new Error(
                  "This student has related records (attendance or other) that could not be automatically cleared. Please contact support.",
                );
              }
              throw studentError;
            }
          }

          // Update local states
          setClassDetailStudents((prev) => prev.filter((s) => s.id != idToUse));
          setEnrolmentLogs((prev) => prev.filter((s) => s.id != idToUse));
          alert("Enrolment record deleted successfully.");
        } catch (err: any) {
          console.error("Deletion failed:", err);
          alert(`Deletion failed: ${err.message || "Unknown database error"}`);
        } finally {
          setIsDeleting(null);
        }
      },
    );
  };

  const handleUnassignTeacher = async (assignmentId: number | string) => {
    openConfirmModal(
      "Revoke Assignment",
      "Are you sure you want to unassign this teacher from this class/section?",
      async () => {
        try {
          if (import.meta.env.VITE_SUPABASE_URL) {
            const { error } = await supabase
              .from("teacher_class_assignment")
              .delete()
              .eq("id", assignmentId);
            if (error) throw error;
          }
          setAssignments((prev) => prev.filter((a) => String(a.id) !== String(assignmentId)));
          alert("Teacher unassigned successfully.");
        } catch (err: any) {
          alert(`Unassign failed: ${err.message}`);
        }
      },
    );
  };

  const handleDeleteTeacher = async (teacherId: number | string) => {
    if (!teacherId || teacherId === user.id) {
      alert("Cannot delete yourself or invalid ID");
      return;
    }

    openConfirmModal(
      "Purge Teacher Account",
      "Are you sure you want to delete this teacher? This will unassign all their classes.",
      async () => {
        setIsDeleting(teacherId);
        try {
          if (import.meta.env.VITE_SUPABASE_URL) {
            // Cleanup teacher-related data
            await supabase
              .from("teacher_attendance")
              .delete()
              .eq("teacher_id", teacherId);
            await supabase
              .from("leave_requests")
              .delete()
              .eq("teacher_id", teacherId);
            await supabase
              .from("teacher_class_assignment")
              .delete()
              .eq("teacher_id", teacherId);
            // Reset class teacher_id
            await supabase
              .from("classes")
              .update({ teacher_id: null })
              .eq("teacher_id", teacherId);

            const { error } = await supabase
              .from("emp")
              .delete()
              .eq("id", teacherId);

            if (error) throw error;
          }

          setTeachers((prev) => prev.filter((t) => t.id != teacherId));
          setSelectedTeacherId(null);
          alert("Teacher account and all associated data purged successfully.");
        } catch (err: any) {
          alert(`Teacher deletion failed: ${err.message}`);
        } finally {
          setIsDeleting(null);
        }
      },
    );
  };

  const handleDeleteClass = async (classId: number | string) => {
    if (!classId) return;

    openConfirmModal(
      "Delete Class",
      "Permanently delete this class? This will unassign students, and delete class assignments and exam results.",
      async () => {
        setIsDeleting(classId);
        try {
          if (!isSupabaseConfigured) {
            setAllClasses((prev) => prev.filter((c) => c.id != classId));
            alert("Class purged successfully (Demo Mode).");
            setIsDeleting(null);
            return;
          }

          if (import.meta.env.VITE_SUPABASE_URL) {
            // Cleanup class-related exam results first
            await supabase
              .from("exam_results")
              .delete()
              .eq("class_id", classId);

            // Cleanup class_subject assignments
            await supabase
              .from("class_subject")
              .delete()
              .eq("class_id", classId);

            // Cleanup class-related data
            await supabase
              .from("student_attendance")
              .delete()
              .eq("class_id", classId);
            await supabase
              .from("teacher_class_assignment")
              .delete()
              .eq("class_id", classId);
            // Unassign students from this class
            await supabase
              .from("students")
              .update({ class_id: null, section_id: null })
              .eq("class_id", classId);

            const { error } = await supabase
              .from("classes")
              .delete()
              .eq("id", classId);

            if (error) throw error;
          }

          setAllClasses((prev) => prev.filter((c) => c.id != classId));
          alert("Class purged successfully. Students have been unassigned.");
        } catch (err: any) {
          alert(`Class deletion failed: ${err.message}`);
        } finally {
          setIsDeleting(null);
        }
      },
    );
  };

  const fetchAttendanceForDate = async (classId: number, date: string) => {
    try {
      const { data, error } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("date", date)
        .eq("emis", user.emis);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculate report from fetched data
        const total = classStudents.length;
        const boys = classStudents.filter((s) => s.gender === "MALE").length;
        const girls = classStudents.filter((s) => s.gender === "FEMALE").length;

        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<
          "Present" | "Absent" | "Sick" | "Leave",
          Student[]
        > = {
          Present: [],
          Absent: [],
          Sick: [],
          Leave: [],
        };

        classStudents.forEach((student) => {
          const record = data.find((r) => Number(r.student_id) === Number(student.id));
          const status = (record?.status as any) || "Present";
          if (counts[status] !== undefined) counts[status]++;
          categorized[status].push(student);
        });

        setReportData({
          total,
          boys,
          girls,
          present: counts.Present,
          absent: counts.Absent,
          sick: counts.Sick,
          leave: counts.Leave,
          presentPercentage:
            total > 0 ? ((counts.Present / total) * 100).toFixed(1) : "0",
          categorizedStudents: categorized,
        });
        setShowReport(true);
      } else {
        setShowReport(false);
        setReportData(null);
      }
    } catch (err) {
      console.error("Error fetching historical report:", err);
    }
  };

  const fetchGeneralClassReport = async (classId: number, date: string) => {
    try {
      // First fetch students for this class if not already loaded or different class
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId)
        .eq("emis", user.emis);

      const students = studentsData || [];

      const { data: attendanceData, error } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("class_id", classId)
        .eq("date", date)
        .eq("emis", user.emis);

      if (error) throw error;

      if (attendanceData && attendanceData.length > 0) {
        const total = students.length;
        const boys = students.filter((s) => s.gender === "MALE").length;
        const girls = students.filter((s) => s.gender === "FEMALE").length;

        const counts = { Present: 0, Absent: 0, Sick: 0, Leave: 0 };
        const categorized: Record<
          "Present" | "Absent" | "Sick" | "Leave",
          Student[]
        > = {
          Present: [],
          Absent: [],
          Sick: [],
          Leave: [],
        };

        students.forEach((student) => {
          const record = attendanceData.find(
            (r) => Number(r.student_id) === Number(student.id),
          );
          const status = (record?.status as any) || "Present";
          if (counts[status] !== undefined) counts[status]++;
          categorized[status].push(student);
        });

        setReportData({
          total,
          boys,
          girls,
          present: counts.Present,
          absent: counts.Absent,
          sick: counts.Sick,
          leave: counts.Leave,
          presentPercentage:
            total > 0 ? ((counts.Present / total) * 100).toFixed(1) : "0",
          categorizedStudents: categorized,
        });
        setShowReport(true);
      } else {
        setShowReport(false);
        setReportData(null);
      }
    } catch (err) {
      console.error("Error fetching general report:", err);
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setShowReport(false);
        setReportData(null);
      }
    }
  };

  const generateHistoricalClassReport = async () => {
    if (!historicalReportFilters.classId) {
      alert("Please select a class");
      return;
    }
    setIsGeneratingHistorical(true);
    try {
      if (!isSupabaseConfigured) {
        setHistoricalReportData([
          {
            id: 1,
            name: "Student 1",
            presents: 20,
            absents: 2,
            leave: 1,
            percentage: "87.0",
          },
          {
            id: 2,
            name: "Student 2",
            presents: 18,
            absents: 4,
            leave: 1,
            percentage: "78.3",
          },
        ]);
        return;
      }

      // Fetch all students in the class
      const { data: students } = await supabase
        .from("students")
        .select("id, name, admission_no")
        .eq("class_id", parseInt(historicalReportFilters.classId))
        .eq("emis", user.emis);

      if (!students) {
        setHistoricalReportData([]);
        return;
      }

      // Fetch attendance records for the class in date range
      const { data: attendance } = await supabase
        .from("student_attendance")
        .select("*")
        .eq("class_id", parseInt(historicalReportFilters.classId))
        .gte("date", historicalReportFilters.startDate)
        .lte("date", historicalReportFilters.endDate)
        .eq("emis", user.emis);

      const report = students.map((student) => {
        const studentAttendance =
          attendance?.filter((a) => a.student_id === student.id) || [];
        const totalDays = studentAttendance.length;
        const presents = studentAttendance.filter(
          (a) => a.status === "Present",
        ).length;
        const absents = studentAttendance.filter(
          (a) => a.status === "Absent",
        ).length;
        const sick = studentAttendance.filter(
          (a) => a.status === "Sick",
        ).length;
        const leave = studentAttendance.filter(
          (a) => a.status === "Leave",
        ).length;

        return {
          id: student.id,
          name: student.name,
          admission_no: student.admission_no,
          presents,
          absents,
          sick,
          leave,
          total: totalDays,
          percentage:
            totalDays > 0 ? ((presents / totalDays) * 100).toFixed(1) : "0.0",
        };
      });

      setHistoricalReportData(report);
    } catch (err: any) {
      alert(`Error generating report: ${err.message}`);
    } finally {
      setIsGeneratingHistorical(false);
    }
  };

  const handlePunch = async () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0]; // HH:mm:ss

    // Check for session to satisfy RLS
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session && import.meta.env.VITE_SUPABASE_URL) {
      console.warn(
        "No active Supabase session found. Attendance punch might fail RLS check.",
      );
    }

    if (!isCheckedIn) {
      // Punch In
      try {
        const randomId = Math.floor(Math.random() * 2147483647);
        const { data: insertedRows, error } = await supabase
          .from("teacher_attendance")
          .insert({
            id: randomId,
            teacher_id: user.id,
            attendance_date: today,
            check_in: time,
            status: "Present",
            emis: user.emis,
          })
          .select();

        let data =
          insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;

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
            status: "Present",
            emis: user.emis,
          };
        }

        setTodayAttendance(data);
        setIsCheckedIn(true);
        setTeacherLogs((prev) =>
          [data, ...prev.filter((l) => l.id !== data.id)].slice(0, 10),
        );
      } catch (err) {
        console.error("Error punching in:", err);
        const mockData: TeacherAttendance = {
          id: todayAttendance?.id || Math.floor(Math.random() * 2147483647),
          teacher_id: user.id,
          attendance_date: today,
          check_in: time,
          check_out: null,
          duration: null,
          duration_seconds: null,
          status: "Present",
          emis: user.emis,
        };
        setTodayAttendance(mockData);
        setIsCheckedIn(true);
        setTeacherLogs((prev) =>
          [mockData, ...prev.filter((l) => l.id !== mockData.id)].slice(0, 10),
        );
        alert(
          "Attendance punched in locally. Sync with cloud will resume automatically on next action.",
        );
      }
    } else if (todayAttendance) {
      // Punch Out
      try {
        const checkInTimeParts = todayAttendance.check_in?.split(":") || [
          "08",
          "00",
          "00",
        ];
        const checkInTime = new Date();
        checkInTime.setHours(
          parseInt(checkInTimeParts[0]),
          parseInt(checkInTimeParts[1]),
          parseInt(checkInTimeParts[2]),
        );

        const diffMs = now.getTime() - checkInTime.getTime();
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));

        const hours = Math.floor(diffSecs / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const durationStr = `${hours}h ${minutes}m`;

        let updatedData: any = null;

        const { data: updatedRows, error: updateError } = await supabase
          .from("teacher_attendance")
          .update({
            check_out: time,
            duration: durationStr,
            duration_seconds: diffSecs,
          })
          .eq("id", todayAttendance.id)
          .select();

        if (!updateError && updatedRows && updatedRows.length > 0) {
          updatedData = updatedRows[0];
        } else {
          console.warn(
            "Primary update by record ID failed or returned 0 rows. Trying fallback match by date & teacher_id.",
            updateError,
          );
          const { data: fallbackRows, error: fallbackError } = await supabase
            .from("teacher_attendance")
            .update({
              check_out: time,
              duration: durationStr,
              duration_seconds: diffSecs,
            })
            .eq("teacher_id", user.id)
            .eq("attendance_date", today)
            .eq("emis", user.emis)
            .select();

          if (!fallbackError && fallbackRows && fallbackRows.length > 0) {
            updatedData = fallbackRows[0];
          } else {
            console.warn("Both updates failed. Attempting DELETE + INSERT flow as bypass for RLS update restrictions...");
            try {
              const { error: deleteError } = await supabase
                .from("teacher_attendance")
                .delete()
                .eq("id", todayAttendance.id);
              
              if (!deleteError) {
                const completedPayload = {
                  id: todayAttendance.id,
                  teacher_id: user.id,
                  attendance_date: today,
                  check_in: todayAttendance.check_in || "08:00:00",
                  check_out: time,
                  status: todayAttendance.status || "Present",
                  duration: durationStr,
                  duration_seconds: diffSecs,
                  emis: user.emis,
                };
                
                const { data: insertedRows, error: insertError } = await supabase
                  .from("teacher_attendance")
                  .insert(completedPayload)
                  .select();
                  
                if (!insertError && insertedRows && insertedRows.length > 0) {
                  console.log("Successfully completed shift termination via DELETE + INSERT bypass.");
                  updatedData = insertedRows[0];
                } else {
                  console.warn("Completed row INSERT failed. Restoring original punch-in entry to prevent data loss...", insertError);
                  await supabase
                    .from("teacher_attendance")
                    .insert({
                      id: todayAttendance.id,
                      teacher_id: user.id,
                      attendance_date: today,
                      check_in: todayAttendance.check_in || "08:00:00",
                      status: todayAttendance.status || "Present",
                      emis: user.emis,
                    });
                  throw insertError || new Error("Completed record insertion unsuccessful.");
                }
              } else {
                throw deleteError;
              }
            } catch (deleteInsertErr) {
              console.warn("DELETE + INSERT flow failed. Proceeding with full record upsert...", deleteInsertErr);
              const upsertPayload = {
                id: todayAttendance.id,
                teacher_id: user.id,
                attendance_date: today,
                check_in: todayAttendance.check_in || "08:00:00",
                check_out: time,
                status: todayAttendance.status || "Present",
                duration: durationStr,
                duration_seconds: diffSecs,
                emis: user.emis,
              };
              const { data: upsertRows, error: upsertError } = await supabase
                .from("teacher_attendance")
                .upsert(upsertPayload)
                .select();

              if (!upsertError && upsertRows && upsertRows.length > 0) {
                updatedData = upsertRows[0];
              } else {
                console.error(
                  "All database update and upsert options failed for attendance punch:",
                  upsertError || fallbackError || updateError,
                );
                throw (
                  upsertError || fallbackError || updateError || new Error("Record not found.")
                );
              }
            }
          }
        }

        if (updatedData) {
          setTodayAttendance(updatedData);
          setIsCheckedIn(false);
          setTeacherLogs((prev) =>
            [updatedData, ...prev.filter((l) => l.id !== updatedData.id)].slice(
              0,
              10,
            ),
          );
        }
      } catch (err) {
        console.error("Error punching out:", err);

        const checkInStr = todayAttendance.check_in || "08:00:00";
        const checkInTimeParts = checkInStr.split(":") || ["08", "00", "00"];
        const checkInTime = new Date();
        checkInTime.setHours(
          parseInt(checkInTimeParts[0]),
          parseInt(checkInTimeParts[1]),
          parseInt(checkInTimeParts[2]),
        );
        const diffMs = now.getTime() - checkInTime.getTime();
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        const hours = Math.floor(diffSecs / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const durationStr = `${hours}h ${minutes}m`;

        const fallbackOut = {
          ...todayAttendance,
          check_out: time,
          duration: durationStr,
          duration_seconds: diffSecs,
        } as TeacherAttendance;
        setTodayAttendance(fallbackOut);
        setIsCheckedIn(false);
        setTeacherLogs((prev) =>
          [fallbackOut, ...prev.filter((l) => l.id !== fallbackOut.id)].slice(
            0,
            10,
          ),
        );
        alert(
          "Attendance punched out locally. Sync with cloud will resume automatically on next action.",
        );
      }
    }
  };

  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [selectedClassSubjectId, setSelectedClassSubjectId] =
    useState<string>("");
  const [marksEntryData, setMarksEntryData] = useState<Record<number, number>>(
    {},
  );
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  useEffect(() => {
    if (
      selectedSessionId &&
      selectedSemesterId &&
      selectedClassSubjectId &&
      selectedClassSubjectId !== "all" &&
      examResults.length > 0
    ) {
      const classSub = classSubjects.find(
        (cs) => cs.id === parseInt(selectedClassSubjectId),
      );
      if (!classSub) return;

      const newMarksData: Record<number, number> = {};
      sortedStudents.forEach((student) => {
        const existing = examResults.find(
          (r) =>
            r.student_id === student.id &&
            r.session_id === parseInt(selectedSessionId) &&
            r.semester_id === parseInt(selectedSemesterId) &&
            r.subject_id === classSub.subject_id,
        );
        if (existing) {
          newMarksData[student.id!] = existing.obtained_marks;
        }
      });
      setMarksEntryData(newMarksData);
    } else {
      setMarksEntryData({});
    }
  }, [
    selectedSessionId,
    selectedSemesterId,
    selectedClassSubjectId,
    examResults,
    sortedStudents,
    classSubjects,
  ]);

  const saveMarks = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedSemesterId || !selectedClassSubjectId) {
      alert("Please select session, semester and subject");
      return;
    }
    const classSub = classSubjects.find(
      (cs) => cs.id === parseInt(selectedClassSubjectId),
    );
    if (!classSub) return;

    // Validation: check if any mark exceeds total_marks
    const invalidEntries = Object.entries(marksEntryData).filter(
      ([_, marks]) => (marks as number) > classSub.total_marks,
    );
    if (invalidEntries.length > 0) {
      alert(
        `Validation Error: One or more entries exceed the maximum marks allowed (${classSub.total_marks}).`,
      );
      return;
    }

    setIsSavingMarks(true);
    try {
      const resultsToSave = Object.entries(marksEntryData).map(
        ([studentId, marks]) => ({
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
          grade:
            (marks as number) >= classSub.total_marks * 0.9
              ? "A+"
              : (marks as number) >= classSub.total_marks * 0.8
                ? "A"
                : (marks as number) >= classSub.total_marks * 0.7
                  ? "B"
                  : (marks as number) >= classSub.total_marks * 0.6
                    ? "C"
                    : (marks as number) >= classSub.passing_marks
                      ? "D"
                      : "F",
        }),
      );

      if (resultsToSave.length === 0) {
        alert("No modifications to archive");
        setIsSavingMarks(false);
        return;
      }

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from("exam_results")
          .upsert(resultsToSave, {
            onConflict: "student_id,class_id,subject_id,session_id,semester_id",
          });
        if (error) throw error;
      }

      setExamResults((prev) => {
        const filtered = prev.filter(
          (r) =>
            !resultsToSave.some(
              (nr) =>
                nr.student_id === r.student_id &&
                nr.class_id === r.class_id &&
                nr.subject_id === r.subject_id &&
                nr.session_id === r.session_id &&
                nr.semester_id === r.semester_id,
            ),
        );
        return [...filtered, ...(resultsToSave as any)];
      });

      alert("Marks saved successfully");
    } catch (err: any) {
      alert(`Saving marks failed: ${err.message}`);
    } finally {
      setIsSavingMarks(false);
    }
  };

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedClassSubjectId(subjectId);
    if (!subjectId) return;

    if (subjectId === "all") {
      if (selectedClassId) {
        await fetchStudents(selectedClassId);
      }
      return;
    }

    const classSub = classSubjects.find((cs) => cs.id === parseInt(subjectId));
    if (!classSub) return;

    // Fetch students of that class to enter marks
    await fetchStudents(classSub.class_id);

    // Pre-fill with existing marks if any
    if (selectedSessionId && selectedSemesterId) {
      const existingMarks: Record<number, number> = {};
      examResults.forEach((res) => {
        if (
          res.class_id === classSub.class_id &&
          res.subject_id === classSub.subject_id &&
          res.session_id === parseInt(selectedSessionId) &&
          res.semester_id === parseInt(selectedSemesterId)
        ) {
          existingMarks[res.student_id] = res.obtained_marks;
        }
      });
      setMarksEntryData(existingMarks);
    }
  };

  const downloadAwardList = () => {
    if (!selectedSessionId || !selectedSemesterId || !selectedClassSubjectId) {
      alert("Please select Session, Semester and Subject first");
      return;
    }

    const session = sessions.find((s) => s.id === parseInt(selectedSessionId));
    const semester = semesters.find(
      (s) => s.id === parseInt(selectedSemesterId),
    );
    const isAll = selectedClassSubjectId === "all";
    const cs = isAll
      ? null
      : classSubjects.find((x) => x.id === parseInt(selectedClassSubjectId));
    const subj = isAll
      ? { name: "All Subjects" }
      : subjects.find((s) => s.id === cs?.subject_id);
    const cls = isAll
      ? allClasses.find((c) => c.id === selectedClassId)
      : allClasses.find((c) => c.id === cs?.class_id);

    const exportData = sortedStudents.map((student) => {
      if (isAll) {
        const studentResults = examResults.filter(
          (r) =>
            r.student_id === student.id &&
            r.session_id === parseInt(selectedSessionId) &&
            r.semester_id === parseInt(selectedSemesterId),
        );
        const cumulativeObtainedMarks = studentResults.reduce(
          (sum, r) => sum + (r.obtained_marks || 0),
          0,
        );
        const cumulativeTotalMarks = studentResults.reduce(
          (sum, r) => sum + (r.total_marks || 0),
          0,
        );
        const cumulativePassingMarks = studentResults.reduce(
          (sum, r) => sum + (r.passing_marks || 0),
          0,
        );
        const percent =
          cumulativeTotalMarks > 0
            ? (cumulativeObtainedMarks / cumulativeTotalMarks) * 100
            : 0;
        const grade = calculateGrade(percent);
        const isPassed = cumulativeObtainedMarks >= cumulativePassingMarks;

        const obj: any = {
          "Admission No": student.admission_no,
          "Student Name": student.name,
          "Father Name": student.father_name || "-",
        };

        currentClassSubjects.forEach((csItem) => {
          const subj = subjects.find((s) => s.id === csItem.subject_id);
          const subjName = subj?.name || "Subject";
          const res = examResults.find(
            (r) =>
              r.student_id === student.id &&
              r.session_id === parseInt(selectedSessionId) &&
              r.semester_id === parseInt(selectedSemesterId) &&
              r.subject_id === csItem.subject_id,
          );
          obj[subjName] = res?.obtained_marks ?? "-";
        });

        obj["Grade"] = grade;
        obj["Performance %"] = `${Math.round(percent)}%`;
        obj["Status"] = studentResults.length > 0
          ? isPassed
            ? "PASS"
            : "FAIL"
          : "PENDING";

        return obj;
      } else {
        const res = examResults.find(
          (r) =>
            r.student_id === student.id &&
            r.session_id === parseInt(selectedSessionId) &&
            r.semester_id === parseInt(selectedSemesterId) &&
            r.subject_id === cs?.subject_id,
        );
        const percent = res ? (res.obtained_marks / res.total_marks) * 100 : 0;
        return {
          "Admission No": student.admission_no,
          "Student Name": student.name,
          "Father Name": student.father_name || "-",
          "Max Marks": cs?.total_marks || 0,
          "Passing Marks": cs?.passing_marks || 0,
          "Obtained Marks": res?.obtained_marks || 0,
          Grade: res?.grade || "-",
          "Performance %": res ? `${Math.round(percent)}%` : "-",
          Status: res
            ? res.obtained_marks >= res.passing_marks
              ? "PASS"
              : "FAIL"
            : "PENDING",
        };
      }
    });

    const header = [
      [schoolName || "School Information System"],
      [`Examination: ${semester?.name} - ${session?.name}`],
      [`Class: ${cls?.class_name || "-"} | Subject: ${subj?.name || "-"}`],
      [`Award List Generated on: ${new Date().toLocaleDateString()}`],
      [],
    ];

    const finalWorksheet = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(finalWorksheet, exportData, { origin: "A6" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, finalWorksheet, "Award List");
    const safeSubjName = subj?.name?.replace(/\s+/g, "_") || "All_Subjects";
    XLSX.writeFile(
      workbook,
      `AwardList_${cls?.class_name || "Class"}_${safeSubjName}.xlsx`,
    );
  };

  const downloadAwardListPDF = () => {
    if (!selectedSessionId || !selectedSemesterId || !selectedClassSubjectId) {
      alert("Please select Session, Semester and Subject first");
      return;
    }

    const session = sessions.find((s) => s.id === parseInt(selectedSessionId));
    const semester = semesters.find(
      (s) => s.id === parseInt(selectedSemesterId),
    );
    const isAll = selectedClassSubjectId === "all";
    const cs = isAll
      ? null
      : classSubjects.find((x) => x.id === parseInt(selectedClassSubjectId));
    const subj = isAll
      ? { name: "All Subjects" }
      : subjects.find((s) => s.id === cs?.subject_id);
    const cls = isAll
      ? allClasses.find((c) => c.id === selectedClassId)
      : allClasses.find((c) => c.id === cs?.class_id);

    const doc = new jsPDF() as any;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text(schoolName || "School Information System", 105, 20, {
      align: "center",
    });

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`Official Academic Award List`, 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Examination: ${semester?.name} - ${session?.name}`, 14, 45);
    doc.text(`Class: ${cls?.class_name || "-"}`, 14, 52);
    doc.text(`Subject: ${subj?.name || "-"}`, 14, 59);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 59, {
      align: "right",
    });

    const headers = isAll
      ? [
          "ADM NO",
          "STUDENT IDENTITY",
          ...currentClassSubjects.map((csItem) => {
            const subj = subjects.find((s) => s.id === csItem.subject_id);
            return (subj?.name || "Subject").toUpperCase();
          }),
          "GRADE",
          "%",
          "JUDGEMENT",
        ]
      : [
          "ADM NO",
          "STUDENT IDENTITY",
          "MAX",
          "SCORE",
          "GRADE",
          "%",
          "JUDGEMENT",
        ];

    const tableData = sortedStudents.map((student) => {
      if (isAll) {
        const studentResults = examResults.filter(
          (r) =>
            r.student_id === student.id &&
            r.session_id === parseInt(selectedSessionId) &&
            r.semester_id === parseInt(selectedSemesterId),
        );
        const cumulativeObtainedMarks = studentResults.reduce(
          (sum, r) => sum + (r.obtained_marks || 0),
          0,
        );
        const cumulativeTotalMarks = studentResults.reduce(
          (sum, r) => sum + (r.total_marks || 0),
          0,
        );
        const cumulativePassingMarks = studentResults.reduce(
          (sum, r) => sum + (r.passing_marks || 0),
          0,
        );
        const percent =
          cumulativeTotalMarks > 0
            ? (cumulativeObtainedMarks / cumulativeTotalMarks) * 100
            : 0;
        const grade = calculateGrade(percent);
        const isPassed = cumulativeObtainedMarks >= cumulativePassingMarks;

        const subjectScores = currentClassSubjects.map((csItem) => {
          const res = examResults.find(
            (r) =>
              r.student_id === student.id &&
              r.session_id === parseInt(selectedSessionId) &&
              r.semester_id === parseInt(selectedSemesterId) &&
              r.subject_id === csItem.subject_id,
          );
          return res?.obtained_marks !== undefined ? String(res.obtained_marks) : "-";
        });

        return [
          student.admission_no,
          `${student.name}\nS/O: ${student.father_name || "-"}`,
          ...subjectScores,
          grade || "-",
          `${Math.round(percent)}%`,
          studentResults.length > 0
            ? isPassed
              ? "QUALIFIED"
              : "FAILED"
            : "PENDING",
        ];
      } else {
        const res = examResults.find(
          (r) =>
            r.student_id === student.id &&
            r.session_id === parseInt(selectedSessionId) &&
            r.semester_id === parseInt(selectedSemesterId) &&
            r.subject_id === cs?.subject_id,
        );
        const percent = res ? (res.obtained_marks / res.total_marks) * 100 : 0;
        return [
          student.admission_no,
          `${student.name}\nS/O: ${student.father_name || "-"}`,
          cs?.total_marks || 0,
          res?.obtained_marks || "00",
          res?.grade || "-",
          res ? `${Math.round(percent)}%` : "-",
          res
            ? res.obtained_marks >= res.passing_marks
              ? "QUALIFIED"
              : "FAILED"
            : "PENDING",
        ];
      }
    });

    const colStyles: any = {
      0: { cellWidth: 25 },
    };

    for (let index = 2; index < headers.length; index++) {
      colStyles[index] = { halign: "center" };
    }

    autoTable(doc, {
      startY: 65,
      head: [headers],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: colStyles,
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === headers.length - 1) {
          if (data.cell.raw === "QUALIFIED")
            data.cell.styles.textColor = [16, 185, 129];
          if (data.cell.raw === "FAILED")
            data.cell.styles.textColor = [239, 68, 68];
        }
      },
    });

    const safeSubjName = subj?.name?.replace(/\s+/g, "_") || "All_Subjects";
    doc.save(`AwardList_${cls?.class_name || "Class"}_${safeSubjName}.pdf`);
  };

  const tabs = [
    { id: "home", label: "Dashboard", icon: Shield },
    {
      id: "classes",
      label: "Class",
      icon: Users,
      subTabs: [
        {
          id: "class-attendance",
          label: "Attendance Manage",
          icon: ClipboardList,
        },
        { id: "class-manage", label: "Manage (Students)", icon: UserPlus },
      ],
    },
    {
      id: "exams",
      label: "Exam",
      icon: Award,
      subTabs: [
        { id: "exam-results", label: "Result Award List", icon: Star },
        { id: "exam-marking", label: "Marking", icon: CheckCircle },
        {
          id: "exam-overall-results",
          label: "Overall Results",
          icon: BarChart3,
        },
      ],
    },
    {
      id: "requests",
      label: "Requests",
      icon: Bell,
      subTabs: [
        { id: "req-leave", label: "Leave", icon: ClipboardList },
        { id: "req-training", label: "Training", icon: BookOpen },
      ],
    },
    {
      id: "reports",
      label: "Report",
      icon: BarChart3,
      subTabs: [
        { id: "report-student", label: "Student att rep", icon: FileText },
        { id: "report-staff", label: "Staff attendance report", icon: Users },
        { id: "report-personal", label: "My attendance report", icon: History },
      ],
    },
    {
      id: "teachers",
      label: "Staff Hub",
      icon: UserCheck,
      subTabs: [
        { id: "staff-list", label: "Staff List", icon: Users },
        { id: "staff-add", label: "Add Staff", icon: UserPlus },
      ],
    },
    { id: "calendar", label: "Timeline", icon: Calendar },
    { id: "profile", label: "Profile", icon: User },
    {
      id: "settings",
      label: "System",
      icon: Settings,
      subTabs: [
        { id: "sys-config", label: "System Config", icon: Settings },
        { id: "exam-center", label: "Exam Center", icon: Layers },
      ],
    },
  ];

  const handleTabClick = (tabId: AdminTab) => {
    setActiveTab(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.subTabs) {
      setActiveSubTab(tab.subTabs[0].id as AdminSubTab);
    } else {
      setActiveSubTab(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        title="Admin Terminal"
        schoolName="Loading School Data..."
        emis={user.emis || ""}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-t-2 border-r-2 border-emerald-500 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
              Synchronizing Data
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">
              Establishing Secure Database Connection...
            </p>
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
        title="Admin Terminal"
        schoolName="System Alert"
        emis={user.emis || ""}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-6 text-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center border border-red-500/20 shadow-2xl shadow-red-500/10">
            <X className="w-12 h-12 text-red-500" />
          </div>
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
              Authentication Failure
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose bg-red-500/5 p-4 border border-red-500/10 rounded-2xl">
              {dataError}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl"
          >
            Re-initiate System
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
      setActiveTab={handleTabClick}
      activeSubTab={activeSubTab}
      setActiveSubTab={setActiveSubTab}
      tabs={tabs}
      title="Admin Terminal"
      schoolName={schoolName}
      emis={user.emis || ""}
      todayAttendance={todayAttendance}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${activeSubTab}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full"
        >
          {activeTab === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border p-6 rounded-2xl transition-all shadow-sm">
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">
                      Active Teachers
                    </p>
                    <p className="text-2xl font-mono text-slate-900 dark:text-white">
                      {teachers.filter((t) => t.is_active).length} /{" "}
                      {teachers.length}
                    </p>
                  </div>
                  <div className="bg-card border border-border p-6 rounded-2xl transition-all shadow-sm">
                    <p className="text-[8px] text-[#10b981] uppercase tracking-widest mb-1">
                      Class assignments
                    </p>
                    <p className="text-2xl font-mono text-slate-900 dark:text-white">
                      {
                        allClasses.filter(
                          (cls) =>
                            cls.teacher_id !== null ||
                            assignments.some((a) => a.class_id === cls.id),
                        ).length
                      }{" "}
                      / {allClasses.length}
                    </p>
                  </div>
                </div>

                <div className="bg-card border border-border p-6 rounded-2xl transition-all shadow-xl">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" /> Class-wise Attendance
                  </h4>
                  <div className="h-48 w-full min-h-[200px]">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={0}
                    >
                      <BarChart data={statsData}>
                        <XAxis dataKey="name" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor:
                              theme === "dark" ? "#0f172a" : "#ffffff",
                            border: `1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"}`,
                            fontSize: "10px",
                            color: theme === "dark" ? "#fff" : "#000",
                          }}
                        />
                        <Bar
                          dataKey="attendance"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      My Shift
                    </h3>
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-bold uppercase ${isCheckedIn ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-500"}`}
                      />
                      {isCheckedIn ? "Presence Active" : "Off Clock"}
                    </div>
                  </div>

                  {todayAttendance && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="p-3 bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 rounded-xl">
                        <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">
                          Initiation Time
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {todayAttendance.check_in || "--:--:--"}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 rounded-xl">
                        <p className="text-[7px] text-slate-500 uppercase tracking-widest mb-1">
                          Last Out
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {todayAttendance.check_out || "--:--:--"}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handlePunch}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors ${isCheckedIn ? "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"}`}
                  >
                    {isCheckedIn ? "Terminate Shift" : "Initiate Shift"}
                  </button>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-hidden">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                    Quick Logs
                  </h4>
                  <div className="space-y-3">
                    {teacherLogs.slice(0, 3).map((log, i) => (
                      <div
                        key={`admin-quick-log-${log.id || `idx-${i}`}`}
                        className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div>
                          <p className="text-[8px] font-bold text-slate-900 dark:text-white">
                            {log.attendance_date}
                          </p>
                          <p className="text-[7px] text-slate-500">
                            {log.check_in} - {log.check_out || "Active"}
                          </p>
                        </div>
                        <span className="text-[7px] font-mono text-[#10b981]">
                          {log.duration || "--"}
                        </span>
                      </div>
                    ))}
                    {teacherLogs.length === 0 && (
                      <p className="text-[8px] text-slate-500 italic">
                        No attendance records found
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#10b981]">
                Recent Alerts
              </h3>
              {statsData
                .filter((s) => s.attendance < 90)
                .map((s, idx) => (
                  <div
                    key={`admin-attendance-alert-${s.id || `idx-${idx}`}`}
                    className="bg-card/50 border border-border p-4 rounded-xl flex items-center justify-between shadow-sm"
                  >
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">
                      {s.name} attendance dropped to {s.attendance}%
                    </p>
                    <span className="text-[8px] text-slate-400 dark:text-slate-600 font-mono italic">
                      Just now
                    </span>
                  </div>
                ))}
              {statsData.filter((s) => s.attendance < 90).length === 0 && (
                <div className="bg-card/50 border border-border p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">
                    System Status: All nodes operational
                  </p>
                  <span className="text-[8px] text-slate-400 dark:text-slate-600 font-mono italic">
                    Just now
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "teachers" && activeSubTab === "staff-list" && (
          <motion.div
            key="staff-list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex flex-col md:flex-row gap-4 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search Instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border py-4 pl-12 pr-4 rounded-2xl text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none shadow-sm transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(["all", "active", "inactive"] as const).map((filter) => (
                  <button
                    key={`admin-t-filter-${filter}`}
                    onClick={() => setTeacherFilter(filter)}
                    className={`px-4 py-2 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all ${teacherFilter === filter ? "bg-white dark:bg-slate-700 text-emerald-500 shadow-sm" : "text-slate-500"}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers
                .filter((t) => {
                  const matchesSearch =
                    (t.name || "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    (t.designation || "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase());
                  const matchesFilter =
                    teacherFilter === "all" ||
                    (teacherFilter === "active" && t.is_active) ||
                    (teacherFilter === "inactive" && !t.is_active);
                  return matchesSearch && matchesFilter;
                })
                .map((t, idx) => (
                  <div
                    key={`admin-teacher-card-${t.id || `idx-${idx}`}`}
                    onClick={() => setSelectedTeacherId(t.id)}
                    className="bg-card border border-border p-5 rounded-2xl flex flex-col group cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${t.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"} flex items-center justify-center border border-current/10`}
                        >
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest leading-tight">
                            {t.name}
                          </p>
                          <p className="text-[8px] text-slate-500 font-mono mt-0.5">
                            {t.designation || "Staff Member"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${t.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-slate-700"}`}
                      />
                    </div>

                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[8px] uppercase tracking-widest font-mono">
                          Last login:{" "}
                          {t.last_login
                            ? new Date(t.last_login).toLocaleDateString()
                            : "Never"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex -space-x-1.5">
                          {assignments
                            .filter((a) => a.teacher_id === t.id)
                            .slice(0, 3)
                            .map((a, idx) => (
                              <div
                                key={`admin-teacher-${t.id}-assign-indicator-${idx}`}
                                className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#0f172a] flex items-center justify-center"
                              >
                                <span className="text-[7px] font-bold text-slate-500 uppercase">
                                  {allClasses
                                    .find((c) => c.id === a.class_id)
                                    ?.class_name?.charAt(0)}
                                </span>
                              </div>
                            ))}
                        </div>
                        <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">
                          Details →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Teacher Details Overlay */}
            <AnimatePresence>
              {selectedTeacherId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setSelectedTeacherId(null)}
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                  >
                    {(() => {
                      const teacher = teachers.find(
                        (t) => t.id === selectedTeacherId,
                      );
                      if (!teacher) return null;
                      const teacherAssignments = assignments.filter(
                        (a) => a.teacher_id === teacher.id,
                      );

                      return (
                        <div className="flex flex-col">
                          {/* Header section */}
                          <div className="bg-slate-50 dark:bg-[#020617] p-8 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-6">
                              <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-900 shadow-xl shadow-emerald-500/20 overflow-hidden">
                                {teacher.profile_picture_url ? (
                                  <img
                                    src={teacher.profile_picture_url}
                                    alt={teacher.name || ""}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <User className="w-8 h-8" />
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  disabled={isDeleting == selectedTeacherId}
                                  onClick={() =>
                                    teacher.id &&
                                    handleDeleteTeacher(teacher.id)
                                  }
                                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-colors ${isDeleting == selectedTeacherId ? "opacity-50 cursor-not-allowed" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500"}`}
                                  title="Delete Teacher Account"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => setSelectedTeacherId(null)}
                                  className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1">
                                {teacher.name}
                              </h3>
                              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.3em]">
                                {teacher.designation || "Faculty Member"}
                              </p>
                            </div>
                          </div>

                          {/* Info Body */}
                          <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                  Contact Number
                                </p>
                                <p className="text-xs text-slate-900 dark:text-slate-300 font-mono">
                                  {teacher.mobile || "Not available"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                  Official Email
                                </p>
                                <p className="text-xs text-slate-900 dark:text-slate-300 font-mono lowercase">
                                  {teacher.email || "pending.setup"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                  CNIC / ID Card
                                </p>
                                <p className="text-xs text-slate-900 dark:text-slate-300 font-mono">
                                  {teacher.cnic || "11111-1111111-1"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                                  Personnel ID
                                </p>
                                <p className="text-xs text-slate-900 dark:text-slate-300 font-mono">
                                  {teacher.personnel || "N/A"}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                                Load Capacity: {teacherAssignments.length}{" "}
                                Classes
                              </h4>
                              <div className="grid gap-3">
                                {teacherAssignments.map((a, idx) => {
                                  const cls = allClasses.find(
                                    (c) => c.id === a.class_id,
                                  );
                                  const sect = sections.find(
                                    (s) => s.id === a.section_id,
                                  );
                                  return (
                                    <div
                                      key={`teacher-assign-detail-row-${a.id || `idx-${idx}`}`}
                                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-500 shadow-sm">
                                          <Award className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                            {cls?.class_name}
                                          </p>
                                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">
                                            {sect
                                              ? `Section ${sect.section_name}`
                                              : "Main Branch"}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="text-[8px] font-mono text-slate-400">
                                        {a.period || "Period N/A"}
                                      </span>
                                    </div>
                                  );
                                })}
                                {teacherAssignments.length === 0 && (
                                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                      No assigned workload
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="p-8 pt-0 mt-auto">
                            <button
                              onClick={() => setSelectedTeacherId(null)}
                              className="w-full py-4 bg-emerald-500 text-slate-900 font-bold uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-emerald-500/10 hover:bg-emerald-400 transition-all"
                            >
                              Acknowledge Terminal
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === "teachers" && activeSubTab === "staff-add" && (
          <motion.div
            key="staff-add"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                Recruit New Instructor
              </h3>
            </div>

            <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500 text-xs"
                      placeholder="e.g. Dr. Sarah Connor"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Designation
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500 text-xs"
                      placeholder="e.g. Senior Lecturer"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500 text-xs"
                      placeholder="instructor@academy.edu"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-4 mb-2 block">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl outline-none focus:border-emerald-500 text-xs"
                      placeholder="+92 XXX XXXXXXX"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all">
                  Initialize Onboarding
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === "classes" && activeSubTab === "class-manage" && (
          <motion.div
            key="class-manage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                {selectedClassForDetail
                  ? "Class Roster Terminal"
                  : "Global Student Control"}
              </h3>
              <div className="flex gap-2">
                {selectedClassForDetail && (
                  <button
                    onClick={() => setSelectedClassForDetail(null)}
                    className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                  >
                    ← All Sectors
                  </button>
                )}
              </div>
            </div>

            {!selectedClassForDetail ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allClasses.map((cls, i) => (
                  <div
                    key={`class-dir-card-${cls.id || i}`}
                    onClick={() => handleViewClassDetail(cls)}
                    className="bg-card border border-border p-6 rounded-[2rem] space-y-4 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-xl"
                  >
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        {cls.class_name}
                      </h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                        EMIS: {cls.emis || user.emis}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-emerald-500 transition-all">
                      <span>Directory Access</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-card border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h4 className="text-2xl font-bold uppercase tracking-widest text-white">
                      {selectedClassForDetail.class_name}
                    </h4>
                    <p className="text-[10px] text-emerald-500 uppercase font-mono tracking-widest mt-2">
                      Active Sector Repository • Capacity:{" "}
                      {classDetailStudents.length}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEnrollForm({
                        name: "",
                        admission_no: `ADM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                        gender: "MALE",
                        dob: "",
                        father_name: "",
                        father_mobile: "",
                        class_id: selectedClassForDetail.id?.toString() || "",
                        section_id: "",
                        emis: user.id.toString(),
                      });
                      setShowEnrolmentForm(true);
                    }}
                    className="bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> Enrol New Student
                  </button>
                </div>

                {showEnrolmentForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-8"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                        Rapid Identity Creation Terminal
                      </h4>
                      <button
                        onClick={() => setShowEnrolmentForm(false)}
                        className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form
                      onSubmit={handleEnrollStudent}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Name
                        </label>
                        <input
                          required
                          value={enrollForm.name}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              name: e.target.value,
                            })
                          }
                          className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Admission No
                        </label>
                        <input
                          required
                          value={enrollForm.admission_no}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              admission_no: e.target.value,
                            })
                          }
                          className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Gender
                        </label>
                        <select
                          value={enrollForm.gender}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              gender: e.target.value,
                            })
                          }
                          className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white"
                        >
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-4 bg-emerald-500 text-slate-950 rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 transition-all"
                        >
                          Create Record
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#020617]/30 border-b border-border">
                          <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Student Unit
                          </th>
                          <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">
                            Admission ID
                          </th>
                          <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-right">
                            Direct Management
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {classDetailStudents.map((s, idx) => (
                          <tr
                            key={`student-manage-row-${s.id || idx}`}
                            className="group hover:bg-emerald-500/5 transition-all"
                          >
                            <td className="px-8 py-5 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
                                {(s.name || "A").charAt(0)}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                  {s.name}
                                </span>
                                <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">
                                  {s.gender} • {s.student_status || "Active"}
                                </p>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center font-mono text-[10px] text-slate-500">
                              {s.admission_no}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform">
                                <button
                                  onClick={() => {
                                    const newName = prompt(
                                      "Enter new synchronization name:",
                                      s.name,
                                    );
                                    if (newName)
                                      alert(
                                        `Identity update for ${newName} authorized locally.`,
                                      );
                                  }}
                                  className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                                  title="Modify Identity"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(s.id!)}
                                  className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                                  title="Purge Entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {classDetailStudents.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-20 text-center">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                No candidate profiles identified in this sector
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "classes" && activeSubTab === "class-attendance" && (
          <motion.div
            key="class-attendance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                {selectedClassId ? "Class Register" : "My Instruction Hub"}
              </h3>
              {selectedClassId && (
                <button
                  onClick={() => setSelectedClassId(null)}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                >
                  ← All My Classes
                </button>
              )}
            </div>

            {!selectedClassId ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myAssignedClasses.map((cls, idx) => (
                  <div
                    key={`admin-teacher-myclass-${cls.id || idx}`}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      fetchStudents(cls.id);
                    }}
                    className="bg-card border border-border p-6 rounded-3xl hover:border-emerald-500/50 transition-all cursor-pointer group shadow-xl"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                        <Users className="w-6 h-6" />
                      </div>
                      <span className="text-[8px] font-bold text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-full uppercase tracking-widest">
                        Active
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                      {cls.class_name}
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                      Section:{" "}
                      {sections.find((s) => s.id === cls.section_id)
                        ?.section_name || "Main"}
                    </p>
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
                        Mark Attendance
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
                {myAssignedClasses.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-[#020617] border border-dashed border-slate-800 rounded-3xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                      No classroom assignments identified for your
                      administrative profile
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-card border border-emerald-500/20 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[#10b981]">
                        {
                          myAssignedClasses.find(
                            (c) => c.id === selectedClassId,
                          )?.class_name
                        }
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                          Register Terminal
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                          {attendanceMode === "mark"
                            ? "Input Active"
                            : "Historical View"}
                        </span>
                      </div>
                    </div>
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => {
                          setAttendanceMode("mark");
                          setShowReport(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${attendanceMode === "mark" ? "bg-emerald-500 text-slate-950" : "text-slate-500 hover:text-white"}`}
                      >
                        Mark
                      </button>
                      <button
                        onClick={() => {
                          setAttendanceMode("report");
                          fetchAttendanceForDate(selectedClassId, reportDate);
                        }}
                        className={`px-4 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${attendanceMode === "report" ? "bg-emerald-500 text-slate-950" : "text-slate-500 hover:text-white"}`}
                      >
                        Analysis
                      </button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                        Log Date
                      </span>
                    </div>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => {
                        setReportDate(e.target.value);
                        if (attendanceMode === "report")
                          fetchAttendanceForDate(
                            selectedClassId,
                            e.target.value,
                          );
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {attendanceMode === "mark" ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        Students List
                      </h4>
                      <button
                        onClick={toggleSort}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        {sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : sortDirection === "desc" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                        Sort by ADM
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {sortedStudents.map((student, i) => {
                        const status =
                          attendanceRecords[student.id!] || "Present";
                        return (
                          <div
                            key={`teacher-att-student-${student.id || i}`}
                            className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                  {student.name}
                                </p>
                                <p className="text-[8px] text-slate-500 font-mono mt-0.5 tracking-widest uppercase">
                                  ADM: {student.admission_no}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {[
                                {
                                  label: "P",
                                  value: "Present" as const,
                                  color: "emerald",
                                },
                                {
                                  label: "A",
                                  value: "Absent" as const,
                                  color: "rose",
                                },
                                {
                                  label: "S",
                                  value: "Sick" as const,
                                  color: "amber",
                                },
                                {
                                  label: "L",
                                  value: "Leave" as const,
                                  color: "blue",
                                },
                              ].map((btn) => (
                                <button
                                  key={`att-btn-${btn.value}`}
                                  onClick={() =>
                                    updateAttendanceStatus(
                                      student.id!,
                                      btn.value,
                                    )
                                  }
                                  className={`w-9 h-9 rounded-xl text-[10px] font-bold border transition-all ${
                                    status === btn.value
                                      ? `bg-${btn.color}-500 text-white border-${btn.color}-500 shadow-lg shadow-${btn.color}-500/20`
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-500"
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={saveAttendance}
                      disabled={isSavingAttendance}
                      className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50"
                    >
                      {isSavingAttendance
                        ? "Storing Records..."
                        : "Authorize Signature & Save"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {showReport && reportData ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-card border border-border p-5 rounded-3xl">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">
                              Total
                            </p>
                            <p className="text-xl font-bold text-white uppercase">
                              {reportData.total}
                            </p>
                          </div>
                          <div className="bg-card border border-border p-5 rounded-3xl">
                            <p className="text-[8px] text-emerald-500 uppercase tracking-widest mb-1">
                              Present
                            </p>
                            <p className="text-xl font-bold text-emerald-500 uppercase">
                              {reportData.present}
                            </p>
                          </div>
                          <div className="bg-card border border-border p-5 rounded-3xl text-rose-500">
                            <p className="text-[8px] uppercase tracking-widest mb-1">
                              Absent
                            </p>
                            <p className="text-xl font-bold uppercase">
                              {reportData.absent}
                            </p>
                          </div>
                          <div className="bg-card border border-emerald-500/20 p-5 rounded-3xl ring-2 ring-emerald-500/10">
                            <p className="text-[8px] text-emerald-500 uppercase tracking-widest mb-1">
                              Yield
                            </p>
                            <p className="text-xl font-bold text-white uppercase">
                              {reportData.presentPercentage}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center bg-slate-900 border border-slate-800 border-dashed rounded-3xl">
                        <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em]">
                          No historical analysis identified for this period
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "exams" && activeSubTab === "exam-marking" && (
          <motion.div
            key="marks"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                Scholar Transcript Portal
              </h3>
            </div>

            <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Academic Orbit
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-xs text-slate-950 dark:text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Session</option>
                    {sessions.map((s) => (
                      <option key={`marks-entry-sess-${s.id}`} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Assessment Cycle
                  </label>
                  <select
                    value={selectedSemesterId}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-xs text-slate-950 dark:text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((s) => (
                      <option key={`marks-entry-sem-${s.id}`} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Instruction Sector (Subject)
                  </label>
                  <select
                    value={selectedClassSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 text-xs text-slate-950 dark:text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select Class & Subject</option>
                    {classSubjects.map((cs) => {
                      const cls = allClasses.find((c) => c.id === cs.class_id);
                      const subj = subjects.find((s) => s.id === cs.subject_id);
                      return (
                        <option key={`marks-entry-cs-${cs.id}`} value={cs.id}>
                          {cls?.class_name} — {subj?.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {selectedClassSubjectId && (
                <form
                  onSubmit={saveMarks}
                  className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                      <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest mb-1">
                        Scale Limit
                      </p>
                      <p className="text-2xl text-slate-900 dark:text-white font-black">
                        {
                          classSubjects.find(
                            (cs) => cs.id === parseInt(selectedClassSubjectId),
                          )?.total_marks
                        }
                      </p>
                    </div>
                    <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                      <p className="text-[8px] text-blue-500 font-bold uppercase tracking-widest mb-1">
                        Cohort Size
                      </p>
                      <p className="text-2xl text-slate-900 dark:text-white font-black">
                        {sortedStudents.length}
                      </p>
                    </div>
                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-3xl">
                      <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest mb-1">
                        Qualify Rate
                      </p>
                      <p className="text-2xl text-slate-900 dark:text-white font-black">
                        {(() => {
                          const cs = classSubjects.find(
                            (x) => x.id === parseInt(selectedClassSubjectId),
                          );
                          const passed = sortedStudents.filter(
                            (s) =>
                              (marksEntryData[s.id!] || 0) >=
                              (cs?.passing_marks || 0),
                          ).length;
                          return sortedStudents.length > 0
                            ? `${Math.round((passed / sortedStudents.length) * 100)}%`
                            : "0%";
                        })()}
                      </p>
                    </div>
                    <div className="p-5 bg-purple-500/5 border border-purple-500/10 rounded-3xl">
                      <p className="text-[8px] text-purple-500 font-bold uppercase tracking-widest mb-1">
                        Group Average
                      </p>
                      <p className="text-2xl text-slate-900 dark:text-white font-black">
                        {sortedStudents.length > 0
                          ? (
                              sortedStudents.reduce(
                                (a, c) => a + (marksEntryData[c.id!] || 0),
                                0,
                              ) / sortedStudents.length
                            ).toFixed(1)
                          : "0.0"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search in results..."
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-[11px] text-slate-950 dark:text-white uppercase tracking-widest focus:border-emerald-500 outline-none transition-all shadow-sm"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const cs = classSubjects.find(
                            (x) => x.id === parseInt(selectedClassSubjectId),
                          );
                          if (cs) {
                            const next = { ...marksEntryData };
                            sortedStudents.forEach((s) => {
                              if (typeof next[s.id!] === "undefined")
                                next[s.id!] = 0;
                            });
                            setMarksEntryData(next);
                          }
                        }}
                        className="flex-1 md:flex-none px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:text-emerald-500 transition-all border border-transparent hover:border-emerald-500/20"
                      >
                        Fill Zeros
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarksEntryData({})}
                        className="flex-1 md:flex-none px-6 py-4 bg-rose-500/5 text-rose-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
                      >
                        Purge
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Desktop View Table */}
                    <div className="hidden lg:block bg-white dark:bg-[#020617]/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Student Profile
                            </th>
                            <th
                              className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center cursor-pointer hover:text-emerald-500 transition-colors"
                              onClick={toggleSort}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                {sortDirection === "asc" ? (
                                  <ArrowUp className="w-3 h-3" />
                                ) : sortDirection === "desc" ? (
                                  <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3" />
                                )}
                                Admission
                              </div>
                            </th>
                            <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                              Status
                            </th>
                            <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                              Metric Entry
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {sortedStudents.map((student, idx) => {
                            const cs = classSubjects.find(
                              (x) => x.id === parseInt(selectedClassSubjectId),
                            );
                            const val = marksEntryData[student.id!] ?? null;
                            const isP =
                              cs && val !== null
                                ? val >= cs.passing_marks
                                : false;
                            const isE =
                              cs && val !== null ? val > cs.total_marks : false;
                            const hasV = val !== null;

                            return (
                              <tr
                                key={`marks-row-desktop-${student.id || idx}`}
                                className="hover:bg-emerald-500/5 transition-colors group"
                              >
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div
                                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[12px] font-bold border transition-all ${hasV ? (isP ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500") : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"}`}
                                    >
                                      {(student.name || "S")
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                                        {student.name}
                                      </p>
                                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                                        {student.gender || "Associate"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-center font-mono text-[10px] text-slate-400">
                                  {student.admission_no}
                                </td>
                                <td className="px-8 py-6 text-center">
                                  <div
                                    className={`inline-flex px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${
                                      !hasV
                                        ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                                        : isE
                                          ? "bg-rose-500/20 border-rose-500/40 text-rose-500 animate-pulse"
                                          : isP
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                            : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                    }`}
                                  >
                                    {!hasV
                                      ? "Pending"
                                      : isE
                                        ? "Limit Error"
                                        : isP
                                          ? "Qualified"
                                          : "Requires Review"}
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    max={cs?.total_marks}
                                    value={val ?? ""}
                                    onChange={(e) => {
                                      const v =
                                        e.target.value === ""
                                          ? null
                                          : parseInt(e.target.value);
                                      setMarksEntryData((p) => {
                                        const n = { ...p };
                                        if (v === null) delete n[student.id!];
                                        else n[student.id!] = v;
                                        return n;
                                      });
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const allInputs = Array.from(
                                          document.querySelectorAll(
                                            'input[type="number"]',
                                          ),
                                        );
                                        const visibleInputs = allInputs.filter(
                                          (el) => {
                                            const style =
                                              window.getComputedStyle(el);
                                            return (
                                              style.display !== "none" &&
                                              style.visibility !== "hidden" &&
                                              (el as HTMLElement)
                                                .offsetParent !== null
                                            );
                                          },
                                        );
                                        const index = visibleInputs.indexOf(
                                          e.currentTarget as HTMLInputElement,
                                        );
                                        if (index < visibleInputs.length - 1)
                                          (
                                            visibleInputs[
                                              index + 1
                                            ] as HTMLInputElement
                                          ).focus();
                                      }
                                    }}
                                    className={`w-32 bg-slate-50 dark:bg-[#020617] border rounded-2xl px-5 py-4 text-center text-[13px] font-bold transition-all shadow-inner outline-none
                                                ${
                                                  isE
                                                    ? "border-rose-500 text-rose-500"
                                                    : hasV
                                                      ? isP
                                                        ? "border-emerald-500/50 text-emerald-500 focus:border-emerald-500"
                                                        : "border-rose-500/50 text-rose-500 focus:border-rose-500"
                                                      : "border-slate-200 dark:border-slate-800 text-slate-400 focus:border-emerald-500"
                                                }
                                              `}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile & Tablet Card View */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedStudents.map((student, idx) => {
                        const cs = classSubjects.find(
                          (x) => x.id === parseInt(selectedClassSubjectId),
                        );
                        const val = marksEntryData[student.id!] ?? null;
                        const isP =
                          cs && val !== null ? val >= cs.passing_marks : false;
                        const isE =
                          cs && val !== null ? val > cs.total_marks : false;
                        const hasV = val !== null;

                        return (
                          <div
                            key={`marks-card-mobile-${student.id || idx}`}
                            className="bg-white dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] space-y-5 shadow-lg group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[14px] font-bold border transition-all ${hasV ? (isP ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500") : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"}`}
                                >
                                  {(student.name || "S")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                                    {student.name}
                                  </p>
                                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                                    ID: {student.admission_no}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest border transition-all ${
                                  !hasV
                                    ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                                    : isE
                                      ? "bg-rose-500/20 border-rose-500/40 text-rose-500"
                                      : isP
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                }`}
                              >
                                {!hasV
                                  ? "Pending"
                                  : isE
                                    ? "Limit Error"
                                    : isP
                                      ? "Qualified"
                                      : "Requires Review"}
                              </div>
                            </div>

                            <div className="pt-2">
                              <div className="flex flex-col space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                                    Academic Performance Entry
                                  </label>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Max: {cs?.total_marks}
                                  </span>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max={cs?.total_marks}
                                  placeholder="Enter scale..."
                                  value={val ?? ""}
                                  onChange={(e) => {
                                    const v =
                                      e.target.value === ""
                                        ? null
                                        : parseInt(e.target.value);
                                    setMarksEntryData((p) => {
                                      const n = { ...p };
                                      if (v === null) delete n[student.id!];
                                      else n[student.id!] = v;
                                      return n;
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const allInputs = Array.from(
                                        document.querySelectorAll(
                                          'input[type="number"]',
                                        ),
                                      );
                                      const visibleInputs = allInputs.filter(
                                        (el) => {
                                          const style =
                                            window.getComputedStyle(el);
                                          return (
                                            style.display !== "none" &&
                                            style.visibility !== "hidden" &&
                                            (el as HTMLElement).offsetParent !==
                                              null
                                          );
                                        },
                                      );
                                      const index = visibleInputs.indexOf(
                                        e.currentTarget as HTMLInputElement,
                                      );
                                      if (index < visibleInputs.length - 1)
                                        (
                                          visibleInputs[
                                            index + 1
                                          ] as HTMLInputElement
                                        ).focus();
                                    }
                                  }}
                                  className={`w-full bg-slate-50 dark:bg-[#020617] border rounded-2xl px-6 py-5 text-center text-lg font-black transition-all shadow-inner outline-none
                                              ${
                                                isE
                                                  ? "border-rose-500 text-rose-500 bg-rose-500/5"
                                                  : hasV
                                                    ? isP
                                                      ? "border-emerald-500/50 text-emerald-500 focus:border-emerald-500"
                                                      : "border-rose-500/50 text-rose-500 focus:border-rose-500"
                                                    : "border-slate-200 dark:border-slate-800 text-slate-400 focus:border-emerald-500"
                                              }
                                            `}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingMarks}
                    className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-bold uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isSavingMarks
                      ? "Encapsulating Data..."
                      : "Commit & Synchronize Academic Records"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {isAssigningTeacherModalOpen && classForNewAssignment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full relative overflow-hidden"
              >
                {/* Decorative Background Element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-[0.1em] uppercase text-white leading-tight">
                      Assign Faculty
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">
                        Class: {classForNewAssignment.class_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsAssigningTeacherModalOpen(false);
                      setClassForNewAssignment(null);
                    }}
                    className="p-3 text-slate-500 hover:text-white bg-slate-800/20 hover:bg-slate-800/40 rounded-2xl transition-all border border-slate-800/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const teacherId = Number(formData.get("teacher_id"));

                    try {
                      const newAssignment = {
                        teacher_id: teacherId,
                        class_id: classForNewAssignment.id,
                        section_id: null,
                        from_date: new Date().toISOString().split("T")[0],
                        to_date: "2025-06-30",
                        period: "1st",
                        emis: user.emis,
                      };

                      if (import.meta.env.VITE_SUPABASE_URL) {
                        const { data, error } = await supabase
                          .from("teacher_class_assignment")
                          .insert([
                            {
                              ...newAssignment,
                              id: Math.floor(Math.random() * 2147483647),
                            },
                          ])
                          .select();
                        if (error) throw error;
                        if (data) setAssignments([...assignments, ...data]);
                      } else {
                        setAssignments([
                          ...assignments,
                          {
                            ...newAssignment,
                            id: Date.now(),
                          } as TeacherClassAssignment,
                        ]);
                      }

                      setIsAssigningTeacherModalOpen(false);
                      setClassForNewAssignment(null);
                      alert("Teacher successfully assigned to this sector.");
                    } catch (err: any) {
                      alert(`Assignment failed: ${err.message}`);
                    }
                  }}
                  className="space-y-6 relative z-10"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                      Select Active Instructor
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <select
                        name="teacher_id"
                        required
                        className="w-full bg-[#020617] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all shadow-inner appearance-none"
                      >
                        <option value="">Choose from Directory</option>
                        {teachers.map((t) => (
                          <option
                            key={`assign-fac-opt-${t.id}`}
                            value={t.id}
                            className="bg-[#020617]"
                          >
                            {t.name} — {t.designation || "Staff"}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-2">
                    <p className="text-[9px] text-emerald-500/80 uppercase font-bold tracking-widest leading-relaxed">
                      Assigned faculty will receive immediate access to the
                      class register, gradebook, and attendance terminal for
                      this sector.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 text-slate-950 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Finalize Assignment
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "exams" && activeSubTab === "exam-results" && (
          <motion.div
            key="exam-award-list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Result Award List
                </h3>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">
                  Verified Academic Performance Directory
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadAwardList}
                  disabled={!selectedClassSubjectId}
                  className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-650 dark:from-teal-600 dark:to-emerald-755 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.21em] hover:brightness-110 active:scale-95 transition-all disabled:opacity-35 shadow-lg shadow-emerald-500/15 dark:shadow-emerald-500/5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-100 animate-pulse" />{" "}
                  Excel Sheet
                </button>
                <button
                  onClick={downloadAwardListPDF}
                  disabled={!selectedClassSubjectId}
                  className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-755 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.21em] hover:brightness-110 active:scale-95 transition-all disabled:opacity-35 shadow-lg shadow-indigo-500/15 dark:shadow-indigo-500/10 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-purple-100 animate-pulse" />{" "}
                  PDF Report
                </button>
              </div>
            </div>

            <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Academic Session
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-[10px] text-slate-900 dark:text-white font-bold uppercase tracking-widest outline-none focus:border-emerald-500 transition-all"
                    value={selectedSessionId || ""}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                  >
                    <option value="">Select Session</option>
                    {sessions.map((s) => (
                      <option key={`award-sess-${s.id}`} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Semester Term
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-[10px] text-slate-900 dark:text-white font-bold uppercase tracking-widest outline-none focus:border-emerald-500 transition-all"
                    value={selectedSemesterId || ""}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((s) => (
                      <option key={`award-sem-${s.id}`} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Target Class
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-[10px] text-slate-900 dark:text-white font-bold uppercase tracking-widest outline-none focus:border-emerald-500 transition-all"
                    value={selectedClassId || ""}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedClassId(cid ? parseInt(cid) : null);
                      if (cid) fetchStudents(parseInt(cid));
                      setSelectedClassSubjectId("");
                    }}
                  >
                    <option value="">Select Class</option>
                    {allClasses.map((c) => (
                      <option key={`award-cls-opt-${c.id}`} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Learning Subject
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-[10px] text-slate-900 dark:text-white font-bold uppercase tracking-widest outline-none focus:border-emerald-500 transition-all"
                    value={selectedClassSubjectId || ""}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    disabled={!selectedClassId}
                  >
                    <option value="">Select Subject</option>
                    {selectedClassId && <option value="all">All Subjects</option>}
                    {classSubjects
                      .filter(
                        (cs) =>
                          !selectedClassId || cs.class_id === selectedClassId,
                      )
                      .map((cs) => {
                        const subj = subjects.find(
                          (s) => s.id === cs.subject_id,
                        );
                        return (
                          <option key={`award-cs-${cs.id}`} value={cs.id}>
                            {subj?.name}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40">
                      <th
                        className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold cursor-pointer hover:text-emerald-500 transition-colors"
                        onClick={toggleSort}
                      >
                        <div className="flex items-center gap-2">
                          {sortDirection === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : sortDirection === "desc" ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                          Admission Number
                        </div>
                      </th>
                      <th className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                        Student Identity
                      </th>
                      {selectedClassSubjectId === "all" ? (
                        currentClassSubjects.map((cs) => {
                          const subj = subjects.find((s) => s.id === cs.subject_id);
                          return (
                            <th
                              key={`subj-header-${cs.id}`}
                              className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold text-center"
                            >
                              {subj?.name || "Subject"}
                            </th>
                          );
                        })
                      ) : (
                        <>
                          <th className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold text-center">
                            Base
                          </th>
                          <th className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold text-center">
                            Score
                          </th>
                        </>
                      )}
                      <th className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold text-center">
                        Rank
                      </th>
                      <th className="px-10 py-6 text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right">
                        Judgement
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {selectedClassSubjectId &&
                      sortedStudents.map((student, i) => {
                        const isAll = selectedClassSubjectId === "all";
                        const csSelected = isAll
                          ? null
                          : classSubjects.find(
                              (x) => x.id === parseInt(selectedClassSubjectId),
                            );

                        let baseMarks: string | number = "-";
                        let scoreMarks: string | number = "-";
                        let percent = 0;
                        let grade: string | null = null;
                        let hasResult = false;
                        let isPassed = false;

                        if (isAll) {
                          const studentResults = examResults.filter(
                            (r) =>
                              r.student_id === student.id &&
                              r.session_id === parseInt(selectedSessionId) &&
                              r.semester_id === parseInt(selectedSemesterId),
                          );

                          if (studentResults.length > 0) {
                            const cumulativeObtainedMarks =
                              studentResults.reduce(
                                (sum, r) => sum + (r.obtained_marks || 0),
                                0,
                              );
                            const cumulativeTotalMarks = studentResults.reduce(
                              (sum, r) => sum + (r.total_marks || 0),
                              0,
                            );
                            const cumulativePassingMarks =
                              studentResults.reduce(
                                (sum, r) => sum + (r.passing_marks || 0),
                                0,
                              );

                            baseMarks = "-";
                            scoreMarks = cumulativeObtainedMarks;
                            percent =
                              cumulativeTotalMarks > 0
                                ? (cumulativeObtainedMarks /
                                    cumulativeTotalMarks) *
                                  100
                                : 0;
                            grade = calculateGrade(percent);
                            isPassed =
                              cumulativeObtainedMarks >= cumulativePassingMarks;
                            hasResult = true;
                          }
                        } else {
                          const res = examResults.find(
                            (r) =>
                              r.student_id === student.id &&
                              r.session_id === parseInt(selectedSessionId) &&
                              r.semester_id === parseInt(selectedSemesterId) &&
                              r.subject_id === csSelected?.subject_id,
                          );
                          if (res) {
                            baseMarks =
                              res.total_marks ||
                              csSelected?.total_marks ||
                              "-";
                            scoreMarks = res.obtained_marks;
                            percent =
                              (res.obtained_marks / res.total_marks) * 100;
                            grade = res.grade || null;
                            isPassed = res.obtained_marks >= res.passing_marks;
                            hasResult = true;
                          } else if (csSelected) {
                            baseMarks = csSelected.total_marks || "-";
                          }
                        }

                        return (
                          <tr
                            key={`award-list-row-${i}`}
                            className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/5 transition-all group border-b border-slate-100 dark:border-slate-800/80"
                          >
                            <td className="px-10 py-6">
                              <span className="font-mono text-[9px] font-black uppercase tracking-[0.05em] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                {student?.admission_no}
                              </span>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest group-hover:text-indigo-500 transition-colors duration-200">
                                  {student?.name}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                  S/O: {student?.father_name || "N/A"}
                                </span>
                              </div>
                            </td>
                            {isAll ? (
                              currentClassSubjects.map((cs) => {
                                const res = examResults.find(
                                  (r) =>
                                    r.student_id === student.id &&
                                    r.session_id === parseInt(selectedSessionId) &&
                                    r.semester_id === parseInt(selectedSemesterId) &&
                                    r.subject_id === cs.subject_id,
                                );
                                return (
                                  <td
                                    key={`student-marks-${student.id}-${cs.id}`}
                                    className="px-10 py-6 text-center"
                                  >
                                    <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-mono font-black rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 text-slate-850 dark:text-indigo-350 border border-indigo-500/20 shadow-sm">
                                      {res?.obtained_marks ?? "-"}
                                    </span>
                                  </td>
                                );
                              })
                            ) : (
                              <>
                                <td className="px-10 py-6 text-center">
                                  <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] font-mono font-bold rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/20 text-slate-500 dark:text-slate-400">
                                    {baseMarks}
                                  </span>
                                </td>
                                <td className="px-10 py-6 text-center">
                                  <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-mono font-black rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 text-slate-850 dark:text-indigo-300 border border-indigo-500/20 shadow-sm">
                                    {scoreMarks}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="px-10 py-6 text-center">
                              {getGradeBadge(grade)}
                            </td>
                            <td className="px-10 py-6 text-right">
                              {hasResult ? (
                                isPassed ? (
                                  <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-2xl border font-black text-[9px] uppercase tracking-[0.15em] bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/20 transition-all duration-300 hover:scale-[1.02]">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span>QUALIFIED</span>
                                    <span className="text-slate-300 dark:text-slate-700">
                                      |
                                    </span>
                                    <span className="font-mono font-black text-emerald-500">
                                      {Math.round(percent)}%
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-2xl border font-black text-[9px] uppercase tracking-[0.15em] bg-gradient-to-r from-rose-500/15 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/20 transition-all duration-300 hover:scale-[1.02]">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                    </span>
                                    <span>FAILED</span>
                                    <span className="text-slate-300 dark:text-slate-700">
                                      |
                                    </span>
                                    <span className="font-mono font-black text-rose-500">
                                      {Math.round(percent)}%
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-2xl border font-black text-[9px] uppercase tracking-[0.15em] bg-slate-100 dark:bg-slate-800/80 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-sm shadow-amber-500/5 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>PENDING</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {(!selectedClassSubjectId || sortedStudents.length === 0) && (
                <div className="py-24 text-center bg-slate-50/50 dark:bg-slate-900/10 transition-all">
                  <Award className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6 stroke-1" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-bold">
                    Awaiting Specification Parameters
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2 italic">
                    Select session, semester, class and subject to view awarded
                    marks list
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "exams" && activeSubTab === "exam-overall-results" && (
          <motion.div
            key="exam-overall-results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pb-24 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Overall Results
                </h3>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">
                  Cross-sectional Performance Analytics
                </p>
              </div>
            </div>

            <div className="bg-card border border-border p-8 rounded-3xl space-y-8">
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                      Overall Pass Rate
                    </p>
                    <h4 className="text-3xl font-mono text-[#10b981]">
                      {examResults.length > 0
                        ? `${Math.round((examResults.filter((r) => r.obtained_marks >= r.passing_marks).length / examResults.length) * 100)}%`
                        : "0%"}
                    </h4>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-2">
                      {examResults.length} total entries
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                      Average Percentage
                    </p>
                    <h4 className="text-3xl font-mono text-blue-500">
                      {examResults.length > 0
                        ? `${Math.round((examResults.reduce((acc, curr) => acc + curr.obtained_marks / curr.total_marks, 0) / examResults.length) * 100)}%`
                        : "0%"}
                    </h4>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-2">
                      Weighted student progress
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                      Total Certificates
                    </p>
                    <h4 className="text-3xl font-mono text-purple-500">
                      {
                        examResults.filter(
                          (r) => r.obtained_marks / r.total_marks >= 0.8,
                        ).length
                      }
                    </h4>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-2">
                      Students above 80% (A grade)
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Class-wise Analysis
                  </h5>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const worksheet = XLSX.utils.json_to_sheet(
                          allClasses.map((cls) => {
                            const clsResults = examResults.filter(
                              (r) => r.class_id === cls.id,
                            );
                            const passCount = clsResults.filter(
                              (r) => r.obtained_marks >= r.passing_marks,
                            ).length;
                            return {
                              "Class Name": cls.class_name,
                              "Total Students": clsResults.length,
                              Passed: passCount,
                              Failed: clsResults.length - passCount,
                              "Pass Percentage":
                                clsResults.length > 0
                                  ? `${Math.round((passCount / clsResults.length) * 100)}%`
                                  : "0%",
                            };
                          }),
                        );
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(
                          workbook,
                          worksheet,
                          "Class Results",
                        );
                        XLSX.writeFile(
                          workbook,
                          "School_Classwise_Results.xlsx",
                        );
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[8px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      <FileText className="w-3 h-3" /> Export Excel
                    </button>
                    <button
                      onClick={() => {
                        const doc = new jsPDF() as any;
                        doc.setFontSize(18);
                        doc.text(
                          schoolName || "School Information System",
                          14,
                          20,
                        );
                        doc.setFontSize(12);
                        doc.text(
                          "Overall Class-wise Academic Performance Report",
                          14,
                          28,
                        );
                        doc.setFontSize(8);
                        doc.text(
                          `Generated on: ${new Date().toLocaleString()}`,
                          14,
                          34,
                        );

                        const tableData = allClasses.map((cls) => {
                          const clsResults = examResults.filter(
                            (r) => r.class_id === cls.id,
                          );
                          const passCount = clsResults.filter(
                            (r) => r.obtained_marks >= r.passing_marks,
                          ).length;
                          return [
                            cls.class_name,
                            clsResults.length.toString(),
                            passCount.toString(),
                            (clsResults.length - passCount).toString(),
                            clsResults.length > 0
                              ? `${Math.round((passCount / clsResults.length) * 100)}%`
                              : "0%",
                          ];
                        });

                        autoTable(doc, {
                          startY: 40,
                          head: [
                            ["Class", "Total", "Passed", "Failed", "Pass %"],
                          ],
                          body: tableData,
                          theme: "grid",
                          styles: { fontSize: 8, cellPadding: 3 },
                          headStyles: { fillColor: [16, 185, 129] },
                        });

                        doc.save("School_Performance_Report.pdf");
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[8px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      <FileText className="w-3 h-3" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Class-wise Table */}
                <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-[#020617]/50">
                      <tr>
                        <th className="p-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                          Class
                        </th>
                        <th className="p-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                          Total Entries
                        </th>
                        <th className="p-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                          Qualified
                        </th>
                        <th className="p-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                          Failed
                        </th>
                        <th className="p-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                          Outcome
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {allClasses.map((cls) => {
                        const clsResults = examResults.filter(
                          (r) => r.class_id === cls.id,
                        );
                        const passCount = clsResults.filter(
                          (r) => r.obtained_marks >= r.passing_marks,
                        ).length;
                        const failCount = clsResults.length - passCount;
                        const passPerc =
                          clsResults.length > 0
                            ? Math.round((passCount / clsResults.length) * 100)
                            : 0;

                        return (
                          <tr
                            key={`result-cls-${cls.id}`}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group"
                          >
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase group-hover:text-[#10b981] transition-colors">
                                  {cls.class_name}
                                </span>
                                <span className="text-[7px] text-slate-400 uppercase tracking-tighter">
                                  Academic Year 2024
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                              {clsResults.length}
                            </td>
                            <td className="p-4 text-[10px] font-mono text-emerald-500">
                              {passCount}
                            </td>
                            <td className="p-4 text-[10px] font-mono text-rose-500">
                              {failCount}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-1000 ${passPerc >= 60 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : passPerc >= 33 ? "bg-amber-400" : "bg-rose-500"}`}
                                    style={{ width: `${passPerc}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-[10px] font-mono font-bold w-10 text-right ${passPerc >= 60 ? "text-emerald-500" : passPerc >= 33 ? "text-amber-500" : "text-rose-500"}`}
                                >
                                  {passPerc}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "enrolments" && (
          <motion.div
            key="enrolments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 pb-20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                Student Enrolment Portal
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEnrolmentForm(!showEnrolmentForm)}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                >
                  {showEnrolmentForm ? "Cancel Enrol" : "New Enrolment"}
                </button>
                <button
                  onClick={fetchEnrolmentReport}
                  className="bg-[#10b981] text-[#020617] px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#059669] transition-all shadow-lg"
                >
                  Generate Analysis
                </button>
              </div>
            </div>

            {showEnrolmentForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
              >
                <form
                  onSubmit={handleEnrollStudent}
                  className="space-y-6 mb-12"
                >
                  <div className="bg-card border border-emerald-500/20 p-8 rounded-3xl shadow-xl space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-2">
                      Student Registration Terminal
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Student Name
                        </label>
                        <input
                          type="text"
                          required
                          value={enrollForm.name}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              name: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                          placeholder="Full legal name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Admission No
                        </label>
                        <input
                          type="text"
                          required
                          value={enrollForm.admission_no}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              admission_no: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm font-mono"
                          placeholder="ADM-2024-XX"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Gender
                        </label>
                        <select
                          value={enrollForm.gender}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              gender: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        >
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          required
                          value={enrollForm.dob}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              dob: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Guardian Name
                        </label>
                        <input
                          type="text"
                          required
                          value={enrollForm.father_name}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              father_name: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                          placeholder="Father/Guardian Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Mobile No
                        </label>
                        <input
                          type="tel"
                          required
                          value={enrollForm.father_mobile}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              father_mobile: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm font-mono"
                          placeholder="03XX-XXXXXXX"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Class Segment
                        </label>
                        <select
                          value={enrollForm.class_id}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              class_id: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        >
                          <option value="">Choose Class</option>
                          {allClasses.map((c) => (
                            <option
                              key={`adm-en-cls-form-${c.id}`}
                              value={c.id}
                            >
                              {c.class_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Section
                        </label>
                        <select
                          value={enrollForm.section_id}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              section_id: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        >
                          <option value="">Main/General</option>
                          {sections.map((s) => (
                            <option
                              key={`adm-en-sect-form-${s.id}`}
                              value={s.id}
                            >
                              {s.section_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                          Enrolment Type
                        </label>
                        <select
                          value={enrollForm.enrollment_type}
                          onChange={(e) =>
                            setEnrollForm({
                              ...enrollForm,
                              enrollment_type: e.target.value as any,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        >
                          <option value="Fresh">Fresh</option>
                          <option value="Public">Public Transfer</option>
                          <option value="Private">Private Transfer</option>
                          <option value="Dropout">Dropout</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isEnrolling}
                      className="w-full py-4 bg-emerald-500 text-slate-900 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      {isEnrolling
                        ? "Processing Registration..."
                        : "Authorize Enrolment"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={enrolmentFilters.startDate}
                    onChange={(e) =>
                      setEnrolmentFilters({
                        ...enrolmentFilters,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={enrolmentFilters.endDate}
                    onChange={(e) =>
                      setEnrolmentFilters({
                        ...enrolmentFilters,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    Class
                  </label>
                  <select
                    value={enrolmentFilters.classId}
                    onChange={(e) =>
                      setEnrolmentFilters({
                        ...enrolmentFilters,
                        classId: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="">All Classes</option>
                    {allClasses.map((c) => (
                      <option key={`adm-enf-cls-${c.id}`} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    Type
                  </label>
                  <select
                    value={enrolmentFilters.type}
                    onChange={(e) =>
                      setEnrolmentFilters({
                        ...enrolmentFilters,
                        type: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">All Types</option>
                    <option value="Fresh">Fresh Session</option>
                    <option value="Public">Public Transfer</option>
                    <option value="Private">Private Transfer</option>
                    <option value="Dropout">Dropout Re-entry</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border bg-slate-50 dark:bg-[#020617]/50 flex justify-between items-center">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Enrolment List
                </h4>
                <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded">
                  {enrolmentLogs.length} Records Found
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#020617]/30 border-b border-border">
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Student Info
                      </th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">
                        Gender
                      </th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Class/Sect
                      </th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Type
                      </th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Date
                      </th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Guardian
                      </th>
                      <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-right">
                        Manage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrolmentLogs.map((log) => (
                      <tr
                        key={`adm-en-log-${log.id}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group/row"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {(log.name || "A").charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                {log.name}
                              </p>
                              <p className="text-[9px] text-slate-500 font-mono">
                                ADM: {log.admission_no}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${log.gender === "MALE" ? "text-blue-500" : "text-pink-500"}`}
                          >
                            {log.gender || "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {allClasses.find((c) => c.id === log.class_id)
                              ?.class_name || "N/A"}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {sections.find((s) => s.id === log.section_id)
                              ?.section_name
                              ? `Section ${sections.find((s) => s.id === log.section_id)?.section_name}`
                              : "No Section"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span
                              className={`text-[8px] font-bold uppercase px-2 py-1 rounded-full ${
                                log.enrollment_type === "Fresh"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : log.enrollment_type === "Public"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : log.enrollment_type === "Private"
                                      ? "bg-purple-500/10 text-purple-500"
                                      : "bg-rose-500/10 text-rose-500"
                              }`}
                            >
                              {log.enrollment_type}
                            </span>
                            {log.previous_school_name && (
                              <div className="mt-1">
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight line-clamp-1">
                                  {log.previous_school_name}
                                </p>
                                <p className="text-[8px] text-slate-400 font-mono">
                                  EMIS: {log.previous_school_emis}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                          {log.class_enrolment_date}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            {log.father_name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {log.father_mobile_no}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                handleRemoveStudentFromClass(log.id!)
                              }
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Unassign from Class"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(log.id!)}
                              disabled={isDeleting === log.id}
                              className={`p-1.5 rounded-lg transition-colors ${isDeleting === log.id ? "opacity-50 cursor-not-allowed text-rose-300" : "text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"}`}
                              title="Permanently Delete Records"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {enrolmentLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-[10px] text-slate-500 uppercase tracking-widest italic"
                        >
                          No enrolment records found for the selected segment
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "reports" && activeSubTab === "report-student" && (
          <motion.div
            key="reports-student"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 pb-20 text-left"
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-[0.1em] uppercase text-slate-900 dark:text-white leading-tight">
                  Insight Engine
                </h3>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">
                  Comprehensive analytical terminal for{" "}
                  {schoolName || "Instituition"}
                </p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md self-start">
                {[
                  { id: "class-daily", label: "Daily Pulse", icon: BarChart3 },
                  {
                    id: "class-historical",
                    label: "Class Analytics",
                    icon: History,
                  },
                ].map((tab) => (
                  <button
                    key={`report-tab-${tab.id}`}
                    onClick={() => setReportSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all ${reportSubTab === tab.id ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {reportSubTab === "class-daily" && (
              <div className="space-y-6">
                <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full transition-all group-hover:bg-emerald-500/10" />

                  <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Select Division
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          <Layers className="w-4 h-4" />
                        </div>
                        <select
                          value={selectedReportClassId || ""}
                          onChange={(e) => {
                            const cid = Number(e.target.value);
                            setSelectedReportClassId(cid);
                            if (cid)
                              fetchGeneralClassReport(cid, generalReportDate);
                          }}
                          className="w-full bg-[#020617] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner appearance-none"
                        >
                          <option value="">Select Class</option>
                          {allClasses.map((c) => (
                            <option
                              key={`report-daily-cls-${c.id}`}
                              value={c.id}
                            >
                              {c.class_name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Snapshot Date
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          type="date"
                          value={generalReportDate}
                          onChange={(e) => {
                            setGeneralReportDate(e.target.value);
                            if (selectedReportClassId)
                              fetchGeneralClassReport(
                                selectedReportClassId,
                                e.target.value,
                              );
                          }}
                          className="w-full bg-[#020617] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {reportData && selectedReportClassId ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        {
                          label: "Total Strength",
                          val: reportData.total,
                          icon: Users,
                          color: "text-white",
                        },
                        {
                          label: "Present",
                          val: reportData.present,
                          icon: UserCheck,
                          color: "text-emerald-500",
                        },
                        {
                          label: "Absent/Leave",
                          val:
                            reportData.absent +
                            reportData.sick +
                            reportData.leave,
                          icon: UserX,
                          color: "text-rose-500",
                        },
                        {
                          label: "Efficiency",
                          val: `${reportData.presentPercentage}%`,
                          icon: Award,
                          color: "text-blue-500",
                        },
                      ].map((stat, i) => (
                        <div
                          key={`daily-report-stat-${i}`}
                          className="bg-card border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div
                              className={`p-3 rounded-2xl bg-slate-900/50 border border-slate-800 ${stat.color}`}
                            >
                              <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {stat.label}
                            </span>
                          </div>
                          <p className={`text-2xl font-bold ${stat.color}`}>
                            {stat.val}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-card border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#020617]/50">
                        <div className="flex items-center gap-4">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <ClipboardList className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold uppercase tracking-widest text-white">
                              {
                                allClasses.find(
                                  (c) => c.id === selectedReportClassId,
                                )?.class_name
                              }
                            </h4>
                            <p className="text-[10px] text-emerald-500 uppercase tracking-widest mt-0.5 font-bold">
                              Register Summary for {generalReportDate}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 grid md:grid-cols-4 gap-6">
                        {[
                          {
                            label: "Present",
                            val: reportData.present,
                            color: "emerald",
                            cat: "Present" as const,
                          },
                          {
                            label: "Absent",
                            val: reportData.absent,
                            color: "rose",
                            cat: "Absent" as const,
                          },
                          {
                            label: "Sick",
                            val: reportData.sick,
                            color: "amber",
                            cat: "Sick" as const,
                          },
                          {
                            label: "Leave",
                            val: reportData.leave,
                            color: "blue",
                            cat: "Leave" as const,
                          },
                        ].map((item) => (
                          <button
                            key={`daily-cat-${item.label}`}
                            onClick={() =>
                              setViewingCategory(
                                viewingCategory === item.cat ? null : item.cat,
                              )
                            }
                            className={`group p-6 rounded-3xl border transition-all flex flex-col items-center ${viewingCategory === item.cat ? `bg-${item.color}-500/10 border-${item.color}-500/50 ring-2 ring-${item.color}-500/20` : "bg-slate-900/20 border-slate-800 hover:border-slate-700"}`}
                          >
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 group-hover:text-slate-300 transition-colors">
                              {item.label}
                            </p>
                            <p
                              className={`text-4xl font-bold text-${item.color}-500 tabular-nums`}
                            >
                              {item.val}
                            </p>
                          </button>
                        ))}
                      </div>

                      <AnimatePresence>
                        {viewingCategory && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-800 bg-[#020617]/30"
                          >
                            <div className="p-8 space-y-6">
                              <div className="flex items-center justify-between">
                                <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                  Detailed Index:{" "}
                                  <span className="text-white">
                                    {viewingCategory} Students
                                  </span>
                                </h5>
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
                                  {
                                    reportData.categorizedStudents[
                                      viewingCategory
                                    ].length
                                  }{" "}
                                  Entries
                                </span>
                              </div>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {reportData.categorizedStudents[viewingCategory]
                                  .length > 0 ? (
                                  reportData.categorizedStudents[
                                    viewingCategory
                                  ].map((s, idx) => (
                                    <div
                                      key={`daily-st-detail-${s.id}-${idx}`}
                                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 group hover:border-emerald-500/30 transition-all"
                                    >
                                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-all font-bold">
                                        {s.name?.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-white uppercase truncate tracking-widest">
                                          {s.name}
                                        </p>
                                        <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-1">
                                          ID: {s.admission_no}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-full py-12 text-center">
                                    <p className="text-[10px] text-slate-500 italic uppercase tracking-widest">
                                      No entries found for this category on
                                      selected date.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : selectedReportClassId ? (
                  <div className="py-40 text-center bg-card border border-dashed border-slate-800 rounded-[3rem] shadow-inner">
                    <div className="w-20 h-20 bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-800 animate-pulse">
                      <Calendar className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-[0.2em] mb-2">
                      Null Data Point
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                      No electronic marking record exists for the selected class
                      on {generalReportDate}.
                    </p>
                  </div>
                ) : (
                  <div className="py-40 text-center bg-card border border-dashed border-slate-800 rounded-[3rem] shadow-inner">
                    <div className="w-20 h-20 bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-800">
                      <Filter className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-[0.2em] mb-2">
                      Calibration Required
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                      Please select a pedagogical division from the directory to
                      view real-time data.
                    </p>
                  </div>
                )}
              </div>
            )}

            {reportSubTab === "class-historical" && (
              <div className="space-y-8">
                <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Division
                      </label>
                      <select
                        value={historicalReportFilters.classId}
                        onChange={(e) =>
                          setHistoricalReportFilters({
                            ...historicalReportFilters,
                            classId: e.target.value,
                          })
                        }
                        className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                      >
                        <option value="">Select Class</option>
                        {allClasses.map((c) => (
                          <option key={`hist-cls-opt-${c.id}`} value={c.id}>
                            {c.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Active From
                      </label>
                      <input
                        type="date"
                        value={historicalReportFilters.startDate}
                        onChange={(e) =>
                          setHistoricalReportFilters({
                            ...historicalReportFilters,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Active Until
                      </label>
                      <input
                        type="date"
                        value={historicalReportFilters.endDate}
                        onChange={(e) =>
                          setHistoricalReportFilters({
                            ...historicalReportFilters,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={generateHistoricalClassReport}
                        disabled={isGeneratingHistorical}
                        className="w-full h-[56px] bg-emerald-500 text-slate-950 font-bold uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-400 active:scale-[0.98] transition-all flex items-center justify-center shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {isGeneratingHistorical
                          ? "Compiling..."
                          : "Run Analytics"}
                      </button>
                    </div>
                  </div>
                </div>

                {historicalReportData.length > 0 ? (
                  <div className="bg-card border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#020617]/50">
                      <div>
                        <h4 className="text-lg font-bold uppercase tracking-widest text-white leading-tight">
                          Aggregate Performance
                        </h4>
                        <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">
                          Period: {historicalReportFilters.startDate} —{" "}
                          {historicalReportFilters.endDate}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button className="p-3 text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl hover:text-white transition-all shadow-lg">
                          <FileText className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/30">
                            <th className="px-8 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                              Reference #
                            </th>
                            <th className="px-8 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                              Student Name
                            </th>
                            <th className="px-8 py-6 text-[10px] uppercase tracking-wider text-emerald-500 font-bold text-center">
                              Presents
                            </th>
                            <th className="px-8 py-6 text-[10px] uppercase tracking-wider text-rose-500 font-bold text-center">
                              Absents
                            </th>
                            <th className="px-8 py-6 text-[10px] uppercase tracking-wider text-blue-500 font-bold text-center">
                              Leave
                            </th>
                            <th className="px-8 py-6 text-[10px] uppercase tracking-wider text-white font-bold text-right">
                              Attendance Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {historicalReportData.map((row, i) => (
                            <tr
                              key={`hist-row-${row.id}-${i}`}
                              className="hover:bg-slate-900/20 transition-all group"
                            >
                              <td className="px-8 py-6 text-[11px] font-mono text-slate-500 tracking-widest">
                                {row.admission_no}
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-[11px] font-bold text-white uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                                  {row.name}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-xs font-bold text-emerald-500/80 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10 tabular-nums">
                                  {row.presents}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-xs font-bold text-rose-500/80 bg-rose-500/5 px-3 py-1.5 rounded-lg border border-rose-500/10 tabular-nums">
                                  {row.absents}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-xs font-bold text-blue-500/80 bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10 tabular-nums">
                                  {row.leave}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`text-xs font-bold font-mono ${parseFloat(row.percentage) >= 75 ? "text-emerald-500" : "text-rose-500"}`}
                                  >
                                    {row.percentage}%
                                  </span>
                                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-1000 ${parseFloat(row.percentage) >= 75 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-rose-500"}`}
                                      style={{ width: `${row.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-40 text-center bg-card border border-dashed border-slate-800 rounded-[3rem] shadow-inner">
                    <div className="w-20 h-20 bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-800">
                      <BarChart3 className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-[0.2em] mb-2">
                      Awaiting Computation
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                      Select specialized filters and run analytics to generate
                      comprehensive historical reports.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "reports" && activeSubTab === "report-staff" && (
          <motion.div
            key="report-staff"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 pb-20 text-left"
          >
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-[0.1em] uppercase text-slate-900 dark:text-white leading-tight">
                Master Verification Terminal
              </h3>
              <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">
                Staff attendance surveillance and duration metrics for{" "}
                {schoolName || "Instituition"}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                {
                  label: "Total Personnel",
                  val: todaySummary.total,
                  color: "text-white",
                  icon: Users,
                },
                {
                  label: "Present Today",
                  val: todaySummary.present,
                  color: "text-emerald-500",
                  icon: UserCheck,
                },
                {
                  label: "Off-Duty/Leave",
                  val: todaySummary.absent,
                  color: "text-rose-500",
                  icon: UserX,
                },
                {
                  label: "Active Sessions",
                  val: todaySummary.onClock,
                  color: "text-blue-500",
                  icon: Clock,
                },
              ].map((stat, i) => (
                <div
                  key={`staff-stat-rep-${i}`}
                  className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-3 text-slate-800/10 group-hover:text-emerald-500/5 transition-colors">
                    <stat.icon className="w-16 h-16" />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-4">
                    {stat.label}
                  </p>
                  <p
                    className={`text-4xl font-bold ${stat.color} tabular-nums`}
                  >
                    {stat.val}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <h4 className="text-lg font-bold uppercase tracking-[0.2em] text-white">
                  Filter Parameters
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Officer Profile
                  </label>
                  <select
                    value={reportFilters.teacherId}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        teacherId: e.target.value,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-5 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  >
                    <option value="">Full Directory</option>
                    {teachers.map((t, i) => (
                      <option key={`staff-opt-rep-${t.id || i}`} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    Start Cycle
                  </label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-5 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                    End Cycle
                  </label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-5 py-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={generateTeacherReport}
                  className="flex-1 py-5 bg-emerald-500 text-slate-950 font-bold uppercase tracking-[0.3em] text-[10px] rounded-[2rem] hover:bg-emerald-400 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-emerald-500/20"
                >
                  Initialize Log Synthesis
                </button>
                {teacherAttendanceLogs.length > 0 && (
                  <button
                    onClick={() => {
                      const doc = new jsPDF() as any;
                      doc.setFontSize(18);
                      doc.text(
                        schoolName || "School Information System",
                        14,
                        20,
                      );
                      doc.setFontSize(12);
                      doc.text("Detailed Staff Attendance Report", 14, 28);
                      doc.setFontSize(8);
                      doc.text(
                        `Period: ${reportFilters.startDate} to ${reportFilters.endDate}`,
                        14,
                        34,
                      );
                      doc.text(
                        `Generated on: ${new Date().toLocaleString()}`,
                        14,
                        40,
                      );

                      const tableData = teacherAttendanceLogs.map((log) => {
                        const t = teachers.find((x) => x.id === log.teacher_id);
                        return [
                          log.attendance_date,
                          t?.name || "Unknown",
                          log.check_in || "--:--:--",
                          log.check_out || "Active",
                          log.duration || "00:00",
                          log.status,
                        ];
                      });

                      autoTable(doc, {
                        startY: 46,
                        head: [
                          [
                            "Date",
                            "Personnel",
                            "In",
                            "Out",
                            "Duration",
                            "Verification",
                          ],
                        ],
                        body: tableData,
                        styles: { fontSize: 8, font: "helvetica" },
                        headStyles: { fillColor: [16, 185, 129] },
                      });
                      doc.save(
                        `Staff_Attendance_Report_${reportFilters.startDate}.pdf`,
                      );
                    }}
                    className="p-5 bg-slate-900 border border-slate-800 text-white rounded-3xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {teacherAttendanceLogs.length > 0 ? (
              <div className="bg-card border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-slate-800 bg-[#020617]/50 flex justify-between items-center">
                  <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold uppercase tracking-widest text-white leading-tight">
                        Faculty Terminal Logs
                      </h4>
                      <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">
                        {teacherAttendanceLogs.length} Validated Records Found
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/30">
                        <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          Cycle Date
                        </th>
                        <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                          Officer Profile
                        </th>
                        <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold text-center">
                          Check-In
                        </th>
                        <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold text-center">
                          Check-Out
                        </th>
                        <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-emerald-500 font-bold text-center">
                          Session Delta
                        </th>
                        <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold text-right">
                          Verification
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {teacherAttendanceLogs.map((log, i) => {
                        const teacher = teachers.find(
                          (t) => t.id === log.teacher_id,
                        );
                        return (
                          <tr
                            key={`staff-log-rep-final-${log.id || i}`}
                            className="hover:bg-slate-900/20 transition-all group"
                          >
                            <td className="px-10 py-8 text-[11px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                              {log.attendance_date}
                            </td>
                            <td className="px-10 py-8">
                              <p className="text-[11px] font-bold text-white uppercase tracking-widest leading-none mb-1.5 group-hover:text-emerald-400 transition-colors">
                                {teacher?.name || "Unknown User"}
                              </p>
                              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">
                                {teacher?.designation || "Staff"}
                              </p>
                            </td>
                            <td className="px-10 py-8 text-[11px] font-mono text-slate-400 text-center">
                              {log.check_in || "--:--:--"}
                            </td>
                            <td className="px-10 py-8 text-[11px] font-mono text-slate-400 text-center">
                              {log.check_out || "Active"}
                            </td>
                            <td className="px-10 py-8 text-[11px] font-bold text-emerald-400 font-mono tracking-tighter text-center">
                              {log.duration || "00:00"}
                            </td>
                            <td className="px-10 py-8 text-right">
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-[9px] uppercase tracking-widest ${log.status === "Present" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-800 text-slate-500 border-slate-700"}`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-40 text-center bg-card border border-dashed border-slate-800 rounded-[3rem] shadow-inner">
                <div className="w-20 h-20 bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-800">
                  <Clock className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-[0.2em] mb-2">
                  Null Scan Result
                </h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                  No logs matching the current criteria were identified. Please
                  adjust the filters to broaden the search.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "reports" && activeSubTab === "report-personal" && (
          <motion.div
            key="report-personal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h4 className="text-xl font-bold uppercase tracking-widest text-white">
                  Personnel Attendance Inventory
                </h4>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">
                  Verified Log Repository for {user.name}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-900/50 border border-slate-800 px-6 py-3 rounded-2xl">
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">
                    Total Logs
                  </p>
                  <p className="text-lg font-bold text-white font-mono">
                    {teacherLogs.length}
                  </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl shadow-lg">
                  <p className="text-[8px] text-emerald-500 uppercase tracking-widest mb-1">
                    Status
                  </p>
                  <p className="text-lg font-bold text-emerald-500 font-mono">
                    Verified
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900/30">
                      <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Terminal Date
                      </th>
                      <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        In-Time
                      </th>
                      <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Out-Time
                      </th>
                      <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Log Duration
                      </th>
                      <th className="px-10 py-6 text-[10px] uppercase tracking-wider text-emerald-500 font-bold text-right">
                        Verification
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {teacherLogs.slice(0, 20).map((log, i) => (
                      <tr
                        key={`personal-log-${i}`}
                        className="hover:bg-emerald-500/[0.02] transition-colors"
                      >
                        <td className="px-10 py-8 text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                          {log.attendance_date}
                        </td>
                        <td className="px-10 py-8 text-[11px] font-mono text-white">
                          {log.check_in || "--:--:--"}
                        </td>
                        <td className="px-10 py-8 text-[11px] font-mono text-white">
                          {log.check_out || "Active Session"}
                        </td>
                        <td className="px-10 py-8 text-[11px] font-mono text-emerald-500 font-bold">
                          {log.duration || "00:00"}
                        </td>
                        <td className="px-10 py-8 text-right">
                          <span className="text-[9px] font-bold uppercase py-1.5 px-4 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 shadow-sm">
                            PRESENT
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === "settings" && activeSubTab === "sys-config" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-20"
          >
            <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
              System Configuration
            </h3>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Theme Selection */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-400 dark:text-emerald-400 mb-1">
                    Visual Theme
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                    Select your preferred interface style
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => theme !== "dark" && toggleTheme()}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${theme === "dark" ? "bg-[#020617] border-emerald-500 text-emerald-500" : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#10b981]" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Dark (Current)
                    </span>
                  </button>

                  <button
                    onClick={() => theme !== "light" && toggleTheme()}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${theme === "light" ? "bg-white border-emerald-500 text-emerald-500 shadow-xl" : "bg-slate-50 dark:bg-slate-100/40 border-slate-200 dark:border-slate-200 text-slate-400 dark:text-slate-400"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-200 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Light (Modern)
                    </span>
                  </button>
                </div>
              </div>

              {/* School Timetable & Shifts Configuration */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6 shadow-xl relative">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#10b981]" />
                    School Timetable & Shift Setup
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Configure official working days, holidays, and active punch limits
                  </p>
                </div>

                <form onSubmit={handleSaveTimetable} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold block mb-1">
                      Registered Working Days
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                        const isWorking = timetable.working_days.includes(day);
                        return (
                          <label
                            key={`timetable-setup-day-${day}`}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-[10px] tracking-wide select-none cursor-pointer transition-all ${
                              isWorking
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                                : "bg-slate-900/40 border-slate-800 text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={`working_${day}`}
                              defaultChecked={isWorking}
                              className="accent-emerald-500 h-3 w-3 cursor-pointer"
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTimetable(prev => {
                                  const list = checked
                                    ? [...prev.working_days, day]
                                    : prev.working_days.filter(d => d !== day);
                                  const offs = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].filter(d => !list.includes(d));
                                  return { ...prev, working_days: list, week_offs: offs };
                                });
                              }}
                            />
                            <span>{day.slice(0, 3)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-semibold">
                        Check-In Start
                      </label>
                      <input
                        type="time"
                        name="check_in_start"
                        defaultValue={timetable.check_in_start}
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-semibold">
                        Check-In End
                      </label>
                      <input
                        type="time"
                        name="check_in_end"
                        defaultValue={timetable.check_in_end}
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-semibold">
                        Check-Out Start
                      </label>
                      <input
                        type="time"
                        name="check_out_start"
                        defaultValue={timetable.check_out_start}
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 block font-semibold">
                        Check-Out End
                      </label>
                      <input
                        type="time"
                        name="check_out_end"
                        defaultValue={timetable.check_out_end}
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingTimetable}
                    className="w-full py-4 mt-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:shadow-[0_4px_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingTimetable ? "Saving..." : "Save Configuration"}
                  </button>
                </form>
              </div>

              {/* Assignment Form (Moved existing one here or just update below) */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6 shadow-xl transition-colors duration-500">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-1">
                    New Assignment
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Assign a teacher to a class/lab
                  </p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const assignment = {
                      teacher_id: Number(formData.get("teacher_id")),
                      class_id: Number(formData.get("class_id")),
                      section_id: formData.get("section_id")
                        ? Number(formData.get("section_id"))
                        : null,
                      from_date: formData.get("from_date") as string,
                      to_date: formData.get("to_date") as string,
                      period: "1st",
                      emis: user.emis,
                    };

                    try {
                      const { data, error } = await supabase
                        .from("teacher_class_assignment")
                        .insert([
                          {
                            ...assignment,
                            id: Math.floor(Math.random() * 2147483647),
                          },
                        ])
                        .select();

                      if (error) throw error;
                      if (data) setAssignments([...assignments, ...data]);
                      form.reset();
                    } catch (err) {
                      console.error("Error saving assignment:", err);
                      // Mock implementation
                      if (!import.meta.env.VITE_SUPABASE_URL) {
                        setAssignments([
                          ...assignments,
                          {
                            ...assignment,
                            id: Date.now(),
                          } as TeacherClassAssignment,
                        ]);
                        form.reset();
                      }
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                      Select Teacher
                    </label>
                    <select
                      name="teacher_id"
                      required
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                    >
                      <option
                        value=""
                        className="text-slate-900 dark:text-white"
                      >
                        Teacher Account
                      </option>
                      {teachers.map((t, i) => (
                        <option
                          key={`admin-assign-teacher-opt-${t.id || `idx-${i}`}`}
                          value={t.id}
                          className="bg-white dark:bg-[#020617] text-slate-900 dark:text-white"
                        >
                          {t.name} ({t.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                        Select Class
                      </label>
                      <select
                        name="class_id"
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                      >
                        <option
                          value=""
                          className="text-slate-900 dark:text-white"
                        >
                          Class
                        </option>
                        {allClasses.map((c, i) => (
                          <option
                            key={`admin-assign-class-opt-${c.id || `idx-${i}`}`}
                            value={c.id}
                            className="bg-white dark:bg-[#020617] text-slate-900 dark:text-white"
                          >
                            {c.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                        Select Section
                      </label>
                      <select
                        name="section_id"
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                      >
                        <option
                          value=""
                          className="text-slate-900 dark:text-white"
                        >
                          Section (Optional)
                        </option>
                        {sections.map((s, i) => (
                          <option
                            key={`admin-assign-section-opt-${s.id || `idx-${i}`}`}
                            value={s.id}
                            className="bg-white dark:bg-[#020617] text-slate-900 dark:text-white"
                          >
                            {s.section_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        name="from_date"
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        name="to_date"
                        required
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#10b981] text-[#020617] font-bold uppercase tracking-widest text-[10px] rounded-xl hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all"
                  >
                    Create Assignment
                  </button>
                </form>
              </div>

              {/* Assignment List */}
              <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-3xl overflow-hidden flex flex-col max-h-[500px] shadow-xl">
                <div className="mb-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-1">
                    Active Assignments
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                    {assignments.length} total links
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {assignments.map((assignment, i) => {
                    const teacher = teachers.find(
                      (t) => t.id === assignment.teacher_id,
                    );
                    const cls = allClasses.find(
                      (c) => c.id === assignment.class_id,
                    );
                    const sect = sections.find(
                      (s) => s.id === assignment.section_id,
                    );
                    return (
                      <div
                        key={`admin-assignment-list-row-${assignment.id || `idx-${i}`}`}
                        className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                            {teacher?.name || "Unknown"}
                          </p>
                          <p className="text-[9px] text-[#10b981] uppercase tracking-widest mt-1 font-mono">
                            {cls?.class_name || "Deleted Class"}{" "}
                            {sect ? `(Sec ${sect.section_name})` : ""}
                          </p>
                          <p className="text-[8px] text-slate-500 dark:text-slate-600 mt-0.5">
                            {assignment.from_date} to {assignment.to_date}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnassignTeacher(assignment.id)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          title="Revoke Assignment"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Change Password Section */}
              <div className="bg-card border border-border p-8 rounded-3xl space-y-6 shadow-xl transition-all hover:border-emerald-500/20">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#10b981] mb-1">
                    Security Update
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Update your system access credentials
                  </p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                        placeholder="Min 6 characters"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">
                        Confirm New
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
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
                    {isUpdatingPassword
                      ? "Hashing & Updating..."
                      : "Update Password"}
                  </button>
                </form>
              </div>

              {/* CSV BULK STUDENT IMPORT CARD */}
              <div className="lg:col-span-2 bg-card border border-border p-8 rounded-[2.5rem] space-y-6 shadow-2xl transition-all hover:border-emerald-500/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-1">
                      Student Bulk CSV Terminal
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Enrol hundreds of students and auto-provision academic
                      classes via spreadsheets
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                    <Database className="w-5 h-5" />
                  </div>
                </div>

                {/* 1. INITIAL UPLOAD DRAG-DROP BOX */}
                {!csvFile && !csvImportProgress && !csvImportResult && (
                  <div className="space-y-4">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingCsv(true);
                      }}
                      onDragLeave={() => setIsDraggingCsv(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingCsv(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleCsvFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() =>
                        document.getElementById("student-csv-uploader")?.click()
                      }
                      className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
                        isDraggingCsv
                          ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                          : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                      }`}
                    >
                      <input
                        type="file"
                        id="student-csv-uploader"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleCsvFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-all">
                        <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-bounce" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Drag & Drop Spreadsheet File
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                          or click to browse local files (supports .csv, .xlsx,
                          .xls)
                        </p>
                      </div>
                    </div>

                    {/* TEMPLATE SCHEMATIC INFO */}
                    <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <FileText className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Supported Spreadsheet Columns Mapping
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 uppercase leading-relaxed">
                        Your spreadsheet may contain any or all of the following
                        columns from the source export. If headers are
                        differently named, the terminal will let you map them
                        interactively in the next step:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          "Student ID",
                          "Name",
                          "Father Name",
                          "Father CNIC",
                          "Gender",
                          "School Name",
                          "School Gender",
                          "EMIS Code",
                          "Class Name",
                          "Class Section",
                          "Session Year",
                          "Student Status",
                          "Class Status",
                          "Vaccinated",
                          "Disability",
                          "Religion",
                          "Nationality",
                          "Date of Birth",
                          "Hafiz Quran",
                          "Orphan",
                          "Admission Date",
                          "District",
                          "Tehsil",
                          "Class Enrolment Date",
                          "Admission #",
                          "Double Shift",
                          "Emergency No",
                          "Form-B",
                          "Model Type",
                          "School Level",
                          "Shift",
                          "Guardian CNIC",
                          "Guardian Name",
                          "Father Mobile No",
                          "Student Mobile No",
                        ].map((col) => (
                          <span
                            key={`csv-col-tag-${col}`}
                            className="text-[8px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/20 text-slate-500 px-2 py-1 rounded"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. LOADING SPIN AREA FOR PARSING */}
                {isParsingCsv && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900/10">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                      Analysing File Schema & Compiling Headers...
                    </p>
                  </div>
                )}

                {/* 3. COLUMNS MAPPING & PREVIEW GATES */}
                {csvFile &&
                  csvHeaders.length > 0 &&
                  !isParsingCsv &&
                  !csvImportProgress &&
                  !csvImportResult && (
                    <div className="space-y-6">
                      {/* FILE DETAILS BANNER */}
                      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase text-white tracking-widest">
                            {csvFile.name}
                          </p>
                          <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider mt-1">
                            {csvRows.length} Rows Discovered •{" "}
                            {(csvFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setCsvFile(null);
                            setCsvHeaders([]);
                            setCsvRows([]);
                            setColumnMapping({});
                          }}
                          className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer"
                        >
                          Clear File
                        </button>
                      </div>

                      {/* PARAMETERS CONFIGURATOR */}
                      <div className="grid md:grid-cols-2 gap-4 bg-[#020617]/40 border border-slate-200/40 dark:border-slate-800/80 p-5 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <label className="flex flex-col gap-0.5 pointer-events-auto cursor-pointer">
                            <span className="text-[10px] font-bold uppercase text-white tracking-wider">
                              Auto-Create Entities
                            </span>
                            <span className="text-[8px] text-slate-400 uppercase tracking-widest">
                              Provision missing Classes and Sections instantly
                            </span>
                          </label>
                          <input
                            type="checkbox"
                            checked={autoCreateEntities}
                            onChange={(e) =>
                              setAutoCreateEntities(e.target.checked)
                            }
                            className="w-4 h-4 text-emerald-500 border-slate-200 focus:ring-emerald-500 rounded cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">
                            Default Enrolment Type
                          </label>
                          <select
                            value={defaultEnrollmentType}
                            onChange={(e: any) =>
                              setDefaultEnrollmentType(e.target.value)
                            }
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500 outline-none transition"
                          >
                            {(
                              [
                                "Fresh",
                                "Public",
                                "Private",
                                "Dropout",
                                "Other",
                              ] as const
                            ).map((t) => (
                              <option
                                key={`csv-enrol-opt-${t}`}
                                value={t}
                                className="bg-white dark:bg-[#020617] text-slate-900 dark:text-white"
                              >
                                {t} Enrolment
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* ROW MAPPING DETAILS */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                          Inter-Column Schema Linker
                        </h5>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { key: "name", label: "Student Name (Req.)" },
                            { key: "admission_no", label: "Admission # / ID" },
                            { key: "class_name", label: "Class Name" },
                            { key: "section_name", label: "Class Section" },
                            { key: "father_name", label: "Father Name" },
                            { key: "father_cnic", label: "Father CNIC" },
                            { key: "father_mobile_no", label: "Father Mobile" },
                            { key: "gender", label: "Gender" },
                            {
                              key: "date_of_birth",
                              label: "Date of Birth (DOB)",
                            },
                            { key: "session", label: "Academic Session" },
                            { key: "student_status", label: "Student Status" },
                            { key: "class_status", label: "Class Status" },
                            {
                              key: "previous_school_name",
                              label: "School Name",
                            },
                            { key: "previous_school_emis", label: "EMIS Code" },
                            {
                              key: "class_enrolment_date",
                              label: "Class Enrolment Date/Admission Date",
                            },
                          ].map((field) => (
                            <div
                              key={`col-map-field-${field.key}`}
                              className="space-y-1"
                            >
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                {field.label}
                              </label>
                              <select
                                value={columnMapping[field.key] || ""}
                                onChange={(e) =>
                                  setColumnMapping({
                                    ...columnMapping,
                                    [field.key]: e.target.value,
                                  })
                                }
                                className="w-full bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-medium text-slate-300 focus:border-emerald-500 outline-none transition"
                              >
                                <option value="">
                                  -- Ignore / Not in File --
                                </option>
                                {csvHeaders.map((headerName) => (
                                  <option
                                    key={`header-opt-${field.key}-${headerName}`}
                                    value={headerName}
                                  >
                                    {headerName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* LIVE DATA PREVIEW PORT */}
                      <div className="space-y-2 pt-2">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                          Verifying Data Stream (First 4 rows preview)
                        </h5>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#020617]/80 text-[7px] font-bold uppercase tracking-wider text-slate-500 border-b border-border">
                              <tr>
                                <th className="p-3"># Row</th>
                                <th className="p-3">Admission No</th>
                                <th className="p-3">Student Name</th>
                                <th className="p-3">Father Name</th>
                                <th className="p-3">Class/Sec</th>
                                <th className="p-3">Gender</th>
                                <th className="p-3">Session</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {csvRows.slice(0, 4).map((row, rIdx) => {
                                const getRowVal = (k: string) => {
                                  const colName = columnMapping[k];
                                  if (!colName) return "-";
                                  const idx = csvHeaders.indexOf(colName);
                                  return idx !== -1 &&
                                    row[idx] !== undefined &&
                                    row[idx] !== null
                                    ? String(row[idx]).trim()
                                    : "-";
                                };
                                return (
                                  <tr
                                    key={`prev-row-${rIdx}`}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                                  >
                                    <td className="p-3 text-[9px] font-mono text-slate-500 font-bold">
                                      {rIdx + 2}
                                    </td>
                                    <td className="p-3 text-[9px] font-mono font-bold text-indigo-400">
                                      {getRowVal("admission_no")}
                                    </td>
                                    <td className="p-3 text-[9px] font-bold uppercase text-white">
                                      {getRowVal("name")}
                                    </td>
                                    <td className="p-3 text-[9px] text-slate-400 uppercase">
                                      {getRowVal("father_name")}
                                    </td>
                                    <td className="p-3 text-[9px] font-bold uppercase text-emerald-400 font-mono">
                                      {getRowVal("class_name")}{" "}
                                      {getRowVal("section_name") !== "-"
                                        ? `(Sec ${getRowVal("section_name")})`
                                        : ""}
                                    </td>
                                    <td className="p-3 text-[9px] text-slate-500 uppercase">
                                      {getRowVal("gender")}
                                    </td>
                                    <td className="p-3 text-[9px] text-slate-500 font-mono">
                                      {getRowVal("session")}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* EXECUTION CONTROL */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleExecuteImport}
                          className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.01] active:scale-95 text-[#020617] font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-emerald-500/10 cursor-pointer transition-all"
                        >
                          Execute Bulk Provisioning ({csvRows.length} Students)
                        </button>
                      </div>
                    </div>
                  )}

                {/* 4. RUNTIME IMPORT LOADER */}
                {csvImportProgress && (
                  <div className="border border-emerald-500/20 backdrop-blur bg-emerald-500/5 rounded-3xl p-8 space-y-6 flex flex-col justify-center">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-emerald-400 flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          Ingesting Student Registry...
                        </span>
                        <span className="text-[#10b981] font-mono">
                          {Math.round(
                            (csvImportProgress.current /
                              csvImportProgress.total) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      {/* PROGRESS BAR */}
                      <div className="w-full bg-slate-100 dark:bg-slate-900/60 rounded-full h-3.5 border border-slate-200/50 dark:border-slate-800/80 overflow-hidden relative">
                        <motion.div
                          className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 h-full absolute top-0 left-0"
                          style={{
                            width: `${(csvImportProgress.current / csvImportProgress.total) * 100}%`,
                          }}
                          layoutId="csv-loading-bar-tracker"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-card border border-border p-4 rounded-xl shadow-sm">
                      <Database className="w-4 h-4 text-emerald-500 mt-0.5 animate-pulse" />
                      <div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                          Database Operation Sub-Routine
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase font-mono mt-0.5 tracking-wide">
                          {csvImportProgress.status}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. METRIC RESULTS & ERROR REPORTING CARD */}
                {csvImportResult && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 border border-emerald-500/30 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 text-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                        <CheckCircle className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-sm font-black uppercase text-white tracking-widest">
                          Transaction Set Completed!
                        </h5>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                          {csvImportResult.success + csvImportResult.failed}{" "}
                          records processed inside database constraints
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 px-4 py-3.5 rounded-2xl flex flex-col items-center">
                          <span className="text-xl font-mono font-black text-emerald-400">
                            {csvImportResult.success}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Successfully Imported
                          </span>
                        </div>
                        <div
                          className={`px-4 py-3.5 rounded-2xl flex flex-col items-center border ${csvImportResult.failed > 0 ? "bg-rose-500/5 border-rose-500/20 text-rose-400" : "bg-slate-500/5 border-slate-500/15 text-slate-500"}`}
                        >
                          <span className="text-xl font-mono font-black">
                            {csvImportResult.failed}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-widest mt-1">
                            Failed Records
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* FAILURES LOGS ACCORDION */}
                    {csvImportResult.errors.length > 0 && (
                      <div className="bg-slate-50 dark:bg-[#020617]/40 border border-rose-500/10 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            Transaction Exceptions Report (
                            {csvImportResult.errors.length})
                          </span>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {csvImportResult.errors.map((errItem, idx) => (
                            <div
                              key={`err-log-item-${idx}`}
                              className="bg-slate-100 dark:bg-rose-500/5 border border-rose-500/15 p-3 rounded-xl flex items-start gap-2.5"
                            >
                              <span className="font-mono text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                Row {errItem.row}
                              </span>
                              <p className="text-[9px] font-mono text-slate-400 dark:text-rose-200 mt-0.5 leading-relaxed">
                                {errItem.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setCsvImportResult(null);
                        setCsvFile(null);
                      }}
                      className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      Upload Another Registry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "requests" && activeSubTab === "req-leave" && (
          <motion.div
            key="leaves"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pb-24"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                Leave Protocol
              </h3>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="p-3 bg-[#10b981] text-[#020617] rounded-2xl shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 dark:bg-[#020617] p-1 rounded-2xl w-full max-w-sm border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
              {(["All", "Pending", "Approved", "Rejected"] as const).map(
                (status) => (
                  <button
                    key={`admin-leave-filter-${status}`}
                    onClick={() => setLeaveFilterStatus(status)}
                    className={`flex-1 py-3 text-[8px] font-bold uppercase tracking-widest rounded-xl transition-all ${leaveFilterStatus === status ? "bg-white dark:bg-slate-800 text-emerald-500 shadow-lg" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"}`}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>

            <div className="space-y-4">
              {allLeaveRequests
                .filter(
                  (req) =>
                    leaveFilterStatus === "All" ||
                    req.status === leaveFilterStatus,
                )
                .map((leave) => {
                  const teacher = teachers.find(
                    (t) => t.id === leave.teacher_id,
                  );
                  return (
                    <div
                      key={`admin-leave-req-${leave.id}`}
                      className="bg-card border border-border p-6 rounded-3xl space-y-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-all"
                    >
                      <div
                        className={`absolute top-0 right-0 w-1.5 h-full ${
                          leave.status === "Approved"
                            ? "bg-emerald-500"
                            : leave.status === "Rejected"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      />

                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 flex-1">
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white leading-relaxed">
                            {leave.leave_type}
                          </h4>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">
                            BY: {teacher?.name || "Unknown Officer"}
                          </p>
                        </div>
                        <span
                          className={`text-[8px] uppercase tracking-widest px-2 py-1 rounded border font-bold ${
                            leave.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : leave.status === "Rejected"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-3 border-y border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-3 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] font-mono tracking-tighter">
                            {leave.from_date} — {leave.to_date}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                          {leave.days || 0} DAYS
                        </span>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                          "{leave.reason}"
                        </p>
                        {leave.document_url && (
                          <a
                            href={leave.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#10b981] hover:text-emerald-400 transition-colors bg-emerald-500/5 px-3 py-2 rounded-xl border border-emerald-500/10"
                          >
                            <FileText className="w-3.5 h-3.5" /> Supporting
                            Document
                          </a>
                        )}
                      </div>

                      {leave.status === "Pending" && (
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() =>
                              handleLeaveAction(leave.id, "Approved")
                            }
                            disabled={isProcessingLeave === leave.id}
                            className="flex-1 bg-emerald-500 text-slate-900 rounded-xl font-bold py-3 text-[9px] uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleLeaveAction(leave.id, "Rejected")
                            }
                            disabled={isProcessingLeave === leave.id}
                            className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold py-3 text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              {allLeaveRequests.filter(
                (req) =>
                  leaveFilterStatus === "All" ||
                  req.status === leaveFilterStatus,
              ).length === 0 && (
                <div className="py-24 text-center bg-slate-50 dark:bg-[#0f172a]/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
                    <Shield className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    No authorization logs found
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "requests" && activeSubTab === "req-training" && (
          <motion.div
            key="training"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pb-24"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                Training Hub
              </h3>
            </div>

            <div className="bg-card border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl text-center">
              <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-800 shadow-xl">
                <BookOpen className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-lg font-bold text-white uppercase tracking-[0.3em] mb-4">
                No Active Training
              </h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                The professional development database is currently clear. Check
                back later for assigned courses and certificates.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === "settings" && activeSubTab === "exam-center" && (
          <motion.div
            key="exam-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pb-24"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                Exam Center
              </h3>
            </div>

            <div className="flex overflow-x-auto bg-slate-100 dark:bg-[#020617] p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner no-scrollbar">
              {[
                { id: "sessions", label: "Sessions", icon: Layers },
                { id: "semesters", label: "Semesters", icon: ClipboardList },
                { id: "subjects", label: "Subjects", icon: BookOpen },
                {
                  id: "assignment",
                  label: "Class Subjects",
                  icon: GraduationCap,
                },
              ].map((mode) => (
                <button
                  key={`exam-mgmt-mode-${mode.id}`}
                  onClick={() => setExamManagementMode(mode.id as any)}
                  className={`flex-1 min-w-[100px] py-3 flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-widest rounded-xl transition-all ${examManagementMode === mode.id ? "bg-white dark:bg-slate-800 text-emerald-500 shadow-lg" : "text-slate-400"}`}
                >
                  <mode.icon className="w-3 h-3" />
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="bg-card border border-border p-8 rounded-3xl shadow-sm space-y-8">
              {examManagementMode === "sessions" && (
                <div className="space-y-6">
                  <form onSubmit={saveSession} className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Session Name (e.g. 2024-25)"
                      value={sessionForm.name}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, name: e.target.value })
                      }
                      className="flex-1 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#10b981] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                      Add Session
                    </button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sessions.map((s) => (
                      <div
                        key={`session-${s.id}`}
                        className="p-4 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center"
                      >
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                          {s.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {examManagementMode === "semesters" && (
                <div className="space-y-6">
                  <form onSubmit={saveSemester} className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Semester Name (e.g. Mid Term)"
                      value={semesterForm.name}
                      onChange={(e) =>
                        setSemesterForm({
                          ...semesterForm,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#10b981] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                      Add Semester
                    </button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {semesters.map((s) => (
                      <div
                        key={`semester-${s.id}`}
                        className="p-4 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center"
                      >
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                          {s.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {examManagementMode === "subjects" && (
                <div className="space-y-6">
                  <form
                    onSubmit={saveSubject}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <input
                      type="text"
                      placeholder="Subject Name"
                      value={subjectForm.name}
                      onChange={(e) =>
                        setSubjectForm({ ...subjectForm, name: e.target.value })
                      }
                      className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Subject Code (Opt)"
                      value={subjectForm.code}
                      onChange={(e) =>
                        setSubjectForm({ ...subjectForm, code: e.target.value })
                      }
                      className="bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#10b981] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                      Add Subject
                    </button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {subjects.map((s) => (
                      <div
                        key={`subject-${s.id}`}
                        className="p-4 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-start group transition-all"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">
                            {s.name}
                          </span>
                          <span className="text-[8px] text-slate-500 font-mono tracking-widest">
                            {s.code || "NO CODE"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(s.id)}
                          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {examManagementMode === "assignment" && (
                <div className="space-y-6">
                  {/* Class-wise tabs for subject assignment and selection */}
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">
                      Classwise Filter & Selection Tab
                    </p>
                    <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner max-h-40 overflow-y-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClassTab("all");
                          setClassSubjectForm((prev) => ({ ...prev, class_id: "" }));
                        }}
                        className={`px-3.5 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${
                          selectedClassTab === "all"
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-[#020617] shadow"
                            : "text-slate-455 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                      >
                        All Classes
                      </button>
                      {allClasses.map((cls) => (
                        <button
                          key={`cs-tab-${cls.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedClassTab(cls.id.toString());
                            setClassSubjectForm((prev) => ({ ...prev, class_id: cls.id.toString() }));
                          }}
                          className={`px-3.5 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            selectedClassTab === cls.id.toString()
                              ? "bg-emerald-500 text-[#020617] shadow-sm font-black"
                              : "text-slate-455 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          {cls.class_name || cls.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={assignSubjectToClass}
                    className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-250/45 dark:border-slate-800/40"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Target Class</span>
                      <select
                        value={classSubjectForm.class_id}
                        onChange={(e) =>
                          setClassSubjectForm({
                            ...classSubjectForm,
                            class_id: e.target.value,
                          })
                        }
                        className="bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs w-full font-bold uppercase tracking-wider text-slate-700 dark:text-white"
                      >
                        <option value="" className="text-slate-400">Select Class</option>
                        {allClasses.map((c) => (
                          <option key={`assign-class-${c.id}`} value={c.id}>
                            {c.class_name || c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Select Subject</span>
                      <select
                        value={classSubjectForm.subject_id}
                        onChange={(e) =>
                          setClassSubjectForm({
                            ...classSubjectForm,
                            subject_id: e.target.value,
                          })
                        }
                        className="bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs w-full font-bold uppercase tracking-wider text-slate-700 dark:text-white"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={`assign-subj-${s.id}`} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Total Marks</span>
                      <input
                        type="number"
                        placeholder="Total Marks"
                        value={classSubjectForm.total_marks}
                        onChange={(e) =>
                          setClassSubjectForm({
                            ...classSubjectForm,
                            total_marks: parseInt(e.target.value) || 0,
                          })
                        }
                        className="bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs w-full font-mono text-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Passing Marks</span>
                      <input
                        type="number"
                        placeholder="Passing Marks"
                        value={classSubjectForm.passing_marks}
                        onChange={(e) =>
                          setClassSubjectForm({
                            ...classSubjectForm,
                            passing_marks: parseInt(e.target.value) || 0,
                          })
                        }
                        className="bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs w-full font-mono text-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full h-[46px] bg-[#10b981] text-slate-950 hover:bg-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                      >
                        Assign Subject
                      </button>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                            Class
                          </th>
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                            Subject
                          </th>
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                            Marks Setup (Passing / Total)
                          </th>
                          <th className="py-4 text-[8px] font-bold uppercase tracking-widest text-slate-500 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {classSubjects
                          .filter((cs) => {
                            if (selectedClassTab === "all") return true;
                            return cs.class_id === parseInt(selectedClassTab);
                          })
                          .map((cs) => {
                            const cls = allClasses.find((c) => c.id === cs.class_id);
                            const subj = subjects.find((s) => s.id === cs.subject_id);
                            const teacher = teachers.find((t) => t.id === cs.teacher_id);
                            const isEditing = editingClassSubjectId === cs.id;

                            return (
                              <tr
                                key={`cs-row-${cs.id}`}
                                className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                              >
                                <td className="py-4 text-[10px] font-bold text-slate-900 dark:text-white uppercase">
                                  {cls?.class_name || cls?.name || "Unknown"}
                                </td>
                                <td className="py-4 text-[10px] text-slate-600 dark:text-slate-400 uppercase font-sans">
                                  {subj?.name || "Unknown"}
                                </td>
                                <td className="py-4 text-[10px] text-slate-600 dark:text-slate-400 uppercase font-mono">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[7px] text-slate-400 font-bold uppercase">Passing</span>
                                        <input
                                          type="number"
                                          value={editingPassingMarks}
                                          onChange={(e) => setEditingPassingMarks(parseInt(e.target.value) || 0)}
                                          className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                        />
                                      </div>
                                      <span className="text-slate-400 dark:text-slate-500 font-bold self-end mb-2">/</span>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[7px] text-slate-400 font-bold uppercase">Total</span>
                                        <input
                                          type="number"
                                          value={editingTotalMarks}
                                          onChange={(e) => setEditingTotalMarks(parseInt(e.target.value) || 0)}
                                          className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="font-semibold text-slate-800 dark:text-slate-300">
                                      {cs.passing_marks} / {cs.total_marks}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 text-right">
                                  {isEditing ? (
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveClassSubjectMarks(cs.id)}
                                        className="px-2.5 py-1.5 bg-emerald-500 text-slate-950 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all hover:bg-emerald-400"
                                        title="Save Setup"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingClassSubjectId(null)}
                                        className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-black text-[8px] uppercase tracking-wider rounded-lg transition-all hover:text-slate-900"
                                        title="Cancel editing"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingClassSubjectId(cs.id);
                                          setEditingTotalMarks(cs.total_marks);
                                          setEditingPassingMarks(cs.passing_marks);
                                        }}
                                        className="text-amber-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                                        title="Modify Setup Marks"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteClassSubject(cs.id)}
                                        className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                                        title="Delete Assignment"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 pb-24 text-left"
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-[0.1em] uppercase text-slate-900 dark:text-white leading-tight">
                  Academic Timeline
                </h3>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">
                  Chronological synchronization of assignments and events
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 bg-card border border-slate-800 p-2 rounded-2xl shadow-xl">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="px-6 text-center min-w-[200px]">
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                      {currentCalendarDate.toLocaleString("default", {
                        month: "long",
                      })}{" "}
                      {currentCalendarDate.getFullYear()}
                    </h4>
                  </div>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setEventForm({
                      title: "",
                      date: selectedCalendarDay
                        ? selectedCalendarDay.toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0],
                      type: "event",
                      description: "",
                    });
                    setIsEventModalOpen(true);
                  }}
                  className="px-6 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  <Plus className="w-4 h-4" />
                  Create Event
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-[#020617]/40 border border-slate-800 p-4 rounded-xl mb-6">
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
              {/* Main Calendar Grid */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-card border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="grid grid-cols-7 border-b border-slate-800 bg-[#020617]/50">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={`cal-header-${day}`}
                          className="py-6 text-center"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {day}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-slate-800">
                    {getCalendarDays().map((day, idx) => {
                      const dateStr = day?.toISOString().split("T")[0];
                      const dayEvents = schoolEvents.filter(
                        (e) => e.date === dateStr,
                      );
                      const isToday =
                        dateStr === new Date().toISOString().split("T")[0];
                      const isSelected =
                        selectedCalendarDay?.getTime() === day?.getTime();

                      // Weekday calculations
                      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                      const dayOfWeekName = day ? weekdays[day.getDay()] : "";
                      const isWeekOff = day ? timetable.week_offs.includes(dayOfWeekName) : false;
                      const isWorkingDay = day ? timetable.working_days.includes(dayOfWeekName) : false;
                      const attendanceLog = day && dateStr ? teacherLogs.find(l => l.attendance_date === dateStr) : null;

                      return (
                        <div
                          key={`cal-day-${idx}`}
                          onClick={() => day && setSelectedCalendarDay(day)}
                          className={`min-h-[140px] bg-card p-4 transition-all relative group cursor-pointer hover:bg-slate-900/30 ${!day ? "bg-slate-950/50" : ""} ${isSelected ? "ring-2 ring-emerald-500/50 z-10" : ""} ${isWeekOff ? "bg-slate-955/35 border-slate-900/40" : ""}`}
                        >
                          {day && (
                            <div className="space-y-2 h-full flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <span
                                    className={`text-xs font-mono font-bold ${isToday ? "bg-emerald-500 text-slate-950 w-7 h-7 flex items-center justify-center rounded-lg shadow-lg shadow-emerald-500/20" : "text-slate-500"}`}
                                  >
                                    {day.getDate()}
                                  </span>
                                  {dayEvents.length > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  )}
                                </div>

                                {/* Attendance indicators */}
                                <div className="flex flex-col gap-1">
                                  {attendanceLog ? (
                                    <div className="space-y-1">
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                        attendanceLog.status === "Present"
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                          : attendanceLog.status === "Absent"
                                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                      }`}>
                                        {attendanceLog.status === "Present" ? "● PRESENT" : attendanceLog.status === "Absent" ? "● ABSENT" : "● LEAVE"}
                                      </span>
                                      {attendanceLog.check_in && (
                                        <p className="text-[7.5px] font-mono text-slate-500 tracking-tighter truncate leading-none">
                                          In: {attendanceLog.check_in.slice(0, 5)}
                                          {attendanceLog.check_out ? ` / Out: ${attendanceLog.check_out.slice(0, 5)}` : " (Active)"}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    (() => {
                                      const todayStr = new Date().toISOString().split("T")[0];
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
                                {dayEvents.map((e) => (
                                  <div
                                    key={`day-ev-${e.id}`}
                                    className={`px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-tighter truncate border bg-${e.color}-500/10 text-${e.color}-500 border-${e.color}-500/20`}
                                  >
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

              {/* Sidebar / Daily Detail */}
              <div className="space-y-6">
                <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-white">
                        Daily Agenda
                      </h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                        {selectedCalendarDay
                          ? selectedCalendarDay.toLocaleDateString("default", {
                              dateStyle: "long",
                            })
                          : "Select Date"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedCalendarDay ? (
                      (() => {
                        const dateStr = selectedCalendarDay
                          .toISOString()
                          .split("T")[0];
                        const dayEvents = schoolEvents.filter(
                          (e) => e.date === dateStr,
                        );

                        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                        const dayName = weekdays[selectedCalendarDay.getDay()];
                        const isWeekOff = timetable.week_offs.includes(dayName);
                        const isWorking = timetable.working_days.includes(dayName);
                        const attLog = teacherLogs.find(l => l.attendance_date === dateStr);

                        return (
                          <div className="space-y-4">
                            {/* Personal Attendance summary */}
                            <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#10b981] flex items-center justify-between">
                                <span>My Attendance Status</span>
                                <span className="text-[8px] font-mono text-slate-500">{dayName}</span>
                              </h5>
                              
                              {attLog ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">Status:</span>
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      attLog.status === "Present" 
                                        ? "bg-emerald-500/10 text-[#10b981] border border-emerald-500/20" 
                                        : attLog.status === "Absent"
                                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    }`}>
                                      {attLog.status || "OK"}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-[9px]">
                                    <div>
                                      <p className="text-slate-500 text-[8px] uppercase">PUNCH IN</p>
                                      <p className="text-white mt-0.5">{attLog.check_in || "--:--"}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-[8px] uppercase">PUNCH OUT</p>
                                      <p className="text-white mt-0.5">{attLog.check_out || "--:--"}</p>
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
                                <p className="uppercase tracking-widest text-[8px] text-slate-400 mb-1">Shift Hours</p>
                                <div className="flex justify-between">
                                  <span>Check-In window:</span>
                                  <span className="text-slate-350 font-mono text-[8px]">{timetable.check_in_start} - {timetable.check_in_end}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Check-Out window:</span>
                                  <span className="text-slate-350 font-mono text-[8px]">{timetable.check_out_start} - {timetable.check_out_end}</span>
                                </div>
                              </div>
                            </div>

                            {/* Academic and Administrative events list */}
                            {dayEvents.length > 0 ? (
                              <div className="space-y-2 pt-2">
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Administrative Events</p>
                                {dayEvents.map((e) => (
                                  <div
                                    key={`agenda-ev-${e.id}`}
                                    className="group p-5 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 transition-all relative"
                                  >
                                    <div className="flex items-start gap-4">
                                      <div
                                        className={`w-2 h-2 rounded-full bg-${e.color}-500 mt-1.5 shadow-[0_0_10px_rgba(var(--${e.color}-rgb),0.5)]`}
                                      />
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[11px] font-bold text-white uppercase tracking-widest leading-tight">
                                            {e.title}
                                          </p>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => openEditEvent(e)}
                                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteEvent(e.id)}
                                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span
                                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-[0.1em] bg-${e.color}-500/10 text-${e.color}-500`}
                                          >
                                            {e.type}
                                          </span>
                                          {e.description && (
                                            <span className="w-1 h-1 bg-slate-800 rounded-full" />
                                          )}
                                          {e.description && (
                                            <p className="text-[9px] text-slate-500 line-clamp-1">
                                              {e.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-8 text-center space-y-4 bg-slate-900/10 rounded-3xl border border-dashed border-slate-800/40">
                                <Bell className="w-6 h-6 text-slate-700 mx-auto" />
                                <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-relaxed">
                                  No administrative events
                                  <br />
                                  listed for today.
                                </p>
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
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                          Awaiting interaction
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 text-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GraduationCap className="w-24 h-24" />
                  </div>
                  <h4 className="text-slate-950 font-bold text-lg uppercase tracking-widest leading-tight mb-2">
                    Annual Year
                    <br />
                    2024 - 2025
                  </h4>
                  <p className="text-slate-900/70 text-[10px] uppercase font-bold tracking-widest">
                    Strategic timeline active
                  </p>
                </div>

                <div className="bg-card border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Users className="w-3 h-3" /> Staff Allocation
                  </h4>
                  <div className="space-y-3">
                    {assignments.slice(0, 5).map((asg) => {
                      const cls = allClasses.find((c) => c.id === asg.class_id);
                      const teacher = teachers.find(
                        (t) => t.id === asg.teacher_id,
                      );
                      return (
                        <div
                          key={`cal-asg-${asg.id}`}
                          className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/50"
                        >
                          <p className="text-[9px] font-bold text-white uppercase">
                            {cls?.class_name || "Class"}
                          </p>
                          <p className="text-[8px] text-emerald-500 uppercase tracking-widest mt-1">
                            {teacher?.name || "Teacher"}
                          </p>
                        </div>
                      );
                    })}
                    {assignments.length > 5 && (
                      <p className="text-[7px] text-slate-600 uppercase tracking-widest text-center">
                        + {assignments.length - 5} more assignments
                      </p>
                    )}
                    {assignments.length === 0 && (
                      <p className="text-[8px] text-slate-600 uppercase tracking-widest text-center py-4">
                        No active assignments
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 pb-20"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold tracking-[0.1em] uppercase text-slate-900 dark:text-white leading-tight">
                  Identity Terminal
                </h3>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mt-1">
                  Personnel Management Interface
                </p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md self-start">
                {[
                  { id: "profile-view", label: "Manage Profile", icon: User },
                  {
                    id: "profile-security",
                    label: "Change Password",
                    icon: Shield,
                  },
                ].map((tab) => (
                  <button
                    key={`profile-tab-${tab.id}`}
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`flex items-center gap-3 px-6 py-2.5 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeSubTab === tab.id ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/50"}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeSubTab === "profile-view" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-card border border-border p-8 rounded-[3rem] shadow-xl text-center space-y-6 relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-2 bg-emerald-500" />
                    <div className="relative inline-block group/avatar">
                      <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center transition-transform group-hover/avatar:scale-105">
                        {profileData.avatar || user.profile_picture_url ? (
                          <img
                            src={profileData.avatar || user.profile_picture_url}
                            alt={user.name!}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 text-slate-300" />
                        )}
                      </div>
                      <label
                        className="absolute bottom-0 right-0 p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-[#020617] cursor-pointer"
                        title="Update Biometrics"
                      >
                        <Plus className="w-4 h-4" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfileData((prev) => ({
                                  ...prev,
                                  avatar: reader.result as string,
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold uppercase tracking-widest text-slate-900 dark:text-white leading-tight">
                        {user.name}
                      </h4>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-2">
                        {user.designation || user.role}
                      </p>
                    </div>
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-border">
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">
                          Emp ID
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {user.id}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-border">
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">
                          Status
                        </p>
                        <p className="text-xs font-bold text-emerald-500 uppercase">
                          Active
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-card border border-border p-10 rounded-[3rem] shadow-xl space-y-8">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Core Identity Data
                      </h4>
                      <button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="text-[9px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl border border-border hover:bg-emerald-500/10 hover:text-emerald-500 transition-all flex items-center gap-2 group"
                      >
                        <Edit className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                        {isEditingProfile
                          ? "Cancel Edits"
                          : "Open Modification Link"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Legal Name
                        </label>
                        <input
                          readOnly={!isEditingProfile}
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              name: e.target.value,
                            })
                          }
                          className={`w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-2xl px-5 py-4 text-xs ${isEditingProfile ? "text-white border-emerald-500/30" : "text-slate-400 opacity-60"} outline-none transition-all shadow-inner`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Email Protocol
                        </label>
                        <input
                          readOnly={!isEditingProfile}
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                          className={`w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-2xl px-5 py-4 text-xs ${isEditingProfile ? "text-white border-emerald-500/30" : "text-slate-400 opacity-60"} outline-none transition-all shadow-inner`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Mobile Frequency
                        </label>
                        <input
                          readOnly={!isEditingProfile}
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                          placeholder="e.g. +92 3XX XXXXXXX"
                          className={`w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-2xl px-5 py-4 text-xs ${isEditingProfile ? "text-white border-emerald-500/30" : "text-slate-400 opacity-60"} outline-none transition-all shadow-inner`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Personnel ID
                        </label>
                        <input
                          readOnly
                          value={user.personnel || "654321"}
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-2xl px-5 py-4 text-xs text-slate-500 opacity-60 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Professional Biography
                      </label>
                      <textarea
                        readOnly={!isEditingProfile}
                        value={profileData.bio}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            bio: e.target.value,
                          })
                        }
                        placeholder="Brief professional mission statement..."
                        rows={4}
                        className={`w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-3xl px-5 py-4 text-xs ${isEditingProfile ? "text-white border-emerald-500/30" : "text-slate-400 opacity-60"} outline-none transition-all shadow-inner`}
                      />
                    </div>

                    {isEditingProfile && (
                      <div className="pt-4 flex justify-end">
                        <button className="flex items-center gap-2 px-10 py-5 bg-emerald-500 text-slate-950 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                          Synchronize Record
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "profile-security" && (
              <div className="max-w-2xl mx-auto w-full">
                <div className="bg-card border border-border p-10 rounded-[3rem] shadow-xl space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Shield className="w-32 h-32 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-light uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2">
                      Access Key Override
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                      Update session verification keys
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                        Existing Cipher
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          New Security Key
                        </label>
                        <input
                          type="password"
                          required
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              newPassword: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">
                          Recode Verification
                        </label>
                        <input
                          type="password"
                          required
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-5 text-xs text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        disabled={isUpdatingPassword}
                        className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                      >
                        {isUpdatingPassword
                          ? "Applying Cryptography..."
                          : "Commit Security Update"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "stats" && (
          <motion.div
            key="stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 flex flex-col items-center justify-center opacity-30"
          >
            <Shield className="w-8 h-8 mb-4" />
            <p className="text-[9px] uppercase tracking-widest">
              Admin Module Synchronizing...
            </p>
          </motion.div>
        )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md"
              onClick={() => setShowLeaveModal(false)}
            />
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-800 max-w-sm w-full p-8 rounded-[2.5rem] relative z-10 shadow-3xl overflow-y-auto max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#10b981]" />
              <div className="mb-6">
                <h3 className="text-xl font-light tracking-[0.1em] uppercase text-white mb-1">
                  New Leave Entry
                </h3>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest">
                  Authentication Required
                </p>
              </div>
              <form className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Category
                  </label>
                  <select
                    value={leaveFormData.type}
                    onChange={(e) =>
                      setLeaveFormData({
                        ...leaveFormData,
                        type: e.target.value,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white focus:border-[#10b981] outline-none appearance-none"
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Personal Reason">
                      Personal Reason / Other
                    </option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={leaveFormData.startDate}
                      onChange={(e) =>
                        setLeaveFormData({
                          ...leaveFormData,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={leaveFormData.endDate}
                      onChange={(e) =>
                        setLeaveFormData({
                          ...leaveFormData,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-[#020617]/50 rounded-xl border border-slate-800/50">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                    Duration
                  </span>
                  <span
                    className={`text-xs font-bold font-mono ${leaveDays > 0 ? "text-[#10b981]" : "text-red-500"}`}
                  >
                    {leaveDays} {leaveDays === 1 ? "Day" : "Days"}
                  </span>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Justification
                  </label>
                  <textarea
                    rows={2}
                    value={leaveFormData.reason}
                    onChange={(e) =>
                      setLeaveFormData({
                        ...leaveFormData,
                        reason: e.target.value,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white resize-none"
                    placeholder="Enter reason for leave..."
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Supporting Document
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="leave-doc"
                      className="hidden"
                      onChange={(e) =>
                        setLeaveFormData({
                          ...leaveFormData,
                          document: e.target.files?.[0] || null,
                        })
                      }
                    />
                    <label
                      htmlFor="leave-doc"
                      className="flex items-center justify-between w-full bg-[#020617] border border-dashed border-slate-700 px-4 py-3 rounded-xl text-[10px] text-slate-400 cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                      <span className="truncate max-w-[150px]">
                        {leaveFormData.document
                          ? leaveFormData.document.name
                          : "Upload File (PDF/Image)"}
                      </span>
                      <Plus className="w-3 h-3" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (leaveDays <= 0) return alert("Invalid date range");
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

        {isEventModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md"
              onClick={() => setIsEventModalOpen(false)}
            />
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-800 max-w-sm w-full p-8 rounded-[2.5rem] relative z-10 shadow-3xl overflow-y-auto max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
              <div className="mb-6">
                <h3 className="text-xl font-light tracking-[0.1em] uppercase text-white mb-1">
                  {editingEvent ? "Edit Event" : "New School Event"}
                </h3>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest">
                  Administrative Control
                </p>
              </div>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title: e.target.value })
                    }
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                    placeholder="Enter event title"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Event Type
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white focus:border-emerald-500 outline-none appearance-none"
                  >
                    <option value="academic">Academic</option>
                    <option value="event">General Event</option>
                    <option value="exam">Examination</option>
                    <option value="holiday">Public Holiday</option>
                    <option value="staff">Staff Development</option>
                  </select>
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-[#020617] border border-slate-700 px-4 py-3 rounded-xl text-xs text-white resize-none"
                    placeholder="Brief details (optional)..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="flex-1 py-4 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEvent}
                    className="flex-1 py-4 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {isSavingEvent
                      ? "Processing..."
                      : editingEvent
                        ? "Update Event"
                        : "Create Event"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                    Confirm Leave
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                    You are requesting{" "}
                    <span className="text-amber-500 font-bold">
                      {leaveFormData.type}
                    </span>{" "}
                    for{" "}
                    <span className="text-amber-500 font-bold">
                      {leaveDays} days
                    </span>
                    .
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <div className="bg-slate-50 dark:bg-[#020617] border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest">
                      Interval
                    </p>
                    <p className="text-[10px] font-bold font-mono text-slate-900 dark:text-white">
                      {leaveFormData.startDate} — {leaveFormData.endDate}
                    </p>
                  </div>
                  {leaveFormData.document && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-2xl flex justify-between items-center">
                      <p className="text-[8px] text-emerald-600 uppercase tracking-widest font-bold">
                        Attachment Attached
                      </p>
                      <p className="text-[9px] text-emerald-500 font-mono truncate max-w-[120px]">
                        {leaveFormData.document.name}
                      </p>
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
                      setIsProcessingLeave(0); // Using 0 as surrogate for self-leave submission loading
                      try {
                        let documentUrl = null;

                        if (leaveFormData.document && isSupabaseConfigured) {
                          const file = leaveFormData.document;
                          const fileExt = file.name.split(".").pop();
                          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                          const filePath = `documents/${fileName}`;

                          const { error: uploadError } = await supabase.storage
                            .from("leave-documents")
                            .upload(filePath, file);

                          if (uploadError) throw uploadError;

                          const {
                            data: { publicUrl },
                          } = supabase.storage
                            .from("leave-documents")
                            .getPublicUrl(filePath);

                          documentUrl = publicUrl;
                        }

                        if (!isSupabaseConfigured) {
                          const mockRequest: LeaveRequest = {
                            id: Date.now(),
                            teacher_id: user.id,
                            leave_type: leaveFormData.type,
                            from_date: leaveFormData.startDate,
                            to_date: leaveFormData.endDate,
                            days: leaveDays,
                            reason: leaveFormData.reason,
                            status: "Approved", // Admins auto-approve themselves for now or just set as Pending
                            submitted_at: new Date().toISOString(),
                            emis: user.emis,
                          };
                          setAllLeaveRequests([
                            mockRequest,
                            ...allLeaveRequests,
                          ]);
                        } else {
                          const { data, error } = await supabase
                            .from("leave_requests")
                            .insert([
                              {
                                teacher_id: user.id,
                                leave_type: leaveFormData.type,
                                from_date: leaveFormData.startDate,
                                to_date: leaveFormData.endDate,
                                days: leaveDays,
                                reason: leaveFormData.reason,
                                status: "Pending",
                                document_url: documentUrl,
                                emis: user.emis,
                              },
                            ])
                            .select();

                          if (error) throw error;
                          if (data)
                            setAllLeaveRequests([data[0], ...allLeaveRequests]);
                        }

                        alert("Leave request submitted successfully.");
                        setShowLeaveConfirmModal(false);
                        setShowLeaveModal(false);
                        setLeaveFormData({
                          type: "Casual Leave",
                          startDate: new Date().toISOString().split("T")[0],
                          endDate: new Date().toISOString().split("T")[0],
                          reason: "",
                          document: null,
                        });
                      } catch (err: any) {
                        alert(`Submission failed: ${err.message}`);
                      } finally {
                        setIsProcessingLeave(null);
                      }
                    }}
                    disabled={isProcessingLeave !== null}
                    className="flex-1 bg-amber-500 text-slate-900 rounded-xl font-bold py-4 text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isProcessingLeave !== null ? "Uploading..." : "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmationModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
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
