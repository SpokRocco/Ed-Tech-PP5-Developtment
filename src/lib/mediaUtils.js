const RUNTIME_MODE_KEY = 'banhatkhet_pp5_runtime_mode';

let backendConfigured = false;
let backendReady = false;

export function setBackendStatus({ configured = false, schemaReady = false } = {}) {
  backendConfigured = Boolean(configured);
  backendReady = Boolean(configured && schemaReady);
}

export function isBackendConfigured() {
  return backendConfigured;
}

export function getStoredRuntimeMode() {
  if (!backendReady) return 'demo';
  try {
    const saved = localStorage.getItem(RUNTIME_MODE_KEY);
    if (saved === 'demo' || saved === 'live') return saved;
  } catch {
    // ignore storage restriction
  }
  return 'live';
}

export function setStoredRuntimeMode(mode) {
  try {
    localStorage.setItem(RUNTIME_MODE_KEY, mode);
  } catch {
    // ignore storage restriction
  }
}

export function isBackendReadyForLive() {
  return backendReady && getStoredRuntimeMode() === 'live';
}

/**
 * ย่อและแปลงไฟล์ภาพ (โลโก้โรงเรียน / ตราครุฑ / ลายเซ็น ผอ.) เป็น Data URL ขนาดกะทัดรัด
 * เพื่อเก็บในฐานข้อมูล SQL system_settings บน Turso โดยไม่ต้องใช้ Storage แยก
 */
export async function compressImageToDataUrl(file, folder = 'branding') {
  if (!file) return { url: null, error: 'ไม่พบไฟล์ที่เลือก' };
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP) เท่านั้น' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: 'ขนาดไฟล์ต้นฉบับต้องไม่เกิน 5 MB' };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = folder === 'director_signature_url' ? 380 : 420;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || maxSide) * scale));
        const height = Math.max(1, Math.round((img.height || maxSide) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', 0.85);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/png');
        }
        if (dataUrl.length > 160000) {
          dataUrl = canvas.toDataURL('image/webp', 0.65);
        }
        if (dataUrl.length > 220000) {
          resolve({ url: null, error: 'รูปภาพมีขนาดข้อมูลใหญ่เกินไป กรุณาเลือกภาพที่เล็กลง' });
          return;
        }
        resolve({ url: dataUrl, error: null });
      } catch (err) {
        resolve({ url: null, error: err?.message || 'ไม่สามารถประมวลผลรูปภาพได้' });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ url: null, error: 'ไม่สามารถอ่านไฟล์รูปภาพนี้ได้' });
    };
    img.src = objectUrl;
  });
}
