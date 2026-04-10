import React, { createContext, useContext, useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Bank, ExamHistory, ActiveExam, Question } from "./types";
import { generateId } from "./utils";

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
  const banksRaw = useLiveQuery(() => db.questionBanks.toArray()) || [];
  const questionsRaw = useLiveQuery(() => db.questions.toArray()) || [];
  const historyRaw = useLiveQuery(() => db.examHistory.reverse().toArray()) || [];
  
  const [activeExam, setActiveExamState] = useState<ActiveExam | null>(null);

  const banks = useMemo<Bank[]>(() => {
    return banksRaw.map(b => ({
      id: b.id,
      name: b.name,
      questions: questionsRaw.filter(q => q.bankId === b.id).map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correct: q.correct
      }))
    }));
  }, [banksRaw, questionsRaw]);

  // Context Actions synced to Dexie
  const addBank = async (bank: Bank) => {
    await db.questionBanks.add({ id: bank.id, name: bank.name });
    if (bank.questions && bank.questions.length > 0) {
       const qsToInsert = bank.questions.map(q => ({ ...q, bankId: bank.id }));
       await db.questions.bulkAdd(qsToInsert);
    }
  };

  const updateBank = async (bank: Bank) => {
    await db.questionBanks.put({ id: bank.id, name: bank.name });
    // Updating questions entails removing old ones and adding new ones to keep it simple, or using put
    await db.questions.where('bankId').equals(bank.id).delete();
    if (bank.questions && bank.questions.length > 0) {
      const qsToInsert = bank.questions.map(q => ({ ...q, bankId: bank.id }));
      await db.questions.bulkAdd(qsToInsert);
    }
  };

  const deleteBank = async (id: string) => {
    await Promise.all([
      db.questionBanks.delete(id),
      db.questions.where('bankId').equals(id).delete()
    ]);
  };

  const addQuestionToBank = async (bankId: string, question: Question) => {
    await db.questions.add({ ...question, bankId });
  };

  const saveHistory = async (historyItem: ExamHistory) => {
    await db.examHistory.add(historyItem);
    setActiveExamState(null);
  };

  const setActiveExam = (exam: ActiveExam | null) => {
    setActiveExamState(exam);
  };

  const importBanks = async (newBanks: Bank[]) => {
    // Simple filter to skip existing bank names or IDs
    for (const b of newBanks) {
      const exist = await db.questionBanks.get(b.id);
      if (!exist) {
        await addBank(b);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        banks,
        history: historyRaw,
        activeExam,
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
