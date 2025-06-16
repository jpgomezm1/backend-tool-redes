import { Request, Response } from 'express';
import prisma from '../services/database';
import { CreateReferentRequest } from '../types';

export const getReferents = async (req: Request, res: Response) => {
  try {
    const referents = await prisma.tikTokReferent.findMany({
      orderBy: { addedAt: 'desc' }
    });

    res.json(referents);
  } catch (error) {
    console.error('Error fetching referents:', error);
    res.status(500).json({ error: 'Error fetching referents' });
  }
};

export const getReferentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const referent = await prisma.tikTokReferent.findUnique({
      where: { id }
    });

    if (!referent) {
      return res.status(404).json({ error: 'Referent not found' });
    }

    res.json(referent);
  } catch (error) {
    console.error('Error fetching referent:', error);
    res.status(500).json({ error: 'Error fetching referent' });
  }
};

export const createReferent = async (req: Request, res: Response) => {
  try {
    const data: CreateReferentRequest = req.body;
    
    const referent = await prisma.tikTokReferent.create({
      data: {
        url: data.url,
        username: data.username,
        followers: data.followers,
        avgViews: data.avgViews,
        engagementRate: data.engagementRate,
        niche: data.niche,
        notes: data.notes
      }
    });

    res.status(201).json(referent);
  } catch (error) {
    console.error('Error creating referent:', error);
    res.status(500).json({ error: 'Error creating referent' });
  }
};

export const updateReferent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Partial<CreateReferentRequest> = req.body;

    const referent = await prisma.tikTokReferent.update({
      where: { id },
      data: {
        ...(data.url && { url: data.url }),
        ...(data.username && { username: data.username }),
        ...(data.followers !== undefined && { followers: data.followers }),
        ...(data.avgViews !== undefined && { avgViews: data.avgViews }),
        ...(data.engagementRate !== undefined && { engagementRate: data.engagementRate }),
        ...(data.niche && { niche: data.niche }),
        ...(data.notes !== undefined && { notes: data.notes })
      }
    });

    res.json(referent);
  } catch (error) {
    console.error('Error updating referent:', error);
    res.status(500).json({ error: 'Error updating referent' });
  }
};

export const deleteReferent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.tikTokReferent.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting referent:', error);
    res.status(500).json({ error: 'Error deleting referent' });
  }
};

export const getReferentsByNiche = async (req: Request, res: Response) => {
  try {
    const { niche } = req.params;
    
    const referents = await prisma.tikTokReferent.findMany({
      where: { 
        niche: {
          contains: niche,
          mode: 'insensitive'
        }
      },
      orderBy: { engagementRate: 'desc' }
    });

    res.json(referents);
  } catch (error) {
    console.error('Error fetching referents by niche:', error);
    res.status(500).json({ error: 'Error fetching referents by niche' });
  }
};