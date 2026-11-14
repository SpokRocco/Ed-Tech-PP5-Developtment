import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-supabase-anon-key');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

const RUNTIME_MODE_KEY = 'banhatkhet_runtime_mode_v1';

export function getStoredRuntimeMode() {
  if (!isSupabaseConfigured || !supabase) return 'demo';
  try {
    const saved = localStorage.getItem(RUNTIME_MODE_KEY);
    return saved === 'live' || saved === 'demo' ? saved : 'live';
  } catch {
    return 'live';
  }
}

export function setStoredRuntimeMode(mode) {
  try {
    localStorage.setItem(RUNTIME_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

// Runtime flag updated once dataService probes Supabase schema readiness
let schemaReady = false;
export function isSchemaReadyForLive() {
  return isSupabaseConfigured && Boolean(supabase) && schemaReady && getStoredRuntimeMode() === 'live';
}
export function markSchemaReady(val) {
  schemaReady = Boolean(val);
}

export const SCHOOL_IMAGES_BUCKET = 'school-images';

/**
 * อัปโหลดไฟล์รูปภาพไปยัง Supabase Storage Bucket 'school-images'
 * หากอยู่ในโหมด Demo (ยังไม่ตั้งค่า .env) จะแปลงเป็น Data URL ชั่วคราวให้ทดสอบทันที
 */
export async function uploadSchoolImage(file, folder = 'branding') {
  if (!file) return { url: '', error: 'ไม่พบไฟล์รูปภาพ' };

  if (!isSchemaReadyForLive()) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      reader.readAsDataURL(file);
    });
    return { url: dataUrl, isLocalFallback: true, error: null };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SCHOOL_IMAGES_BUCKET)
    .upload(safeName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    return { url: '', error: uploadError.message };
  }

  const { data } = supabase.storage.from(SCHOOL_IMAGES_BUCKET).getPublicUrl(safeName);
  return { url: data?.publicUrl || '', isLocalFallback: false, error: null };
}
