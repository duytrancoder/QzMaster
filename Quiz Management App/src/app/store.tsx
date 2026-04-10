import React, { createContext, useContext, useState, useEffect } from "react";
import { Bank, ExamHistory, ActiveExam, Question } from "./types";

interface AppState {
  banks: Bank[];
  history: ExamHistory[];
  activeExam: ActiveExam | null;
}

interface AppContextType extends AppState {
  addBank: (bank: Bank) => void;
  updateBank: (bank: Bank) => void;
  deleteBank: (id: string) => void;
  addQuestionToBank: (bankId: string, question: Question) => void;
  saveHistory: (history: ExamHistory) => void;
  setActiveExam: (exam: ActiveExam | null) => void;
  importBanks: (newBanks: Bank[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem("quiz_app_state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
    return { banks: [], history: [], activeExam: null };
  });

  useEffect(() => {
    localStorage.setItem("quiz_app_state", JSON.stringify(state));
  }, [state]);

  const addBank = (bank: Bank) => {
    setState((prev) => ({ ...prev, banks: [...prev.banks, bank] }));
  };

  const updateBank = (bank: Bank) => {
    setState((prev) => ({
      ...prev,
      banks: prev.banks.map((b) => (b.id === bank.id ? bank : b)),
    }));
  };

  const deleteBank = (id: string) => {
    setState((prev) => ({
      ...prev,
      banks: prev.banks.filter((b) => b.id !== id),
    }));
  };

  const addQuestionToBank = (bankId: string, question: Question) => {
    setState((prev) => ({
      ...prev,
      banks: prev.banks.map((b) =>
        b.id === bankId ? { ...b, questions: [...b.questions, question] } : b
      ),
    }));
  };

  const saveHistory = (historyItem: ExamHistory) => {
    setState((prev) => ({
      ...prev,
      history: [historyItem, ...prev.history],
      activeExam: null,
    }));
  };

  const setActiveExam = (exam: ActiveExam | null) => {
    setState((prev) => ({ ...prev, activeExam: exam }));
  };

  const importBanks = (newBanks: Bank[]) => {
    setState((prev) => {
      // Merge logic: simple append for now, can be improved
      const existingIds = new Set(prev.banks.map(b => b.id));
      const banksToAdd = newBanks.filter(b => !existingIds.has(b.id));
      return { ...prev, banks: [...prev.banks, ...banksToAdd] };
    });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        addBank,
        updateBank,
        deleteBank,
        addQuestionToBank,
        saveHistory,
        setActiveExam,
        importBanks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}
