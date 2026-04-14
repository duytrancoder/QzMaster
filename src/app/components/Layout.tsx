import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { BookOpen, Edit3, History, Home, PlayCircle, Menu, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const navItems = [
  { name: 'Trang chủ', path: '/', icon: Home },
  { name: 'Kho ôn tập', path: '/banks', icon: BookOpen },
  { name: 'Ôn tập tự do', path: '/practice', icon: Edit3 },
  { name: 'Thi thử', path: '/exam/config', icon: PlayCircle },
  { name: 'Lịch sử', path: '/history', icon: History },
];

export function Layout() {
  const location = useLocation();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { user, signOut } = useAuth();
  const isDayMode = !isDarkMode;

  useEffect(() => {
    setIsDarkMode(true);
    document.documentElement.classList.add('dark');
    localStorage.setItem('qzmaster-theme', 'dark');
  }, []);

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem('qzmaster-theme', checked ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Đã đăng xuất.');
    } catch {
      toast.error('Đăng xuất thất bại.');
    }
  };

  return (
    <div className="flex h-screen bg-[#07080a] text-slate-100 font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarExpanded ? 256 : 80 }}
        className="border-r border-white/10 bg-white/[0.03] flex flex-col relative z-20 shrink-0 overflow-hidden backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        {/* Header */}
        <div className={`p-6 flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'}`}>
          <AnimatePresence>
            {isSidebarExpanded && (
              <motion.h1
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent whitespace-nowrap overflow-hidden"
              >
                QzMaster
              </motion.h1>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors duration-150 shrink-0"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (location.pathname.startsWith('/exam') && item.path.startsWith('/exam'));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center py-3 rounded-xl transition-all duration-150 relative ${
                  isSidebarExpanded ? 'px-4 gap-3' : 'justify-center'
                } ${
                  isActive
                    ? 'text-blue-400 font-semibold shadow-[0_0_0_1px_rgba(96,165,250,0.12)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10 shrink-0" />
                <span
                  className={`relative z-10 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
                    isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {isSidebarExpanded && (
          <div className="px-6 pb-2">
            <p
              className="text-[11px] text-slate-400 tracking-[0.08em] italic"
              style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
            >
              Designed by Khánh Duy
            </p>
          </div>
        )}

        {/* User + Sign Out */}
        <div className={`p-4 border-t border-white/10 ${isSidebarExpanded ? '' : 'flex justify-center'}`}>
          {isSidebarExpanded ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{user?.email}</p>
                  <p className="text-xs text-slate-500">Đã đăng nhập</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <span className="text-xs text-slate-300 font-medium">Ngày / Đêm</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="dark-2"
                  checked={isDayMode}
                  onChange={(event) => handleThemeToggle(!event.target.checked)}
                  aria-label="Chuyển ngày đêm"
                  title="Chuyển ngày đêm"
                />
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150 shadow-sm"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <input
                type="checkbox"
                role="switch"
                className="dark-2"
                checked={isDayMode}
                onChange={(event) => handleThemeToggle(!event.target.checked)}
                aria-label="Chuyển ngày đêm"
                title="Chuyển ngày đêm"
              />
              <button
                onClick={handleSignOut}
                title="Đăng xuất"
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-[#07080a] to-[#07080a] -z-10" />
        <div className="h-full overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
