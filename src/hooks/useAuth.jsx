import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  getStoredRuntimeMode,
  setStoredRuntimeMode,
} from '../lib/supabaseClient';
import { dataService } from '../services/dataService';
import { DEMO_USERS } from '../data/demoSeedData';

const AuthContext = createContext(null);
const DEMO_AUTH_KEY = 'banhatkhet_demo_user_id';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [runtimeMode, setRuntimeModeState] = useState(getStoredRuntimeMode);
  const [schemaReady, setSchemaReady] = useState(false);

  const loadSupabaseProfile = useCallback(async (authUser) => {
    if (!authUser || !supabase) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile:', error);
      return null;
    }
    return data;
  }, []);

  const isLiveSupabase = isSupabaseConfigured && schemaReady && runtimeMode === 'live';

  useEffect(() => {
    let active = true;
    let subscription = null;

    async function init() {
      const probe = await dataService.probeSupabaseSchema();
      if (!active) return;
      setSchemaReady(probe.schemaReady);

      const useLive = probe.schemaReady && getStoredRuntimeMode() === 'live';

      if (!useLive || !supabase) {
        const savedId = localStorage.getItem(DEMO_AUTH_KEY);
        if (savedId) {
          const found = DEMO_USERS.find((u) => u.id === savedId) || null;
          if (active) setUser(found);
        }
        if (active) setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && active) {
        const profile = await loadSupabaseProfile(session.user);
        setUser(profile);
      }
      if (active) setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!active) return;
        if (nextSession?.user) {
          const profile = await loadSupabaseProfile(nextSession.user);
          setUser(profile);
        } else {
          setUser(null);
        }
      });
      subscription = listener?.subscription;
    }

    init();
    return () => {
      active = false;
      subscription?.unsubscribe?.();
    };
  }, [loadSupabaseProfile, runtimeMode]);

  const switchRuntimeMode = (mode) => {
    setAuthError('');
    setAuthNotice('');
    setStoredRuntimeMode(mode);
    setRuntimeModeState(mode);
    setUser(null);
  };

  const loginWithEmail = async (email, password) => {
    setAuthError('');
    setAuthNotice('');
    if (!isLiveSupabase || !supabase) {
      const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found) {
        const msg = 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ Demo (กรุณาเลือกปุ่มเข้าสู่ระบบด่วนด้านล่าง)';
        setAuthError(msg);
        return { error: msg };
      }
      localStorage.setItem(DEMO_AUTH_KEY, found.id);
      setUser(found);
      return { user: found, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    const profile = await loadSupabaseProfile(data.user);
    if (!profile) {
      const msg = 'ไม่พบข้อมูลบทบาทผู้ใช้งานในตาราง users กรุณาติดต่อผู้ดูแลระบบ';
      setAuthError(msg);
      return { error: msg };
    }
    setUser(profile);
    return { user: profile, error: null };
  };

  const signUpWithEmail = async ({ email, password, fullName }) => {
    setAuthError('');
    setAuthNotice('');
    if (!isLiveSupabase || !supabase) {
      const msg = 'การสมัครเปิดบัญชีจริงต้องเชื่อมต่อฐานข้อมูล Supabase (ที่รัน SUPABASE_SETUP.sql แล้ว)';
      setAuthError(msg);
      return { error: msg };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName?.trim() || '' },
      },
    });
    if (error) {
      setAuthError(error.message);
      return { error: error.message };
    }
    if (data.session) {
      const profile = await loadSupabaseProfile(data.user);
      setUser(profile);
      return { user: profile, error: null };
    }
    const notice = 'ส่งคำขอยืนยันอีเมลเรียบร้อยแล้ว กรุณายืนยันอีเมลแล้วเข้าสู่ระบบ';
    setAuthNotice(notice);
    return { notice, error: null };
  };

  const loginDemoRole = (demoUser) => {
    setAuthError('');
    setAuthNotice('');
    setStoredRuntimeMode('demo');
    setRuntimeModeState('demo');
    localStorage.setItem(DEMO_AUTH_KEY, demoUser.id);
    setUser(demoUser);
  };

  const logout = async () => {
    setAuthError('');
    setAuthNotice('');
    localStorage.removeItem(DEMO_AUTH_KEY);
    if (isLiveSupabase && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        authNotice,
        isLiveSupabase,
        isSupabaseConfigured,
        schemaReady,
        runtimeMode,
        switchRuntimeMode,
        loginWithEmail,
        signUpWithEmail,
        loginDemoRole,
        logout,
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
