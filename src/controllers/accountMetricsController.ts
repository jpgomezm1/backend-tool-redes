import { Request, Response } from 'express';
import prisma from '../services/database';
import { Prisma } from '@prisma/client';
import { CreateAccountMetricsRequest } from '../types';

export const getAccountMetrics = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const metrics = await prisma.tikTokAccountMetrics.findMany({
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit as string)
    });

    // Convertir BigInt a string para la respuesta
    const responseMetrics = metrics.map(metric => ({
      ...metric,
      videoViews: metric.videoViews?.toString(),
      profileViews: metric.profileViews?.toString(),
      totalLikes: metric.totalLikes?.toString(),
      totalComments: metric.totalComments?.toString(),
      totalShares: metric.totalShares?.toString(),
      totalViewers: metric.totalViewers?.toString(),
      newViewers: metric.newViewers?.toString(),
      totalFollowers: metric.totalFollowers?.toString(),
      netFollowers: metric.netFollowers?.toString()
    }));

    res.json(responseMetrics);
  } catch (error) {
    console.error('Error fetching account metrics:', error);
    res.status(500).json({ error: 'Error fetching account metrics' });
  }
};

export const getLatestAccountMetrics = async (req: Request, res: Response) => {
  try {
    const latestMetrics = await prisma.tikTokAccountMetrics.findFirst({
      orderBy: { recordedAt: 'desc' }
    });

    if (!latestMetrics) {
      return res.status(404).json({ error: 'No account metrics found' });
    }

    // Convertir BigInt a string para la respuesta
    const responseMetrics = {
      ...latestMetrics,
      videoViews: latestMetrics.videoViews?.toString(),
      profileViews: latestMetrics.profileViews?.toString(),
      totalLikes: latestMetrics.totalLikes?.toString(),
      totalComments: latestMetrics.totalComments?.toString(),
      totalShares: latestMetrics.totalShares?.toString(),
      totalViewers: latestMetrics.totalViewers?.toString(),
      newViewers: latestMetrics.newViewers?.toString(),
      totalFollowers: latestMetrics.totalFollowers?.toString(),
      netFollowers: latestMetrics.netFollowers?.toString()
    };

    res.json(responseMetrics);
  } catch (error) {
    console.error('Error fetching latest account metrics:', error);
    res.status(500).json({ error: 'Error fetching latest account metrics' });
  }
};

export const createAccountMetrics = async (req: Request, res: Response) => {
  try {
    const data: CreateAccountMetricsRequest = req.body;

    console.log('📊 Creando métricas de cuenta:', data);

    const metrics = await prisma.tikTokAccountMetrics.create({
      data: {
        // Métricas básicas
        videoViews: data.videoViews ? BigInt(data.videoViews) : null,
        videoViewsChange: data.videoViewsChange,
        profileViews: data.profileViews ? BigInt(data.profileViews) : null,
        profileViewsChange: data.profileViewsChange,
        
        // Engagement
        totalLikes: data.totalLikes ? BigInt(data.totalLikes) : null,
        totalLikesChange: data.totalLikesChange,
        totalComments: data.totalComments ? BigInt(data.totalComments) : null,
        totalCommentsChange: data.totalCommentsChange,
        totalShares: data.totalShares ? BigInt(data.totalShares) : null,
        totalSharesChange: data.totalSharesChange,
        
        // Audiencia
        totalViewers: data.totalViewers ? BigInt(data.totalViewers) : null,
        totalViewersChange: data.totalViewersChange,
        newViewers: data.newViewers ? BigInt(data.newViewers) : null,
        newViewersChange: data.newViewersChange,
        totalFollowers: data.totalFollowers ? BigInt(data.totalFollowers) : null,
        totalFollowersChange: data.totalFollowersChange,
        netFollowers: data.netFollowers ? BigInt(data.netFollowers) : null,
        netFollowersChange: data.netFollowersChange,
        
        // Tráfico
        forYouTrafficPercent: data.forYouTrafficPercent,
        personalProfilePercent: data.personalProfilePercent,
        searchTrafficPercent: data.searchTrafficPercent,
        followingTrafficPercent: data.followingTrafficPercent,
        soundTrafficPercent: data.soundTrafficPercent,
        
        // Datos complejos como JSON - usar undefined en lugar de null
        searchQueries: data.searchQueries || undefined,
        maleGenderPercent: data.maleGenderPercent,
        femaleGenderPercent: data.femaleGenderPercent,
        otherGenderPercent: data.otherGenderPercent,
        ageRanges: data.ageRanges || undefined,
        topLocations: data.topLocations || undefined,
        mostActiveTimesViewers: data.mostActiveTimesViewers || undefined,
        mostActiveTimesFollowers: data.mostActiveTimesFollowers || undefined,
        creatorsAlsoWatched: data.creatorsAlsoWatched || undefined,
        
        // Período
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd)
      }
    });

    // Convertir BigInt a string para la respuesta
    const responseMetrics = {
      ...metrics,
      videoViews: metrics.videoViews?.toString(),
      profileViews: metrics.profileViews?.toString(),
      totalLikes: metrics.totalLikes?.toString(),
      totalComments: metrics.totalComments?.toString(),
      totalShares: metrics.totalShares?.toString(),
      totalViewers: metrics.totalViewers?.toString(),
      newViewers: metrics.newViewers?.toString(),
      totalFollowers: metrics.totalFollowers?.toString(),
      netFollowers: metrics.netFollowers?.toString()
    };

    console.log('✅ Métricas de cuenta creadas exitosamente');
    res.status(201).json(responseMetrics);
  } catch (error) {
    console.error('❌ Error creating account metrics:', error);
    res.status(500).json({ error: 'Error creating account metrics' });
  }
};

export const getAccountMetricsByPeriod = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required' 
      });
    }

    const metrics = await prisma.tikTokAccountMetrics.findMany({
      where: {
        periodStart: {
          gte: new Date(startDate as string)
        },
        periodEnd: {
          lte: new Date(endDate as string)
        }
      },
      orderBy: { recordedAt: 'desc' }
    });

    // Convertir BigInt a string para la respuesta
    const responseMetrics = metrics.map(metric => ({
      ...metric,
      videoViews: metric.videoViews?.toString(),
      profileViews: metric.profileViews?.toString(),
      totalLikes: metric.totalLikes?.toString(),
      totalComments: metric.totalComments?.toString(),
      totalShares: metric.totalShares?.toString(),
      totalViewers: metric.totalViewers?.toString(),
      newViewers: metric.newViewers?.toString(),
      totalFollowers: metric.totalFollowers?.toString(),
      netFollowers: metric.netFollowers?.toString()
    }));

    res.json(responseMetrics);
  } catch (error) {
    console.error('Error fetching account metrics by period:', error);
    res.status(500).json({ error: 'Error fetching account metrics by period' });
  }
};