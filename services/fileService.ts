import { supabase } from './supabase';
import { Attachment } from '../types';

const BUCKET_NAME = 'attachments';

export const fileService = {
    uploadFiles: async (files: File[]): Promise<Attachment[]> => {
        const uploadPromises = files.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file);

            if (error) {
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            return {
                name: file.name,
                url: publicUrl,
                size: file.size,
                type: file.type,
                path: filePath
            } as Attachment;
        });

        return Promise.all(uploadPromises);
    },

    deleteFile: async (path: string): Promise<void> => {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    },

    deleteFiles: async (paths: string[]): Promise<void> => {
        if (paths.length === 0) return;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(paths);

        if (error) {
            console.error('Error deleting files:', error);
            throw error;
        }
    }
};
