// src/services/storage.ts
import { Storage } from '@google-cloud/storage';
import path from 'path';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET!);

export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = process.env.GOOGLE_CLOUD_STORAGE_FOLDER || 'Docs-Redes'
): Promise<string> => {
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
  const fileUpload = bucket.file(fileName);

  const stream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      resolve(publicUrl);
    });

    stream.end(file.buffer);
  });
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    const fileName = fileUrl.split(`${bucket.name}/`)[1];
    if (fileName) {
      await bucket.file(fileName).delete();
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Agregar esta función al archivo existente
export const uploadVideo = async (
  file: Express.Multer.File,
  folder: string = process.env.GOOGLE_CLOUD_STORAGE_FOLDER || 'Videos-TikTok'
): Promise<string> => {
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
  const fileUpload = bucket.file(fileName);

  const stream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      reject(error);
    });

    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      resolve(publicUrl);
    });

    stream.end(file.buffer);
  });
};