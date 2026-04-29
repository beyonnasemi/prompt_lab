'use server';

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// Supabase admin client (server-side, bypasses RLS when service-role key is set)
// =============================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function client() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }
  return createClient(supabaseUrl, supabaseKey);
}

const SALT_ROUNDS = 10;
const isHashed = (str) => typeof str === 'string' && /^\$2[aby]\$/.test(str);

// =============================================================================
// LOGIN — admin
// =============================================================================
/**
 * Verify admin login.
 * Auto-migrates legacy plain-text passwords on first successful login.
 */
export async function adminLoginAction({ username, password }) {
  if (!username || !password) {
    return { success: false, error: '아이디와 비밀번호를 입력해주세요.' };
  }
  try {
    const supabase = client();
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, username, password, role, display_name')
      .eq('username', username)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) throw error;
    if (!account) {
      return { success: false, error: '관리자 정보가 일치하지 않습니다.' };
    }

    const ok = await verifyAndMigrate(supabase, account, password);
    if (!ok) {
      return { success: false, error: '관리자 정보가 일치하지 않습니다.' };
    }

    return {
      success: true,
      session: {
        id: account.id,
        username: account.username,
        role: account.role,
        display_name: account.display_name,
      },
    };
  } catch (err) {
    console.error('adminLoginAction error:', err);
    return { success: false, error: err.message || '로그인 중 오류가 발생했습니다.' };
  }
}

// =============================================================================
// LOGIN — student / group
// =============================================================================
export async function studentLoginAction({ username, password }) {
  if (!username || !password) {
    return { success: false, error: '비밀번호를 입력해주세요.' };
  }
  try {
    const supabase = client();
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, username, password, role, display_name')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;
    if (!account) {
      return { success: false, error: '비밀번호가 올바르지 않습니다.' };
    }

    const ok = await verifyAndMigrate(supabase, account, password);
    if (!ok) {
      return { success: false, error: '비밀번호가 올바르지 않습니다.' };
    }

    return {
      success: true,
      session: {
        id: account.id,
        username: account.username,
        role: account.role,
        displayName: account.display_name,
      },
    };
  } catch (err) {
    console.error('studentLoginAction error:', err);
    return { success: false, error: err.message || '로그인 중 오류가 발생했습니다.' };
  }
}

// =============================================================================
// CREATE ACCOUNT
// =============================================================================
export async function createAccountAction({ username, password, display_name, role = 'student' }) {
  if (!username || !password) {
    return { success: false, error: '아이디와 비밀번호는 필수입니다.' };
  }
  if (password.length < 4) {
    return { success: false, error: '비밀번호는 4자리 이상이어야 합니다.' };
  }

  try {
    const supabase = client();
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const { error } = await supabase.from('accounts').insert([
      {
        username,
        password: hashed,
        display_name: display_name || username,
        role,
      },
    ]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('createAccountAction error:', err);
    return { success: false, error: err.message || '계정 생성 실패' };
  }
}

// =============================================================================
// CHANGE PASSWORD
// =============================================================================
export async function changePasswordAction({ userId, newPassword }) {
  if (!userId) return { success: false, error: '사용자 ID 누락' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '비밀번호는 4자리 이상이어야 합니다.' };
  }

  try {
    const supabase = client();
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { error } = await supabase
      .from('accounts')
      .update({ password: hashed })
      .eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('changePasswordAction error:', err);
    return { success: false, error: err.message || '비밀번호 변경 실패' };
  }
}

// =============================================================================
// (Optional) Bulk migrate any remaining plain-text passwords.
// Safe to call repeatedly; only hashes those that aren't yet hashed.
// =============================================================================
export async function migratePlainPasswordsAction() {
  try {
    const supabase = client();
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, password');
    if (error) throw error;

    let migrated = 0;
    for (const acc of accounts || []) {
      if (acc.password && !isHashed(acc.password)) {
        const hashed = await bcrypt.hash(acc.password, SALT_ROUNDS);
        await supabase.from('accounts').update({ password: hashed }).eq('id', acc.id);
        migrated += 1;
      }
    }
    return { success: true, migrated, total: accounts?.length || 0 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// =============================================================================
// Helpers
// =============================================================================
async function verifyAndMigrate(supabase, account, plainPassword) {
  const stored = account.password;
  if (!stored) return false;

  if (isHashed(stored)) {
    // Already bcrypt — compare
    return bcrypt.compare(plainPassword, stored);
  }

  // Legacy plain-text — match, then auto-upgrade to hashed
  if (stored !== plainPassword) return false;
  try {
    const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    await supabase.from('accounts').update({ password: hashed }).eq('id', account.id);
  } catch (e) {
    console.warn('Auto-migrate hash failed (login still allowed):', e);
  }
  return true;
}
