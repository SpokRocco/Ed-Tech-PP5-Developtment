import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookMarked } from 'lucide-react';

export function DocumentTypesCatalog({ onCreateSubjectClick }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-300 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-200 pb-3">
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-gold-600" />
          <h3 className="font-bold text-navy-900 text-base">
            📚 เอกสารที่สร้างได้ (ครบเกณฑ์วิชาการ สพป.)
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          รองรับ ปพ.5 ประจำรายวิชา • ปพ.5 รายชั้นเรียน • ปพ.5 ป.1-3 (หลักสูตร 2568) &amp; ปพ.6
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. ปพ.5 ประจำรายวิชา */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-navy-900 text-sm sm:text-base">
                📔 ปพ.5 — แบบบันทึกผลการเรียนประจำรายวิชา
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              รายชื่อ · เวลาเรียน · ตัวชี้วัดพิมพ์ลงเล่มอัตโนมัติ · คะแนนเก็บ/กลางภาค/ปลายภาค · เกรดอัตโนมัติ · คุณลักษณะฯ · อ่านคิดฯ · สรุปสถิติ
            </p>
          </div>
          {onCreateSubjectClick ? (
            <button
              type="button"
              onClick={onCreateSubjectClick}
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold transition-colors"
            >
              <span>สร้าง/จัดการสมุด ปพ.5 รายวิชา</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              to="/teacher"
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-navy-800 hover:bg-navy-900 text-gold-300 text-xs font-semibold transition-colors"
            >
              <span>ดูสมุด ปพ.5 รายวิชา</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* 2. ปพ.5 รายชั้นเรียน */}
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/70 to-white p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <span className="font-bold text-navy-900 text-sm sm:text-base block">
              📘 ปพ.5 รายชั้นเรียน — แบบสรุปผลการเรียนประจำชั้นเรียน
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              รายชื่อห้อง × ทุกรายวิชา · GPA · ลำดับที่ · เวลาเรียน · อ่านคิดฯ · คุณลักษณะฯ · กิจกรรม · ผลการตัดสิน (ระบบเสนอ ครูยืนยัน) · ดึงผลจาก ปพ.5 รายวิชาได้
            </p>
          </div>
          <Link
            to="/classroom"
            className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors"
          >
            <span>เปิด ปพ.5 รายชั้นเรียน (ครูประจำชั้น)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3. ปพ.5 ป.1-3 (2568) */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <span className="font-bold text-navy-900 text-sm sm:text-base block">
              🌱 ปพ.5 ป.1-3 (2568) — แบบบันทึกผลการเรียนตามความสามารถ
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              หลักสูตร ป.1-3 พ.ศ. 2568: 8 ความสามารถ × 4 ระดับตามเกณฑ์สถานศึกษา · คุณลักษณะ 5 ข้อ/กิจกรรม ผ่าน-ไม่ผ่าน · ป.3 เกณฑ์ส่วนกลาง · พิมพ์ ปพ.6 &amp; สรุปชั้น · ไม่มีคะแนน/เกรด
            </p>
          </div>
          <Link
            to="/primary-2568"
            className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
          >
            <span>เปิด ปพ.5 ป.1-3 (2568) &amp; ปพ.6</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
