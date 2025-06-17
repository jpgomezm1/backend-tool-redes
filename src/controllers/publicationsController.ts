// src/controllers/publicationsController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../services/database';
import { CreatePublicationRequest } from '../types';
import { uploadFile, deleteFile } from '../services/storage';

// Configurar multer para manejar archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false); // Cambié esto: cb(null, false) en lugar de cb(new Error(...), false)
    }
  }
});

export const uploadMiddleware = upload.single('scriptFile');

export const getPublications = async (req: Request, res: Response) => {
    try {
      const publications = await prisma.tikTokPublication.findMany({
        include: {
          metrics: {
            orderBy: { recordedAt: 'desc' },
            take: 1 // Solo la métrica más reciente
          }
        },
        orderBy: { publishedAt: 'desc' }
      });
  
      const transformedPublications = publications.map(publication => ({
        ...publication,
        // Agregar campos que espera el frontend
        date: publication.publishedAt,
        thumbnail: publication.thumbnailUrl,
        platform: 'tiktok', // valor por defecto
        // Si hay métricas, usar la más reciente; si no, valores por defecto
        metrics: publication.metrics[0] || {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          engagementRate: 0
        },
        tiktokMetrics: {
          averageWatchTime: publication.metrics[0]?.averageWatchTime || 0,
          viralScore: publication.metrics[0]?.viralScore || 0,
          soundInteractions: publication.metrics[0]?.soundInteractions || 0,
          peakViewingHour: 16
        },
        // Mantener el array original para compatibilidad
        metricsHistory: publication.metrics
      }));
  
      res.json(transformedPublications);
    } catch (error) {
      console.error('Error fetching publications:', error);
      res.status(500).json({ error: 'Error fetching publications' });
    }
  };

export const getPublicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const publication = await prisma.tikTokPublication.findUnique({
      where: { id },
      include: {
        metrics: {
          orderBy: { recordedAt: 'desc' }
        }
      }
    });

    if (!publication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    res.json(publication);
  } catch (error) {
    console.error('Error fetching publication:', error);
    res.status(500).json({ error: 'Error fetching publication' });
  }
};

export const createPublication = async (req: Request, res: Response) => {
  try {
    let data: CreatePublicationRequest;
    
    // Si hay archivo, los datos vienen en req.body.data como string
    if (req.file) {
      // Verificar si el archivo fue rechazado por el filtro
      if (!req.file.mimetype.includes('pdf') && 
          !req.file.mimetype.includes('msword') && 
          !req.file.mimetype.includes('wordprocessingml') && 
          !req.file.mimetype.includes('text/plain')) {
        return res.status(400).json({ 
          error: 'Tipo de archivo no permitido. Solo se aceptan PDF, Word y texto plano.' 
        });
      }
      
      try {
        data = JSON.parse(req.body.data);
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Datos inválidos en el formulario' 
        });
      }
    } else {
      data = req.body;
    }
    
    const scriptFile = req.file;
    
    console.log('Datos recibidos en createPublication:', data);
    console.log('Archivo recibido:', scriptFile?.originalname);
    
    // Validar datos requeridos
    if (!data.title || !data.type) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: title y type son obligatorios' 
      });
    }

    // Validar y convertir la fecha
    let publishedDate: Date;
    if (data.publishedDate) {
      publishedDate = new Date(data.publishedDate);
      if (isNaN(publishedDate.getTime())) {
        console.warn('Fecha inválida recibida, usando fecha actual');
        publishedDate = new Date();
      }
    } else {
      console.warn('No se recibió fecha, usando fecha actual');
      publishedDate = new Date();
    }

    let scriptUrl: string | undefined;
    
    // Si hay un archivo de guión, subirlo a GCS
    if (scriptFile) {
      try {
        scriptUrl = await uploadFile(scriptFile);
        console.log('Guión subido exitosamente:', scriptUrl);
      } catch (uploadError) {
        console.error('Error subiendo guión:', uploadError);
        // No fallar la creación por esto, pero log el error
      }
    }

    const publication = await prisma.tikTokPublication.create({
      data: {
        title: data.title,
        description: data.description || '',
        type: data.type,
        duration: data.duration || 0,
        hashtags: data.hashtags || [],
        soundName: data.soundName || '',
        soundTrending: data.soundTrending || false,
        publishedAt: publishedDate,
        videoUrl: data.videoUrl || '',
        thumbnailUrl: data.thumbnailUrl || '',
        scriptUrl: scriptUrl
      }
    });

    console.log('Publicación creada exitosamente:', publication.id);

    // Si vienen métricas iniciales, crearlas
    if (data.metrics && ((data.metrics.views || 0) + (data.metrics.likes || 0) + (data.metrics.comments || 0) + (data.metrics.shares || 0) + (data.metrics.saves || 0)) > 0) {
      console.log('Creando métricas iniciales:', data.metrics);
      
      try {
        const totalEngagements = (data.metrics.likes || 0) + (data.metrics.comments || 0) + (data.metrics.shares || 0) + (data.metrics.saves || 0);
        const engagementRate = (data.metrics.views || 0) > 0 ? (totalEngagements / (data.metrics.views || 1)) * 100 : 0;
        
        await prisma.tikTokMetrics.create({
          data: {
            publicationId: publication.id,
            views: data.metrics.views || 0,
            likes: data.metrics.likes || 0,
            comments: data.metrics.comments || 0,
            shares: data.metrics.shares || 0,
            saves: data.metrics.saves || 0,
            engagementRate: parseFloat(engagementRate.toFixed(2)),
            viralScore: data.tiktokMetrics?.viralScore || 0,
            averageWatchTime: data.tiktokMetrics?.averageWatchTime || 0,
            soundInteractions: data.tiktokMetrics?.soundInteractions || 0,
            recordedAt: publishedDate
          }
        });
        console.log('Métricas iniciales creadas');
      } catch (metricsError) {
        console.error('Error creando métricas iniciales:', metricsError);
      }
    }

    res.status(201).json(publication);
  } catch (error) {
    console.error('Error creating publication:', error);
    res.status(500).json({ error: 'Error creating publication' });
  }
};

