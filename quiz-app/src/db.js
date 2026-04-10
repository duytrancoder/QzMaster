import Dexie from 'dexie';

export const db = new Dexie('QuizAppDB');

// Khai báo schema Version 1
// Bảng questionBanks: khóa chính id
// Bảng questions: khóa chính id, indexed column bankId
db.version(1).stores({
  questionBanks: 'id, name, createdAt', // id là primary key
  questions: 'id, bankId, content', // id là primary key, bankId được index để truy vấn nhanh
  examHistory: 'id, bankId, dateCompleted' // id pk, dateCompleted for sorting
});
