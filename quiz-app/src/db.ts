import Dexie, { type EntityTable } from 'dexie';
import { Bank, Question, ExamHistory } from './app/types';

// Omit questions from Bank for DB schema
export type DBBank = Omit<Bank, 'questions'> & { id: string, name: string };
export type DBQuestion = Question & { bankId: string };
export type DBExamHistory = ExamHistory;

const db = new Dexie('QuizAppAdvancedDB') as Dexie & {
  questionBanks: EntityTable<DBBank, 'id'>;
  questions: EntityTable<DBQuestion, 'id'>;
  examHistory: EntityTable<DBExamHistory, 'id'>;
};

db.version(1).stores({
  questionBanks: 'id',
  questions: 'id, bankId',
  examHistory: 'id, date'
});

export { db };
