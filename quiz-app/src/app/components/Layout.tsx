import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { BookOpen, Edit3, History, Home, Settings, PlayCircle, Menu, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const navItems = [
  { name: "Trang chủ", path: "/", icon: Home },
  { name: "Kho ôn tập", path: "/banks", icon: BookOpen },
  { name: "Ôn tập tự do", path: "/practice", icon: Edit3 },
  { name: "Thi thử", path: "/exam/config", icon: PlayCircle },
  { name: "Lịch sử", path: "/history", icon: History },
];

export function Layout() {
  const location = useLocation();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarExpanded ? 256 : 80 }}
        className="border-r border-slate-800 bg-slate-900/50 flex flex-col relative z-20 shrink-0 overflow-hidden"
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence>
            {isSidebarExpanded && (
              <motion.h1 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent whitespace-nowrap overflow-hidden"
              >
                QzMaster
              </motion.h1>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <Menu size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith('/exam') && item.path.startsWith('/exam'));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? "text-blue-400 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10" />
                <span className={`relative z-10 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${isSidebarExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
        
        {isSidebarExpanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center whitespace-nowrap">
            Dữ liệu lưu tại máy (Local)
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10" />
        <div className="h-full overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
