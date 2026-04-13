export interface Question {
  id: string;
  content?: string;
  text?: string; // backwards compatibility
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: "A" | "B" | "C" | "D";
  correct?: "A" | "B" | "C" | "D"; // backwards compatibility
}

export interface Bank {
  id: string;
  name: string;
  ownerId?: string;
  shareCode?: string | null;
  isShared?: boolean;
}

export interface DashboardStats {
  totalBanks: number;
  totalQuestions: number;
  totalExams: number;
}

export interface ExamHistory {
  id: string;
  bankId: string;
  bankName: string;
  date: string;
  score: number;
  total: number;
  answers: Record<string, "A" | "B" | "C" | "D">;
  mode: "random" | "all" | "specific";
  timeLimit: number;
  timeTaken: number;
  questions: Question[]; // Snapshot for review
}

export interface ActiveExam {
  id: string;
  bankId: string;
  bankName: string;
  questions: Question[];
  mode: "random" | "all" | "specific";
  timeLimit: number; // minutes
  startTime: number; // timestamp
  answers: Record<string, "A" | "B" | "C" | "D">;
}
