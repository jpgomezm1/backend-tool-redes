import { Request, Response } from 'express';
import prisma from '../services/database';

export const getOverview = async (req: Request, res: Response) => {
  try {
    // Obtener todas las publicaciones con sus métricas más recientes
    const publications = await prisma.tikTokPublication.findMany({
      include: {
        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      }
    });

    // Calcular métricas generales
    const totalPublications = publications.length;
    const totalViews = publications.reduce((sum, pub) => 
      sum + (pub.metrics[0]?.views || 0), 0
    );
    const totalLikes = publications.reduce((sum, pub) => 
      sum + (pub.metrics[0]?.likes || 0), 0
    );
    const totalComments = publications.reduce((sum, pub) => 
      sum + (pub.metrics[0]?.comments || 0), 0
    );
    const totalShares = publications.reduce((sum, pub) => 
      sum + (pub.metrics[0]?.shares || 0), 0
    );

    const avgEngagementRate = publications.length > 0 
      ? publications.reduce((sum, pub) => 
          sum + (pub.metrics[0]?.engagementRate || 0), 0
        ) / publications.length
      : 0;

    const avgViralScore = publications.length > 0
      ? publications.reduce((sum, pub) => 
          sum + (pub.metrics[0]?.viralScore || 0), 0
        ) / publications.length
      : 0;

    const avgWatchTime = publications.length > 0
      ? publications.reduce((sum, pub) => 
          sum + (pub.metrics[0]?.averageWatchTime || 0), 0
        ) / publications.length
      : 0;

    // Mejor publicación
    const bestPublication = publications.reduce((best, current) => {
      const currentEngagement = current.metrics[0]?.engagementRate || 0;
      const bestEngagement = best?.metrics[0]?.engagementRate || 0;
      return currentEngagement > bestEngagement ? current : best;
    }, publications[0]);

    const overview = {
      totalPublications,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      avgViralScore: parseFloat(avgViralScore.toFixed(1)),
      avgWatchTime: parseFloat(avgWatchTime.toFixed(1)),
      bestPublication: bestPublication ? {
        id: bestPublication.id,
        title: bestPublication.title,
        engagementRate: bestPublication.metrics[0]?.engagementRate || 0,
        views: bestPublication.metrics[0]?.views || 0
      } : null
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Error fetching overview' });
  }
};

export const getHashtagAnalysis = async (req: Request, res: Response) => {
  try {
    const publications = await prisma.tikTokPublication.findMany({
      include: {
        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      }
    });

    // Análisis de hashtags
    const hashtagStats: { [key: string]: { 
      uses: number; 
      totalViews: number; 
      totalEngagement: number;
      avgEngagementRate: number;
    } } = {};

    publications.forEach(pub => {
      const metrics = pub.metrics[0];
      const engagement = (metrics?.likes || 0) + (metrics?.comments || 0) + (metrics?.shares || 0);
      
      pub.hashtags.forEach(hashtag => {
        if (!hashtagStats[hashtag]) {
          hashtagStats[hashtag] = {
            uses: 0,
            totalViews: 0,
            totalEngagement: 0,
            avgEngagementRate: 0
          };
        }
        
        hashtagStats[hashtag].uses += 1;
        hashtagStats[hashtag].totalViews += metrics?.views || 0;
        hashtagStats[hashtag].totalEngagement += engagement;
      });
    });

    // Calcular engagement rate promedio por hashtag
    Object.keys(hashtagStats).forEach(hashtag => {
      const stats = hashtagStats[hashtag];
      stats.avgEngagementRate = stats.totalViews > 0 
        ? (stats.totalEngagement / stats.totalViews) * 100 
        : 0;
    });

    // Convertir a array y ordenar por engagement rate
    const hashtagAnalysis = Object.entries(hashtagStats)
      .map(([hashtag, stats]) => ({
        hashtag,
        ...stats,
        avgEngagementRate: parseFloat(stats.avgEngagementRate.toFixed(2))
      }))
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

    res.json(hashtagAnalysis);
  } catch (error) {
    console.error('Error fetching hashtag analysis:', error);
    res.status(500).json({ error: 'Error fetching hashtag analysis' });
  }
};

export const getContentTypeAnalysis = async (req: Request, res: Response) => {
  try {
    const publications = await prisma.tikTokPublication.findMany({
      include: {
        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      }
    });

    // Análisis por tipo de contenido
    const contentTypeStats: { [key: string]: {
      count: number;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      avgEngagementRate: number;
      avgViralScore: number;
    } } = {};

    publications.forEach(pub => {
      const metrics = pub.metrics[0];
      const type = pub.type;

      if (!contentTypeStats[type]) {
        contentTypeStats[type] = {
          count: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          avgEngagementRate: 0,
          avgViralScore: 0
        };
      }

      const stats = contentTypeStats[type];
      stats.count += 1;
      stats.totalViews += metrics?.views || 0;
      stats.totalLikes += metrics?.likes || 0;
      stats.totalComments += metrics?.comments || 0;
      stats.totalShares += metrics?.shares || 0;
      stats.avgEngagementRate += metrics?.engagementRate || 0;
      stats.avgViralScore += metrics?.viralScore || 0;
    });

    // Calcular promedios
    Object.keys(contentTypeStats).forEach(type => {
      const stats = contentTypeStats[type];
      stats.avgEngagementRate = stats.avgEngagementRate / stats.count;
      stats.avgViralScore = stats.avgViralScore / stats.count;
    });

    const contentTypeAnalysis = Object.entries(contentTypeStats)
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        totalViews: stats.totalViews,
        totalLikes: stats.totalLikes,
        totalComments: stats.totalComments,
        totalShares: stats.totalShares,
        avgEngagementRate: parseFloat(stats.avgEngagementRate.toFixed(2)),
        avgViralScore: parseFloat(stats.avgViralScore.toFixed(1))
      }))
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

    res.json(contentTypeAnalysis);
  } catch (error) {
    console.error('Error fetching content type analysis:', error);
    res.status(500).json({ error: 'Error fetching content type analysis' });
  }
};

export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Métricas de los últimos X días
    const recentMetrics = await prisma.tikTokMetrics.findMany({
      where: {
        recordedAt: {
          gte: daysAgo
        }
      },
      include: {
        publication: true
      },
      orderBy: { recordedAt: 'desc' }
    });

    // Agrupar métricas por día
    const dailyMetrics: { [key: string]: {
      date: string;
      views: number;
      likes: number;
      comments: number;
      shares: number;
      avgEngagement: number;
      publications: number;
    } } = {};

    recentMetrics.forEach(metric => {
      const date = metric.recordedAt.toISOString().split('T')[0];
      
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = {
          date,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          avgEngagement: 0,
          publications: 0
        };
      }

      const daily = dailyMetrics[date];
      daily.views += metric.views;
      daily.likes += metric.likes;
      daily.comments += metric.comments;
      daily.shares += metric.shares;
      daily.avgEngagement += metric.engagementRate;
      daily.publications += 1;
    });

    // Calcular engagement promedio por día
    Object.keys(dailyMetrics).forEach(date => {
      const daily = dailyMetrics[date];
      daily.avgEngagement = daily.avgEngagement / daily.publications;
    });

    const performanceData = Object.values(dailyMetrics)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json(performanceData);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Error fetching performance metrics' });
  }
};