export const updatePublication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let data: Partial<CreatePublicationRequest>;
    
    // Si hay archivo, los datos vienen en req.body.data como string
    if (req.file) {
      // Verificar si el archivo fue rechazado por el filtro
      if (!req.file.mimetype.includes('pdf') && 
          !req.file.mimetype.includes('msword') && 
          !req.file.mimetype.includes('wordprocessingml') && 
          !req.file.mimetype.includes('text/plain')) {
        return res.status(400).json({ 
          error: 'Tipo de archivo no permitido. Solo se aceptan PDF, Word y texto plano.' 
        });
      }
      
      try {
        data = JSON.parse(req.body.data);
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Datos inválidos en el formulario' 
        });
      }
    } else {
      data = req.body;
    }
    
    const scriptFile = req.file;

    console.log('Actualizando publicación:', id, data);

    // Validar que la publicación existe
    const existingPublication = await prisma.tikTokPublication.findUnique({
      where: { id }
    });

    if (!existingPublication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.hashtags !== undefined) updateData.hashtags = data.hashtags;
    if (data.soundName !== undefined) updateData.soundName = data.soundName;
    if (data.soundTrending !== undefined) updateData.soundTrending = data.soundTrending;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;

    // Manejar fecha si viene
    if (data.publishedDate) {
      const publishedDate = new Date(data.publishedDate);
      if (!isNaN(publishedDate.getTime())) {
        updateData.publishedAt = publishedDate;
      } else {
        console.warn('Fecha inválida en actualización, ignorando');
      }
    }

    // Manejar archivo de guión
    if (scriptFile) {
      try {
        // Si ya existía un guión, eliminarlo
        if (existingPublication.scriptUrl) {
          await deleteFile(existingPublication.scriptUrl);
        }
        
        // Subir el nuevo guión
        const scriptUrl = await uploadFile(scriptFile);
        updateData.scriptUrl = scriptUrl;
        console.log('Nuevo guión subido:', scriptUrl);
      } catch (uploadError) {
        console.error('Error subiendo nuevo guión:', uploadError);
      }
    }

    const publication = await prisma.tikTokPublication.update({
      where: { id },
      data: updateData
    });

    console.log('Publicación actualizada exitosamente');
    res.json(publication);
  } catch (error) {
    console.error('Error updating publication:', error);
    res.status(500).json({ error: 'Error updating publication' });
  }
};

export const deletePublication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('Eliminando publicación:', id);

    // Verificar que la publicación existe
    const existingPublication = await prisma.tikTokPublication.findUnique({
      where: { id }
    });

    if (!existingPublication) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Eliminar archivo de guión si existe
    if (existingPublication.scriptUrl) {
      try {
        await deleteFile(existingPublication.scriptUrl);
        console.log('Guión eliminado de GCS');
      } catch (deleteError) {
        console.error('Error eliminando guión:', deleteError);
      }
    }

    // Eliminar métricas asociadas primero (si las hay)
    await prisma.tikTokMetrics.deleteMany({
      where: { publicationId: id }
    });

    // Eliminar la publicación
    await prisma.tikTokPublication.delete({
      where: { id }
    });

    console.log('Publicación eliminada exitosamente');
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting publication:', error);
    res.status(500).json({ error: 'Error deleting publication' });
  }
};