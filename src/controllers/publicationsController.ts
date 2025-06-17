import { Request, Response } from 'express';
import prisma from '../services/database';
import { CreatePublicationRequest } from '../types';

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
  
      // Transformar los datos para que el frontend los entienda
      // Transformar los datos para que el frontend los entienda
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
      engagementRate: 0
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
    const data: CreatePublicationRequest = req.body;
    
    console.log('Datos recibidos en createPublication:', data);
    console.log('publishedDate recibido:', data.publishedDate);
    
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
      // Si la fecha es inválida, usar la fecha actual
      if (isNaN(publishedDate.getTime())) {
        console.warn('Fecha inválida recibida, usando fecha actual');
        publishedDate = new Date();
      }
    } else {
      console.warn('No se recibió fecha, usando fecha actual');
      publishedDate = new Date();
    }

    console.log('Fecha final a usar:', publishedDate);

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
        thumbnailUrl: data.thumbnailUrl || ''
      }
    });

    console.log('Publicación creada exitosamente:', publication.id);

    // Si vienen métricas iniciales, crearlas
    if (data.metrics && ((data.metrics.views || 0) + (data.metrics.likes || 0) + (data.metrics.comments || 0) + (data.metrics.shares || 0)) > 0) {
      console.log('Creando métricas iniciales:', data.metrics);
      
      try {
        await prisma.tikTokMetrics.create({
          data: {
            publicationId: publication.id,
            views: data.metrics.views || 0,
            likes: data.metrics.likes || 0,
            comments: data.metrics.comments || 0,
            shares: data.metrics.shares || 0,
            engagementRate: data.metrics.engagementRate || 0,
            viralScore: data.tiktokMetrics?.viralScore || 0,
            averageWatchTime: data.tiktokMetrics?.averageWatchTime || 0,
            recordedAt: publishedDate
          }
        });
        console.log('Métricas iniciales creadas');
      } catch (metricsError) {
        console.error('Error creando métricas iniciales:', metricsError);
        // No fallar la creación de la publicación por esto
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
    const data: Partial<CreatePublicationRequest> = req.body;

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