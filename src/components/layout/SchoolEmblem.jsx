import React, { useState } from 'react';

export function SchoolLogo({ logoUrl, alt = 'โรงเรียนบ้านหาดเค็ด', className = 'w-14 h-14' }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) {
    return <SchoolEmblem className={className} />;
  }
  return (
    <img
      src={logoUrl}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${className} rounded-full object-cover bg-white`}
    />
  );
}

export function SchoolEmblem({ className = 'w-12 h-12' }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ตราสัญลักษณ์โรงเรียนบ้านหาดเค็ด"
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F2557" />
          <stop offset="60%" stopColor="#3B1D7A" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient id="goldRing" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#shieldGrad)" stroke="url(#goldRing)" strokeWidth="4.5" />
      <circle cx="60" cy="60" r="47" stroke="#FDE68A" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      {/* Open Book */}
      <path
        d="M32 68C32 63 39 60 60 64C81 60 88 63 88 68V85C88 81 80 78 60 82C40 78 32 81 32 85V68Z"
        fill="#FFFDF9"
        stroke="#FBBF24"
        strokeWidth="2"
      />
      <line x1="60" y1="64" x2="60" y2="82" stroke="#D97706" strokeWidth="2" />
      {/* Torch / Flame of Knowledge */}
      <path
        d="M60 22C65 29 70 35 67 43C65 48 62 50 60 53C58 50 55 48 53 43C50 35 55 29 60 22Z"
        fill="#FBBF24"
      />
      <path
        d="M60 30C63 34 65 38 63 42C62 45 60 47 60 47C60 47 58 45 57 42C55 38 57 34 60 30Z"
        fill="#FEF3C7"
      />
      <rect x="57" y="52" width="6" height="9" rx="2" fill="#F59E0B" />
      {/* Subtle Laurel Arcs */}
      <path d="M24 54C24 72 34 89 52 94" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <path d="M96 54C96 72 86 89 68 94" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}
