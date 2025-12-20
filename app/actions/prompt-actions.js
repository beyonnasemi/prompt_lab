'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prioritize Service Role Key for Admin operations. 
// If missing, it will use Anon key which might fail depending on RLS.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function deletePromptAction(promptId, adminId) {
    if (!promptId) throw new Error('No prompt ID provided');
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing on server');

    // Create a new client instance for this request
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 1. Verify Admin Permissions
        // We require a valid adminId (from the user's localStorage, passed via client)
        if (!adminId) {
            throw new Error('권한이 없습니다 (관리자 ID 누락).');
        }

        const { data: user, error: userError } = await supabase
            .from('accounts')
            .select('role')
            .eq('id', adminId)
            .single();

        if (userError || !user) {
            throw new Error('관리자 정보를 찾을 수 없습니다.');
        }

        if (user.role !== 'admin') {
            throw new Error('삭제 권한이 없습니다 (관리자만 가능).');
        }

        // 2. Perform Delete
        const { error } = await supabase
            .from('prompts')
            .delete()
            .eq('id', promptId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Delete Action Error:', error);
        throw new Error(error.message);
    }
}
