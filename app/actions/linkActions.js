'use server';

import { supabase } from '@/lib/supabase';

/**
 * Fetch all useful links ordered by sort_order
 */
export async function getLinksAction() {
    try {
        const { data, error } = await supabase
            .from('useful_links')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.error("Error fetching links:", error);
            // If table doesn't exist yet, return empty array seamlessly
            return [];
        }
        return data || [];
    } catch (e) {
        console.error("Unexpected error fetching links:", e);
        return [];
    }
}

/**
 * Create or Update a link
 */
export async function saveLinkAction(linkData) {
    try {
        const payload = {
            title: linkData.title,
            url: linkData.url,
            icon_key: linkData.icon_key || 'default',
            sort_order: parseInt(linkData.sort_order || 0),
            is_active: true
        };

        if (linkData.id) {
            // Update
            const { error } = await supabase
                .from('useful_links')
                .update(payload)
                .eq('id', linkData.id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase
                .from('useful_links')
                .insert([payload]);
            if (error) throw error;
        }
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Delete a link
 */
export async function deleteLinkAction(id) {
    try {
        const { error } = await supabase
            .from('useful_links')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
}
