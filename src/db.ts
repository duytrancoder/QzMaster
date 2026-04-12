import Dexie, { type EntityTable } from 'dexie';
import { Bank, Question, ExamHistory } from './app/types';

export type DBBank = Bank;
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
