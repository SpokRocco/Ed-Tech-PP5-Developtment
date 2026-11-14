import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SchoolDataProvider } from './hooks/useSchoolData';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { CoursePp5Workspace } from './pages/CoursePp5Workspace';
import { ClassroomPp5Page } from './pages/ClassroomPp5Page';
import { Primary2568Page } from './pages/Primary2568Page';

function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-100 text-navy-900 font-medium">
        กำลังโหลดระบบ ปพ.5 โรงเรียนบ้านหาดเค็ด...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'executive') return <Navigate to="/executive" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/teacher" replace />;
}

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-100 text-navy-900 font-medium">
        กำลังตรวจสอบสิทธิ์การใช้งาน...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <RoleHomeRedirect />;
  }
  return <MainLayout>{children}</MainLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <SchoolDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/executive"
              element={
                <ProtectedRoute allowedRoles={['executive', 'admin']}>
                  <ExecutiveDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course/:courseId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'executive', 'admin']}>
                  <CoursePp5Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classroom"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'executive', 'admin']}>
                  <ClassroomPp5Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/primary-2568"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'executive', 'admin']}>
                  <Primary2568Page />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RoleHomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </SchoolDataProvider>
    </AuthProvider>
  );
}
