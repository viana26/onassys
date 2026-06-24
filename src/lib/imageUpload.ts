import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'imagem_produto';
const BUCKET_FOLDER = 'produtos';

export function isStorageUrl(url: string): boolean {
  return url.startsWith('https://') && url.includes(`/${BUCKET}/`);
}

export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/');
}

export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteStr = atob(parts[1]);
  const ab = new ArrayBuffer(byteStr.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteStr.length; i++) {
    ia[i] = byteStr.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

export async function uploadProdutoImage(
  blob: Blob,
  produtoId: string,
  oldImageUrl?: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  if (oldImageUrl && isStorageUrl(oldImageUrl)) {
    try { await deleteProdutoImage(oldImageUrl); } catch {}
  }

  const timestamp = Date.now();
  const filePath = `${BUCKET_FOLDER}/${produtoId}/${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('Erro no upload da imagem:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return urlData?.publicUrl || null;
}

export async function deleteProdutoImage(imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !isStorageUrl(imageUrl)) return false;

  const path = extractStoragePath(imageUrl);
  if (!path) return false;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    console.error('Erro ao deletar imagem do Storage:', error);
    return false;
  }
  return true;
}

function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    const regex = new RegExp(`/object/public/${BUCKET}/(.+)`);
    const match = u.pathname.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}


