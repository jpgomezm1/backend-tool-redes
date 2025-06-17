// src/controllers/publicationsController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../services/database';
import { CreatePublicationRequest } from '../types';
import { uploadFile, deleteFile, uploadVideo } from '../services/storage';
import { analyzeVideoWithGemini } from '../services/videoAnalysis';

// Configurar multer para manejar archivos
const upload = multer({
 storage: multer.memoryStorage(),
 limits: {
   fileSize: 100 * 1024 * 1024, // 100MB para videos
 },
 fileFilter: (req, file, cb) => {
   const allowedTypes = [
     // Documentos existentes
     'application/pdf',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'text/plain',
     // Videos
     'video/mp4',
     'video/x-msvideo',
     'video/quicktime',
     'video/x-ms-wmv',
     'video/x-flv',
     'video/webm',
     'video/x-matroska',
     'video/3gpp'
   ];
   
   if (allowedTypes.includes(file.mimetype)) {
     cb(null, true);
   } else {
     cb(null, false);
   }
 }
});

export const uploadMiddleware = upload.fields([
 { name: 'scriptFile', maxCount: 1 },
 { name: 'videoFile', maxCount: 1 }
]);

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
   
   // Si hay archivos, los datos vienen en req.body.data como string
   if (req.files) {
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
   
   const files = req.files as { [fieldname: string]: Express.Multer.File[] };
   const scriptFile = files?.scriptFile?.[0];
   const videoFile = files?.videoFile?.[0];
   
   console.log('Datos recibidos en createPublication:', data);
   console.log('Archivos recibidos:', {
     script: scriptFile?.originalname,
     video: videoFile?.originalname
   });

   let title = data.title;
   let description = data.description;
   let scriptContent = '';
   
   // Si hay video y se solicita análisis automático
   if (videoFile && data.autoGenerateContent) {
     console.log('🎬 Iniciando análisis automático del video...');
     
     const geminiApiKey = process.env.GEMINI_API_KEY;
     if (!geminiApiKey) {
       return res.status(500).json({ 
         error: 'API Key de Gemini no configurada' 
       });
     }

     try {
       const analysisResult = await analyzeVideoWithGemini(
         videoFile.buffer,
         videoFile.originalname,
         geminiApiKey
       );

       if (analysisResult.success) {
         // Usar datos del análisis si no se proporcionaron
         title = title || analysisResult.titulo;
         description = description || analysisResult.descripcion_corta;
         scriptContent = analysisResult.guion || '';
         
         console.log('✅ Análisis completado:', {
           titulo: title,
           descripcion: description
         });
       } else {
         console.warn('⚠️ Error en análisis:', analysisResult.error);
       }
     } catch (analysisError) {
       console.error('❌ Error en análisis automático:', analysisError);
       // Continuar sin análisis automático
     }
   }

   // Validar datos mínimos requeridos
   if (!title || !data.type) {
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
   let videoFileUrl: string | undefined;

   // Si hay un archivo de guión, subirlo a GCS
   if (scriptFile) {
     // Verificar si el archivo fue rechazado por el filtro
     if (!scriptFile.mimetype.includes('pdf') && 
         !scriptFile.mimetype.includes('msword') && 
         !scriptFile.mimetype.includes('wordprocessingml') && 
         !scriptFile.mimetype.includes('text/plain')) {
       return res.status(400).json({ 
         error: 'Tipo de archivo de guión no permitido. Solo se aceptan PDF, Word y texto plano.' 
       });
     }
     
     try {
       scriptUrl = await uploadFile(scriptFile);
       console.log('📄 Guión subido exitosamente:', scriptUrl);
     } catch (uploadError) {
       console.error('❌ Error subiendo guión:', uploadError);
       // No fallar la creación por esto, pero log el error
     }
   } else if (scriptContent) {
     // Crear archivo de guión desde el análisis
     try {
       const scriptBuffer = Buffer.from(scriptContent, 'utf8');
       const scriptFileObject = {
         buffer: scriptBuffer,
         originalname: `guion-${Date.now()}.txt`,
         mimetype: 'text/plain'
       } as Express.Multer.File;
       
       scriptUrl = await uploadFile(scriptFileObject);
       console.log('📄 Guión auto-generado subido:', scriptUrl);
     } catch (uploadError) {
       console.error('❌ Error subiendo guión auto-generado:', uploadError);
     }
   }

   // Si hay un archivo de video, subirlo a GCS
   if (videoFile) {
     // Verificar si el archivo fue rechazado por el filtro
     const videoTypes = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska', 'video/3gpp'];
     if (!videoTypes.includes(videoFile.mimetype)) {
       return res.status(400).json({ 
         error: 'Tipo de archivo de video no permitido. Formatos aceptados: MP4, AVI, MOV, WMV, FLV, WebM, MKV, 3GP.' 
       });
     }
     
     try {
       videoFileUrl = await uploadVideo(videoFile);
       console.log('🎬 Video subido exitosamente:', videoFileUrl);
     } catch (uploadError) {
       console.error('❌ Error subiendo video:', uploadError);
       // No fallar la creación por esto, pero log el error
     }
   }

   const publication = await prisma.tikTokPublication.create({
     data: {
       title,
       description: description || '',
       type: data.type,
       duration: data.duration || 0,
       hashtags: data.hashtags || [],
       soundName: data.soundName || '',
       soundTrending: data.soundTrending || false,
       publishedAt: publishedDate,
       videoUrl: data.videoUrl || '',
       videoFile: videoFileUrl,
       thumbnailUrl: data.thumbnailUrl || '',
       scriptUrl: scriptUrl
     }
   });

   console.log('✅ Publicación creada exitosamente:', publication.id);

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
       console.log('✅ Métricas iniciales creadas');
     } catch (metricsError) {
       console.error('❌ Error creando métricas iniciales:', metricsError);
     }
   }

   res.status(201).json(publication);
 } catch (error) {
   console.error('❌ Error creating publication:', error);
   res.status(500).json({ error: 'Error creating publication' });
 }
};

