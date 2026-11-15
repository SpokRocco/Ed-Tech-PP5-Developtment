import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEMO_USERS } from '../data/demoSeedData';
import {
  getStoredRuntimeMode,
  setStoredRuntimeMode,
} from '../lib/mediaUtils';
import { dataService } from '../services/dataService';

const DEMO_SESSION_KEY = 'banhatkhet_pp5_demo_user_id';
const DEMO_DB_KEY = 'banhatkhet_pp5_demo_db_v3';

const AuthContext = createContext(null);

function getDemoUsersList() {
  try {
    const raw = localStorage.getItem(DEMO_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.users) && parsed.users.length > 0) {
        return parsed.users;
      }
    }
  } catch {
    // ignore storage read error
  }
  return DEMO_USERS;
}

async function authApiCall(payload) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `คำขอยืนยันตัวตนไม่สำเร็จ (${res.status})`);
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [backendConfigured, setBackendConfiguredState] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [runtimeMode, setRuntimeModeState] = useState('demo');

  const isLiveBackend = backendConfigured && backendReady && runtimeMode === 'live';

  const restoreSessionForMode = useCallback(async (configured, schemaReady, mode) => {
    if (configured && schemaReady && mode === 'live') {
      const res = await fetch('/api/auth', { credentials: 'include' });
      const data = await res.json();
      if (typeof data?.userCount === 'number') {
        setUserCount(data.userCount);
      }
      setUser(data?.user || null);
      return;
    }

    try {
      const savedId = localStorage.getItem(DEMO_SESSION_KEY);
      if (savedId) {
        const found = getDemoUsersList().find((u) => u.id === savedId && u.is_active !== false);
        setUser(found || null);
        return;
      }
    } catch {
      // ignore storage restriction
    }
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const probe = await dataService.probeBackend();
        if (!active) return;
        const configured = Boolean(probe?.configured);
        const schemaReady = Boolean(probe?.schemaReady);
        setBackendConfiguredState(configured);
        setBackendReady(schemaReady);
        if (typeof probe?.userCount === 'number') {
          setUserCount(probe.userCount);
        }

        const mode = getStoredRuntimeMode();
        setRuntimeModeState(mode);

        if (configured && !schemaReady) {
          setAuthError(
            `เชื่อมต่อ Turso ไม่สำเร็จ (${probe?.reason || 'db_error'}) ระบบเปิดโหมดสาธิตให้ใช้งานชั่วคราว`
          );
        }

        await restoreSessionForMode(configured, schemaReady, mode);
      } catch (err) {
        if (!active) return;
        console.error('[useAuth] init error:', err);
        setBackendConfiguredState(false);
        setBackendReady(false);
        setRuntimeModeState('demo');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [restoreSessionForMode]);

  const clearAuthFeedback = useCallback(() => {
    setAuthError('');
    setAuthNotice('');
  }, []);

  const loginWithEmail = useCallback(
    async (emailOrObj, passwordArg) => {
      setAuthError('');
      setAuthNotice('');
      const email =
        typeof emailOrObj === 'object' ? emailOrObj?.email : emailOrObj;
      const password =
        typeof emailOrObj === 'object' ? emailOrObj?.password : passwordArg;
      const emailLower = String(email || '').trim().toLowerCase();

      if (!isLiveBackend) {
        const found = getDemoUsersList().find(
          (u) => String(u.email || '').trim().toLowerCase() === emailLower && u.is_active !== false
        );
        if (!found) {
          const msg = 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบสาธิต (กรุณากดเข้าสู่ระบบด่วนตามบทบาท หรือใช้อีเมลครูตัวอย่าง)';
          setAuthError(msg);
          return { user: null, error: msg };
        }
        try {
          localStorage.setItem(DEMO_SESSION_KEY, found.id);
        } catch {
          // ignore
        }
        setUser(found);
        return { user: found, error: null };
      }

      try {
        const data = await authApiCall({ action: 'login', email: emailLower, password });
        setUser(data.user);
        return { user: data.user, error: null };
      } catch (err) {
        setAuthError(err.message);
        return { user: null, error: err.message };
      }
    },
    [isLiveBackend]
  );

  const activateAccount = useCallback(
    async (emailOrObj, passwordArg, fullNameArg = '') => {
      setAuthError('');
      setAuthNotice('');
      const email =
        typeof emailOrObj === 'object' ? emailOrObj?.email : emailOrObj;
      const password =
        typeof emailOrObj === 'object' ? emailOrObj?.password : passwordArg;
      const fullName =
        typeof emailOrObj === 'object' ? emailOrObj?.fullName || '' : fullNameArg;

      if (!isLiveBackend) {
        const msg = 'การเปิดใช้งานบัญชีจริงรองรับเฉพาะเมื่อเชื่อมต่อฐานข้อมูล Turso SQL Live แล้ว';
        setAuthError(msg);
        return { user: null, error: msg };
      }
      try {
        const data = await authApiCall({
          action: 'activate',
          email: String(email || '').trim().toLowerCase(),
          password,
          fullName,
        });
        setUser(data.user);
        setAuthNotice('เปิดใช้งานบัญชีและเข้าสู่ระบบเรียบร้อยแล้ว');
        return { user: data.user, error: null };
      } catch (err) {
        setAuthError(err.message);
        return { user: null, error: err.message };
      }
    },
    [isLiveBackend]
  );

  const setupFirstAdmin = useCallback(
    async (emailOrObj, passwordArg, fullNameArg = '') => {
      setAuthError('');
      setAuthNotice('');
      const email =
        typeof emailOrObj === 'object' ? emailOrObj?.email : emailOrObj;
      const password =
        typeof emailOrObj === 'object' ? emailOrObj?.password : passwordArg;
      const fullName =
        typeof emailOrObj === 'object' ? emailOrObj?.fullName || '' : fullNameArg;

      if (!isLiveBackend) {
        const msg = 'สร้างบัญชี Admin คนแรกได้เฉพาะเมื่อเชื่อมต่อฐานข้อมูล Turso SQL Live แล้ว';
        setAuthError(msg);
        return { user: null, error: msg };
      }
      try {
        const data = await authApiCall({
          action: 'setup_first_admin',
          email: String(email || '').trim().toLowerCase(),
          password,
          fullName,
        });
        setUser(data.user);
        setUserCount((prev) => Math.max(prev, 1));
        setAuthNotice('สร้างบัญชีผู้ดูแลระบบคนแรกเรียบร้อย สามารถเข้าหน้า Admin เพื่อติดตั้งข้อมูลตั้งต้นได้ทันที');
        return { user: data.user, error: null };
      } catch (err) {
        setAuthError(err.message);
        return { user: null, error: err.message };
      }
    },
    [isLiveBackend]
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      setAuthError('');
      setAuthNotice('');
      if (!isLiveBackend) {
        const msg = 'เปลี่ยนรหัสผ่านได้เฉพาะในโหมด Turso SQL Live';
        setAuthError(msg);
        throw new Error(msg);
      }
      try {
        await authApiCall({ action: 'change_password', currentPassword, newPassword });
        setAuthNotice('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
        return { ok: true };
      } catch (err) {
        setAuthError(err.message);
        throw err;
      }
    },
    [isLiveBackend]
  );

  const resetPassword = useCallback(async () => {
    setAuthError('');
    setAuthNotice(
      'หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อกำหนดรหัสผ่านใหม่ในเมนู จัดการระบบ (/admin)'
    );
  }, []);

  const loginDemoRole = useCallback(async (roleOrUser) => {
    setAuthError('');
    setAuthNotice('');
    const users = getDemoUsersList();
    const targetId = typeof roleOrUser === 'object' ? roleOrUser?.id : null;
    const targetRole = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;
    const found = users.find(
      (u) => ((targetId && u.id === targetId) || (targetRole && u.role === targetRole)) && u.is_active !== false
    );
    if (!found) {
      throw new Error('ไม่พบบัญชีตัวอย่างสำหรับบทบาทที่เลือก');
    }
    try {
      localStorage.setItem(DEMO_SESSION_KEY, found.id);
    } catch {
      // ignore
    }
    setUser(found);
    return found;
  }, []);

  const logout = useCallback(async () => {
    setAuthError('');
    setAuthNotice('');
    try {
      localStorage.removeItem(DEMO_SESSION_KEY);
    } catch {
      // ignore
    }
    if (isLiveBackend) {
      try {
        await authApiCall({ action: 'logout' });
      } catch (err) {
        console.warn('[useAuth] logout warning:', err);
      }
    }
    setUser(null);
  }, [isLiveBackend]);

  const switchRuntimeMode = useCallback(
    async (nextMode) => {
      setAuthError('');
      setAuthNotice('');
      const normalized = nextMode === 'live' && backendReady ? 'live' : 'demo';
      setStoredRuntimeMode(normalized);
      setRuntimeModeState(normalized);
      try {
        localStorage.removeItem(DEMO_SESSION_KEY);
      } catch {
        // ignore
      }
      await restoreSessionForMode(backendConfigured, backendReady, normalized);
    },
    [backendConfigured, backendReady, restoreSessionForMode]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        authNotice,
        isLiveBackend,
        isBackendConfigured: backendConfigured,
        backendReady,
        userCount,
        runtimeMode,
        loginWithEmail,
        activateAccount,
        signUpWithEmail: activateAccount,
        setupFirstAdmin,
        changePassword,
        resetPassword,
        loginDemoRole,
        logout,
        switchRuntimeMode,
        clearAuthFeedback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
