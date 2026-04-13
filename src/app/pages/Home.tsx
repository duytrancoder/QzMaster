import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAppStore } from '../store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { BookOpen, Database, History as HistoryIcon } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const {
    dashboardStats,
    recentActivities,
    isLoadingDashboard,
    joinByCode,
    fetchDashboardStats,
  } = useAppStore();

  const [shareCodeInput, setShareCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = shareCodeInput.trim().toUpperCase();
    if (normalizedCode.length !== 6) {
      toast.error('Mã chia sẻ phải gồm 6 ký tự.');
      return;
    }

    setIsJoining(true);
    try {
      const joinedBank = await joinByCode(normalizedCode);
      toast.success(`Đã gia nhập kho: ${joinedBank.name}`);
      setShareCodeInput('');
      navigate('/practice');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gia nhập bằng mã chia sẻ.';
      toast.error(msg);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <header>
        <h1 className="text-3xl font-bold text-slate-100">Tổng quan hệ thống</h1>
        <p className="text-slate-400 mt-1">Theo dõi dữ liệu học tập và gia nhập kho bằng mã chia sẻ.</p>
      </header>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="join">Nhập mã chia sẻ</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="space-y-1">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <Database size={16} /> Tổng số kho
                </CardDescription>
                <CardTitle className="text-3xl text-slate-100">
                  {isLoadingDashboard ? '...' : dashboardStats.totalBanks}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="space-y-1">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <BookOpen size={16} /> Tổng câu hỏi
                </CardDescription>
                <CardTitle className="text-3xl text-slate-100">
                  {isLoadingDashboard ? '...' : dashboardStats.totalQuestions}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="space-y-1">
                <CardDescription className="text-slate-400 flex items-center gap-2">
                  <HistoryIcon size={16} /> Đã làm bài
                </CardDescription>
                <CardTitle className="text-3xl text-slate-100">
                  {isLoadingDashboard ? '...' : dashboardStats.totalExams}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Hoạt động gần đây</CardTitle>
              <CardDescription className="text-slate-400">5 bài thi gần nhất của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tên kho</TableHead>
                    <TableHead className="text-slate-400">Số điểm</TableHead>
                    <TableHead className="text-slate-400">Ngày thi</TableHead>
                    <TableHead className="text-slate-400 text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDashboard ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                        Đang tải dữ liệu...
                      </TableCell>
                    </TableRow>
                  ) : recentActivities.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                        Chưa có lịch sử làm bài.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentActivities.map((exam) => {
                      const safeTotal = exam.total > 0 ? exam.total : exam.questions.length;
                      const safeScore = Math.max(0, Math.min(exam.score, safeTotal || exam.score));
                      return (
                        <TableRow key={exam.id} className="border-slate-800">
                          <TableCell className="text-slate-200">{exam.bankName}</TableCell>
                          <TableCell className="text-slate-300">{safeScore}/{safeTotal}</TableCell>
                          <TableCell className="text-slate-400">{new Date(exam.date).toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline" className="border-slate-700">
                              <Link to={`/review/${exam.id}`}>Xem chi tiết</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join">
          <Card className="bg-slate-900/50 border-slate-800 max-w-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Nhập mã gia nhập</CardTitle>
              <CardDescription className="text-slate-400">
                Nhập mã 6 ký tự để xem và thi thử trên kho được chia sẻ.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinByCode} className="space-y-3">
                <Input
                  value={shareCodeInput}
                  onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: X9K2M1"
                  maxLength={6}
                  className="uppercase tracking-widest text-center text-lg"
                />
                <Button type="submit" disabled={isJoining || shareCodeInput.trim().length !== 6} className="w-full">
                  {isJoining ? 'Đang kiểm tra...' : 'Gia nhập bằng mã'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
