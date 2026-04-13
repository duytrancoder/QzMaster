import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppProvider } from './store';
import { Toaster } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { motion, AnimatePresence } from 'motion/react';

function AppShell() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-blue-500"
        />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginForm />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="contents">
          <AppProvider>
            <RouterProvider router={router} />
          </AppProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <>
      <AppShell />
      <Toaster theme="dark" position="bottom-right" richColors />
    </>
  );
}
