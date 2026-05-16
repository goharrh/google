import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogOut, Shield, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react';
import { Employee, TeacherAttendance } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DashboardLayoutProps {
  children: ReactNode;
  user: Employee;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeSubTab?: string | null;
  setActiveSubTab?: (subTab: any) => void;
  tabs: { id: string; label: string; icon: any; subTabs?: { id: string; label: string; icon: any }[] }[];
  title?: string;
  schoolName?: string;
  emis?: string;
  todayAttendance?: TeacherAttendance | null;
}

export default function DashboardLayout({ 
  children, 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  activeSubTab,
  setActiveSubTab,
  tabs,
  title = "Terminal",
  schoolName,
  emis,
  todayAttendance
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans transition-colors duration-500">
      <div className="absolute inset-0 bg-emerald-500 dark:bg-slate-800 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#10b981 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border p-4 md:px-8 flex items-center justify-between transition-colors duration-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center transform rotate-45">
            <Shield className="w-5 h-5 text-slate-900 -rotate-45" />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white leading-none mb-0.5">
              {schoolName || title}
            </h1>
            <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest leading-none">
              {emis ? `EMIS: ${emis}` : 'Attendance System'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {todayAttendance?.check_in && !todayAttendance?.check_out && (
            <div className="hidden sm:flex flex-col items-center px-4 border-l border-slate-200 dark:border-slate-800">
              <span className="text-[7px] text-slate-500 uppercase tracking-widest">Active Since</span>
              <span className="text-[10px] font-mono font-bold text-emerald-500">{todayAttendance.check_in}</span>
            </div>
          )}
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">{user.name}</span>
            <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest leading-none">{user.designation || user.role}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-emerald-500 transition-all border border-slate-200 dark:border-slate-700"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-emerald-500 transition-all border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[280px] bg-white dark:bg-[#0f172a] shadow-2xl z-[70] flex flex-col transition-colors duration-500 border-l border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="flex flex-col truncate">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-900 dark:text-white leading-tight truncate">{user.name}</h2>
                  <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest leading-tight">{user.designation || user.role}</p>
                  <p className="text-[7px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">Emp ID: {user.id}</p>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all border border-slate-200 dark:border-slate-700 shrink-0 ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                {tabs.map((tab) => (
                  <div key={`nav-tab-group-${tab.id}`} className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (!tab.subTabs) setIsSidebarOpen(false);
                        else if (setActiveSubTab && tab.subTabs.length > 0) setActiveSubTab(tab.subTabs[0].id);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                        activeTab === tab.id 
                          ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20' 
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl transition-colors ${
                          activeTab === tab.id ? 'bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        }`}>
                          <tab.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
                      </div>
                      {(activeTab === tab.id && !tab.subTabs) && <ChevronRight className="w-4 h-4" />}
                      {tab.subTabs && (
                        <motion.div animate={{ rotate: activeTab === tab.id ? 90 : 0 }}>
                          <ChevronRight className="w-3 h-3 opacity-50" />
                        </motion.div>
                      )}
                    </button>

                    {tab.subTabs && activeTab === tab.id && (
                      <div className="pl-6 space-y-1 mt-1">
                        {tab.subTabs.map((sub) => (
                          <button
                            key={`nav-subtab-${sub.id}`}
                            onClick={() => {
                              setActiveSubTab?.(sub.id);
                              setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                              activeSubTab === sub.id
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner'
                                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
                            }`}
                          >
                            <sub.icon className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-4">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px]"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Account
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pt-10 relative max-w-lg mx-auto w-full pb-20">
           {children}
        </div>
      </div>
    </div>
  );
}
