import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'logo_empresa';

export function isStorageLogoUrl(url: string): boolean {
  return url.startsWith('https://') && url.includes(`/${BUCKET}/`);
}

export async function uploadLogo(
  blob: Blob,
  oldLogoUrl?: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  if (oldLogoUrl && isStorageLogoUrl(oldLogoUrl)) {
    const path = extractStoragePath(oldLogoUrl);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }

  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const filePath = `logo_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, { contentType: blob.type, upsert: true });

  if (uploadError) { console.error('Erro upload logo:', uploadError); return null; }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return urlData?.publicUrl || null;
}

export async function deleteLogo(imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !isStorageLogoUrl(imageUrl)) return false;
  const path = extractStoragePath(imageUrl);
  if (!path) return false;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}

function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    const regex = new RegExp(`/object/public/${BUCKET}/(.+)`);
    const match = u.pathname.match(regex);
    return match ? match[1] : null;
  } catch { return null; }
}