export const updatePublication = async (req: Request, res: Response) => {
 try {
   const { id } = req.params;
   let data: Partial<CreatePublicationRequest>;
   
   // Si hay archivos, los datos vienen en req.body.data como string
   if (req.files) {
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
   
   const files = req.files as { [fieldname: string]: Express.Multer.File[] };
   const scriptFile = files?.scriptFile?.[0];
   const videoFile = files?.videoFile?.[0];

   console.log('Actualizando publicación:', id, data);
   console.log('Archivos recibidos:', {
     script: scriptFile?.originalname,
     video: videoFile?.originalname
   });

   // Validar que la publicación existe
   const existingPublication = await prisma.tikTokPublication.findUnique({
     where: { id }
   });

   if (!existingPublication) {
     return res.status(404).json({ error: 'Publication not found' });
   }

   let title = data.title;
   let description = data.description;
   let scriptContent = '';
   
   // Si hay video y se solicita análisis automático
   if (videoFile && data.autoGenerateContent) {
     console.log('🎬 Iniciando análisis automático del video en actualización...');
     
     const geminiApiKey = process.env.GEMINI_API_KEY;
     if (!geminiApiKey) {
       return res.status(500).json({ 
         error: 'API Key de Gemini no configurada' 
       });
     }

     try {
       const analysisResult = await analyzeVideoWithGemini(
         videoFile.buffer,
         videoFile.originalname,
         geminiApiKey
       );

       if (analysisResult.success) {
         // Usar datos del análisis si no se proporcionaron
         title = title || analysisResult.titulo;
         description = description || analysisResult.descripcion_corta;
         scriptContent = analysisResult.guion || '';
         
         console.log('✅ Análisis completado en actualización:', {
           titulo: title,
           descripcion: description
         });
       } else {
         console.warn('⚠️ Error en análisis durante actualización:', analysisResult.error);
       }
     } catch (analysisError) {
       console.error('❌ Error en análisis automático durante actualización:', analysisError);
       // Continuar sin análisis automático
     }
   }

   // Preparar datos para actualizar
   const updateData: any = {};

   if (title !== undefined) updateData.title = title;
   if (description !== undefined) updateData.description = description;
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
     // Verificar si el archivo fue rechazado por el filtro
     if (!scriptFile.mimetype.includes('pdf') && 
         !scriptFile.mimetype.includes('msword') && 
         !scriptFile.mimetype.includes('wordprocessingml') && 
         !scriptFile.mimetype.includes('text/plain')) {
       return res.status(400).json({ 
         error: 'Tipo de archivo de guión no permitido. Solo se aceptan PDF, Word y texto plano.' 
       });
     }
     
     try {
       // Si ya existía un guión, eliminarlo
       if (existingPublication.scriptUrl) {
         await deleteFile(existingPublication.scriptUrl);
       }
       
       // Subir el nuevo guión
       const scriptUrl = await uploadFile(scriptFile);
       updateData.scriptUrl = scriptUrl;
       console.log('📄 Nuevo guión subido:', scriptUrl);
     } catch (uploadError) {
       console.error('❌ Error subiendo nuevo guión:', uploadError);
     }
   } else if (scriptContent) {
     // Crear archivo de guión desde el análisis
     try {
       // Si ya existía un guión, eliminarlo
       if (existingPublication.scriptUrl) {
         await deleteFile(existingPublication.scriptUrl);
       }
       
       const scriptBuffer = Buffer.from(scriptContent, 'utf8');
       const scriptFileObject = {
         buffer: scriptBuffer,
         originalname: `guion-actualizado-${Date.now()}.txt`,
         mimetype: 'text/plain'
       } as Express.Multer.File;
       
       const scriptUrl = await uploadFile(scriptFileObject);
       updateData.scriptUrl = scriptUrl;
       console.log('📄 Guión auto-generado actualizado y subido:', scriptUrl);
     } catch (uploadError) {
       console.error('❌ Error subiendo guión auto-generado actualizado:', uploadError);
     }
   }

   // Manejar archivo de video
   if (videoFile) {
     // Verificar si el archivo fue rechazado por el filtro
     const videoTypes = ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska', 'video/3gpp'];
     if (!videoTypes.includes(videoFile.mimetype)) {
       return res.status(400).json({ 
         error: 'Tipo de archivo de video no permitido. Formatos aceptados: MP4, AVI, MOV, WMV, FLV, WebM, MKV, 3GP.' 
       });
     }
     
     try {
       // Si ya existía un video, eliminarlo
       if (existingPublication.videoFile) {
         await deleteFile(existingPublication.videoFile);
       }
       
       // Subir el nuevo video
       const videoFileUrl = await uploadVideo(videoFile);
       updateData.videoFile = videoFileUrl;
       console.log('🎬 Nuevo video subido:', videoFileUrl);
     } catch (uploadError) {
       console.error('❌ Error subiendo nuevo video:', uploadError);
     }
   }

   const publication = await prisma.tikTokPublication.update({
     where: { id },
     data: updateData
   });

   console.log('✅ Publicación actualizada exitosamente');
   res.json(publication);
 } catch (error) {
   console.error('❌ Error updating publication:', error);
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
       console.log('📄 Guión eliminado de GCS');
     } catch (deleteError) {
       console.error('❌ Error eliminando guión:', deleteError);
     }
   }

   // Eliminar archivo de video si existe
   if (existingPublication.videoFile) {
     try {
       await deleteFile(existingPublication.videoFile);
       console.log('🎬 Video eliminado de GCS');
     } catch (deleteError) {
       console.error('❌ Error eliminando video:', deleteError);
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

   console.log('✅ Publicación eliminada exitosamente');
   res.status(204).send();
 } catch (error) {
   console.error('❌ Error deleting publication:', error);
   res.status(500).json({ error: 'Error deleting publication' });
 }
};

// Agregar esta función al archivo existente

export const analyzeVideoOnly = async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files?.videoFile?.[0];
    
    if (!videoFile) {
      return res.status(400).json({ 
        error: 'No se proporcionó archivo de video' 
      });
    }

    console.log('🎬 Analizando video:', videoFile.originalname);
    
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ 
        error: 'API Key de Gemini no configurada' 
      });
    }

    // Realizar análisis con Gemini
    const analysisResult = await analyzeVideoWithGemini(
      videoFile.buffer,
      videoFile.originalname,
      geminiApiKey
    );

    console.log('✅ Análisis completado:', analysisResult);
    
    res.json(analysisResult);
  } catch (error) {
    console.error('❌ Error en análisis de video:', error);
    res.status(500).json({ 
      error: 'Error analizando video',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};