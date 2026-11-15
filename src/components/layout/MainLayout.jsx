import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, BookOpenCheck, Settings2, BookCopy, Sprout, FolderOpen } from 'lucide-react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { useAuth } from '../../hooks/useAuth';
import { useSchoolData } from '../../hooks/useSchoolData';

export function MainLayout({ children }) {
  const { user, logout, isLiveBackend } = useAuth();
  const { settings } = useSchoolData();

  const navItems = [];
  if (user?.role === 'executive' || user?.role === 'admin') {
    navItems.push({
      to: '/executive',
      label: 'แดชบอร์ดผู้บริหาร',
      icon: BarChart3,
    });
  }
  if (user?.role === 'teacher' || user?.role === 'admin') {
    navItems.push({
      to: '/teacher',
      label: '📔 ปพ.5 รายวิชา',
      icon: BookOpenCheck,
    });
  }
  if (user) {
    navItems.push(
      {
        to: '/classroom',
        label: '📘 ปพ.5 รายชั้นเรียน',
        icon: BookCopy,
      },
      {
        to: '/primary-2568',
        label: '🌱 ปพ.5 ป.1-3 (2569) & ปพ.6',
        icon: Sprout,
      },
      {
        to: '/documents',
        label: '🗂 ศูนย์เอกสาร ปพ.4-8 & อบ.',
        icon: FolderOpen,
      }
    );
  }
  if (user?.role === 'admin') {
    navItems.push({
      to: '/admin',
      label: 'จัดการระบบ (/admin)',
      icon: Settings2,
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <AppHeader
        settings={settings}
        user={user}
        isLiveBackend={isLiveBackend}
        onLogout={logout}
      />

      {user && navItems.length > 0 && (
        <nav className="no-print bg-white border-b border-ivory-300 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-navy-800 text-gold-300 shadow-sm ring-1 ring-gold-500/40'
                          : 'text-slate-600 hover:bg-navy-50 hover:text-navy-800'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <AppFooter settings={settings} />
    </div>
  );
}
