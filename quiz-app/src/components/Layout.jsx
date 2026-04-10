import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Settings, History as HistoryIcon } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="bg-blue-600 rounded-lg p-1.5 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">QuizMaster</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
           <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm">Quản lý Kho câu hỏi</span>
          </Link>
          <Link to="/history" className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${location.pathname === '/history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            <HistoryIcon className="w-5 h-5" />
            <span className="text-sm">Lịch sử làm bài</span>
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors mt-4 border-t border-slate-100 pt-3">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Cài đặt</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          &copy; 2026 Quiz App Offline
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 shrink-0 flex items-center px-6">
          <h2 className="text-lg font-semibold text-slate-800">Trang chủ</h2>
        </header>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
}
