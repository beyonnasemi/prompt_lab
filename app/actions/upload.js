'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET = 'prompt-files';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadInlineImageAction(formData) {
  try {
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      throw new Error('No file provided');
    }
    if (file.size > MAX_SIZE) {
      throw new Error('이미지 용량이 너무 큽니다 (5MB 제한).');
    }
    if (!file.type || !file.type.startsWith('image/')) {
      throw new Error('이미지 파일만 업로드 가능합니다.');
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 설정이 누락되었습니다.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const fileName = `inline/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error('Inline image upload error:', err);
    return { success: false, error: err.message || '업로드 실패' };
  }
}
