import { Request, Response } from 'express';
import multer from 'multer';
import { analyzeTikTokImages } from '../services/tiktokAnalyticsImageAnalysis';
import prisma from '../services/database';

// Configurar multer para imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por imagen
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export const uploadImagesMiddleware = upload.array('images', 10); // Máximo 10 imágenes

// Función para convertir porcentajes a números
function parsePercentage(percentageStr: string | undefined): number | undefined {
  if (!percentageStr) return undefined;
  const match = percentageStr.match(/(-?\d+\.?\d*)%?/);
  return match ? parseFloat(match[1]) : undefined;
}

// Función para extraer números de strings
function parseNumber(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const match = str.toString().match(/(-?\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : undefined;
}

export const analyzeProfileImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    console.log(`📊 Analizando ${files.length} imágenes de perfil...`);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada' });
    }

    // Convertir archivos a buffers
    const imageBuffers = files.map(file => file.buffer);

    // Analizar imágenes
    const analysis = await analyzeTikTokImages(imageBuffers, 'profile', geminiApiKey);

    if (!analysis.combined_result.success) {
      return res.status(400).json({
        error: 'Error en el análisis',
        details: analysis.individual_results
      });
    }

    const result = analysis.combined_result;

    // Guardar en base de datos
    const { periodStart, periodEnd } = req.body;
    
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ 
        error: 'periodStart y periodEnd son requeridos' 
      });
    }

    const accountMetrics = await prisma.tikTokAccountMetrics.create({
      data: {
        // Profile analytics
        profileViews: result.profile_views ? BigInt(result.profile_views) : undefined,
        profileViewsChange: parsePercentage(result.profile_views_change),
        
        // Traffic sources
        forYouTrafficPercent: parsePercentage(result.traffic_source?.for_you),
        personalProfilePercent: parsePercentage(result.traffic_source?.personal_profile),
        searchTrafficPercent: parsePercentage(result.traffic_source?.search),
        followingTrafficPercent: parsePercentage(result.traffic_source?.following),
        soundTrafficPercent: parsePercentage(result.traffic_source?.sound),
        
        // Search queries
        searchQueries: result.search_queries || undefined,
        
        // Período
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      }
    });

    console.log('✅ Análisis de perfil completado y guardado');

    res.json({
      success: true,
      analysis: analysis.combined_result,
      saved_metrics: {
        ...accountMetrics,
        profileViews: accountMetrics.profileViews?.toString()
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis de perfil:', error);
    res.status(500).json({ 
      error: 'Error procesando imágenes de perfil',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const analyzeViewerImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    console.log(`👥 Analizando ${files.length} imágenes de viewers...`);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada' });
    }

    const imageBuffers = files.map(file => file.buffer);
    const analysis = await analyzeTikTokImages(imageBuffers, 'viewer', geminiApiKey);

    if (!analysis.combined_result.success) {
      return res.status(400).json({
        error: 'Error en el análisis',
        details: analysis.individual_results
      });
    }

    const result = analysis.combined_result;
    const { periodStart, periodEnd } = req.body;
    
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ 
        error: 'periodStart y periodEnd son requeridos' 
      });
    }

    const accountMetrics = await prisma.tikTokAccountMetrics.create({
      data: {
        // Viewer stats
        totalViewers: result.total_viewers ? BigInt(result.total_viewers) : undefined,
        totalViewersChange: parsePercentage(result.total_viewers_change),
        newViewers: result.new_viewers ? BigInt(result.new_viewers) : undefined,
        newViewersChange: parsePercentage(result.new_viewers_change),
        
        // Demographics
        maleGenderPercent: parsePercentage(result.gender?.male),
        femaleGenderPercent: parsePercentage(result.gender?.female),
        otherGenderPercent: parsePercentage(result.gender?.other),
        
        // Complex data as JSON
        ageRanges: result.age_ranges || undefined,
        topLocations: result.locations || undefined,
        mostActiveTimesViewers: result.most_active_times ? [result.most_active_times] : undefined,
        creatorsAlsoWatched: result.creators_also_watched || undefined,
        
        // Período
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      }
    });

    console.log('✅ Análisis de viewers completado y guardado');

    res.json({
      success: true,
      analysis: analysis.combined_result,
      saved_metrics: {
        ...accountMetrics,
        totalViewers: accountMetrics.totalViewers?.toString(),
        newViewers: accountMetrics.newViewers?.toString()
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis de viewers:', error);
    res.status(500).json({ 
      error: 'Error procesando imágenes de viewers',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const analyzeFollowerImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    console.log(`👥 Analizando ${files.length} imágenes de followers...`);

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada' });
    }

    const imageBuffers = files.map(file => file.buffer);
    const analysis = await analyzeTikTokImages(imageBuffers, 'follower', geminiApiKey);

    if (!analysis.combined_result.success) {
      return res.status(400).json({
        error: 'Error en el análisis',
        details: analysis.individual_results
      });
    }

    const result = analysis.combined_result;
    const { periodStart, periodEnd } = req.body;
    
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ 
        error: 'periodStart y periodEnd son requeridos' 
      });
    }

    const accountMetrics = await prisma.tikTokAccountMetrics.create({
      data: {
        // Follower stats
        totalFollowers: result.total_followers ? BigInt(result.total_followers) : undefined,
        totalFollowersChange: parsePercentage(result.total_followers_change),
        netFollowers: result.net_followers ? BigInt(result.net_followers) : undefined,
        netFollowersChange: parsePercentage(result.net_followers_change),
        
        // Demographics
        maleGenderPercent: parsePercentage(result.gender?.male),
        femaleGenderPercent: parsePercentage(result.gender?.female),
        otherGenderPercent: parsePercentage(result.gender?.other),
        
        // Complex data as JSON
        ageRanges: result.age_ranges || undefined,
        mostActiveTimesFollowers: result.most_active_times ? [result.most_active_times] : undefined,
        
        // Período
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      }
    });

    console.log('✅ Análisis de followers completado y guardado');

    res.json({
      success: true,
      analysis: analysis.combined_result,
      saved_metrics: {
        ...accountMetrics,
        totalFollowers: accountMetrics.totalFollowers?.toString(),
        netFollowers: accountMetrics.netFollowers?.toString()
      }
    });

  } catch (error) {
    console.error('❌ Error en análisis de followers:', error);
    res.status(500).json({ 
      error: 'Error procesando imágenes de followers',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};