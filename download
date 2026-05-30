import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) => {
  const colors = {
    danger: {
      accent: 'bg-red-500',
      light: 'bg-red-500/10',
      text: 'text-red-500',
      button: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
    },
    warning: {
      accent: 'bg-amber-500',
      light: 'bg-amber-500/10',
      text: 'text-amber-500',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
    },
    info: {
      accent: 'bg-indigo-500',
      light: 'bg-indigo-500/10',
      text: 'text-indigo-500',
      button: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20',
    },
  };

  const currentTheme = colors[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden z-10"
          >
            <div className={`absolute top-0 left-0 w-full h-1.5 ${currentTheme.accent}`} />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className={`w-16 h-16 rounded-2xl ${currentTheme.light} flex items-center justify-center`}>
                <AlertTriangle className={`w-8 h-8 ${currentTheme.text}`} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest">{title}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">
                  {message}
                </p>
              </div>

              <div className="w-full flex flex-col gap-3 pt-2">
                <button 
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`w-full ${currentTheme.button} text-white rounded-2xl font-bold py-4 text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50`}
                >
                  {isLoading ? 'Processing...' : confirmText}
                </button>
                <button 
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
