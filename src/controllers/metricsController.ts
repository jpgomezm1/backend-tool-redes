// src/controllers/metricsController.ts
import { Request, Response } from 'express';
import prisma from '../services/database';
import { UpdateMetricsRequest } from '../types';

export const addMetrics = async (req: Request, res: Response) => {
    try {
      const { publicationId } = req.params;
      const data: UpdateMetricsRequest = req.body;
  
      console.log('📊 RECIBIENDO MÉTRICAS:');
      console.log('Publication ID:', publicationId);
      console.log('Data recibida:', data);
  
      // Calcular engagement rate incluyendo saves
      const totalEngagements = data.likes + data.comments + data.shares + data.saves;
      const engagementRate = data.views > 0 ? (totalEngagements / data.views) * 100 : 0;
  
      console.log('📈 Engagement calculado:', engagementRate);
  
      const metrics = await prisma.tikTokMetrics.create({
        data: {
          publicationId,
          views: data.views,
          likes: data.likes,
          comments: data.comments,
          shares: data.shares,
          saves: data.saves,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          averageWatchTime: data.averageWatchTime,
          viralScore: data.viralScore,
          soundInteractions: data.soundInteractions || 0
        }
      });
  
      console.log('✅ Métricas creadas:', metrics);
  
      res.status(201).json(metrics);
    } catch (error) {
      console.error('❌ Error adding metrics:', error);
      res.status(500).json({ error: 'Error adding metrics' });
    }
  };

export const getMetricsHistory = async (req: Request, res: Response) => {
  try {
    const { publicationId } = req.params;

    const metrics = await prisma.tikTokMetrics.findMany({
      where: { publicationId },
      orderBy: { recordedAt: 'desc' }
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Error fetching metrics' });
  }
};