import { Attachment } from '../types';
import { supabase } from './supabase';

const BUCKET_NAME = 'attachments';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_TTL = 300;

const ALLOWED_MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
};

function isSafeStoragePath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') || trimmed.includes('..') || trimmed.includes('\\')) {
    return false;
  }
  return true;
}

export const fileService = {
  isSafeHttpUrl: (rawUrl: string): boolean => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'https:') return true;
      if (
        parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  uploadFiles: async (files: File[]): Promise<Attachment[]> => {
    const uploadPromises = files.map(async (file) => {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo "${file.name}" excede o limite de 5MB ou está vazio.`);
      }

      const allowedExts = ALLOWED_MIME_EXTENSIONS[file.type];
      if (!allowedExts) {
        throw new Error(`Tipo de arquivo não permitido para "${file.name}". Use JPG, PNG ou PDF.`);
      }

      const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExts.includes(rawExt)) {
        throw new Error(`Extensão ".${rawExt}" incompatível com o tipo ${file.type}.`);
      }

      const filePath = `${crypto.randomUUID()}.${rawExt}`;
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        throw new Error(`Erro ao enviar "${file.name}": ${error.message}`);
      }

      return {
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
      };
    });

    return Promise.all(uploadPromises);
  },

  getSignedUrl: async (path: string): Promise<string> => {
    if (!isSafeStoragePath(path)) {
      throw new Error('Caminho de anexo inválido.');
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (error || !data?.signedUrl) {
      throw new Error('Não foi possível gerar link temporário para o anexo.');
    }

    if (!fileService.isSafeHttpUrl(data.signedUrl)) {
      throw new Error('URL do anexo bloqueada por política de segurança.');
    }

    return data.signedUrl;
  },

  deleteFile: async (path: string): Promise<void> => {
    if (!isSafeStoragePath(path)) {
      throw new Error('Caminho de anexo inválido.');
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) {
      throw new Error(`Erro ao remover anexo: ${error.message}`);
    }
  },

  deleteFiles: async (paths: string[]): Promise<void> => {
    if (paths.length === 0) return;
    if (paths.some((p) => !isSafeStoragePath(p))) {
      throw new Error('Lista de anexos contém caminho inválido.');
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths);
    if (error) {
      throw new Error(`Erro ao remover anexos: ${error.message}`);
    }
  },
};
