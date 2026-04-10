import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BankDetails from './pages/BankDetails';
import ExamSession from './pages/ExamSession';
import History from './pages/History';
import ResultBoard from './pages/ResultBoard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/bank/:id" element={<Layout><BankDetails /></Layout>} />
        <Route path="/history" element={<Layout><History /></Layout>} />
        {/* Fullscreen Routes */}
        <Route path="/exam/:id" element={<ExamSession />} />
        <Route path="/result/:id" element={<ResultBoard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
