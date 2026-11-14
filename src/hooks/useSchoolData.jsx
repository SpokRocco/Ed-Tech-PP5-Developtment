import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dataService, resetDemoDatabase } from '../services/dataService';
import { DEMO_SYSTEM_SETTINGS } from '../data/demoSeedData';

const SchoolDataContext = createContext(null);

export function SchoolDataProvider({ children }) {
  const [settings, setSettings] = useState(DEMO_SYSTEM_SETTINGS);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classroomSummaries, setClassroomSummaries] = useState([]);
  const [schemaMeta, setSchemaMeta] = useState({ configured: false, schemaReady: false, reason: '' });
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataService.fetchBootstrapData();
      setSettings(data.settings || DEMO_SYSTEM_SETTINGS);
      setUsers(data.users || []);
      setStudents(data.students || []);
      setSubjects(data.subjects || []);
      setIndicators(data.indicators || []);
      setCourses(data.courses || []);
      setClassroomSummaries(data.classroomSummaries || []);
      if (data.__meta) setSchemaMeta(data.__meta);
    } catch (err) {
      console.error('Failed to load school bootstrap data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const updateSettings = async (patch) => {
    const updated = await dataService.updateSystemSettings(patch);
    setSettings(updated);
    return updated;
  };

  const saveUser = async (userObj) => {
    const saved = await dataService.saveUser(userObj);
    await refreshAll();
    return saved;
  };

  const deleteUser = async (userId) => {
    await dataService.deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const upsertStudents = async (list) => {
    const updated = await dataService.upsertStudents(list);
    setStudents(updated);
    return updated;
  };

  const deleteStudent = async (studentId) => {
    await dataService.deleteStudent(studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const upsertSubjects = async (list) => {
    const updated = await dataService.upsertSubjects(list);
    setSubjects(updated);
    return updated;
  };

  const deleteSubject = async (subjectId) => {
    await dataService.deleteSubject(subjectId);
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
  };

  const upsertIndicator = async (indObj) => {
    const updated = await dataService.upsertIndicator(indObj);
    setIndicators(updated);
    return updated;
  };

  const saveCourse = async (courseObj) => {
    const saved = await dataService.saveCourse(courseObj);
    setCourses((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? saved : c));
      return [saved, ...prev];
    });
    return saved;
  };

  const deleteCourse = async (courseId) => {
    await dataService.deleteCourse(courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const saveClassroomSummary = async (summaryObj) => {
    const saved = await dataService.saveClassroomSummary(summaryObj);
    setClassroomSummaries((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? saved : c));
      return [...prev, saved];
    });
    return saved;
  };

  const resetDemo = async () => {
    resetDemoDatabase();
    await refreshAll();
  };

  return (
    <SchoolDataContext.Provider
      value={{
        settings,
        users,
        students,
        subjects,
        indicators,
        courses,
        classroomSummaries,
        schemaMeta,
        loading,
        refreshAll,
        updateSettings,
        saveUser,
        deleteUser,
        upsertStudents,
        deleteStudent,
        upsertSubjects,
        deleteSubject,
        upsertIndicator,
        saveCourse,
        deleteCourse,
        saveClassroomSummary,
        resetDemo,
      }}
    >
      {children}
    </SchoolDataContext.Provider>
  );
}

export function useSchoolData() {
  const ctx = useContext(SchoolDataContext);
  if (!ctx) throw new Error('useSchoolData must be used inside SchoolDataProvider');
  return ctx;
}
