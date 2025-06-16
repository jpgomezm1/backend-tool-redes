import { Request, Response } from 'express';
import prisma from '../services/database';
import { CreatePlannedContentRequest } from '../types';

export const getPlannedContent = async (req: Request, res: Response) => {
  try {
    const plannedContent = await prisma.plannedContent.findMany({
      orderBy: { scheduledDate: 'asc' }
    });

    res.json(plannedContent);
  } catch (error) {
    console.error('Error fetching planned content:', error);
    res.status(500).json({ error: 'Error fetching planned content' });
  }
};

export const getPlannedContentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const plannedContent = await prisma.plannedContent.findUnique({
      where: { id }
    });

    if (!plannedContent) {
      return res.status(404).json({ error: 'Planned content not found' });
    }

    res.json(plannedContent);
  } catch (error) {
    console.error('Error fetching planned content:', error);
    res.status(500).json({ error: 'Error fetching planned content' });
  }
};

export const createPlannedContent = async (req: Request, res: Response) => {
  try {
    const data: CreatePlannedContentRequest = req.body;
    
    const plannedContent = await prisma.plannedContent.create({
      data: {
        title: data.title,
        description: data.description,
        contentType: data.contentType,
        hashtags: data.hashtags,
        soundIdea: data.soundIdea,
        scheduledDate: new Date(data.scheduledDate),
        status: data.status,
        estimatedViews: data.estimatedViews,
        notes: data.notes
      }
    });

    res.status(201).json(plannedContent);
  } catch (error) {
    console.error('Error creating planned content:', error);
    res.status(500).json({ error: 'Error creating planned content' });
  }
};

export const updatePlannedContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Partial<CreatePlannedContentRequest> = req.body;

    const plannedContent = await prisma.plannedContent.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.contentType && { contentType: data.contentType }),
        ...(data.hashtags && { hashtags: data.hashtags }),
        ...(data.soundIdea !== undefined && { soundIdea: data.soundIdea }),
        ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
        ...(data.status && { status: data.status }),
        ...(data.estimatedViews !== undefined && { estimatedViews: data.estimatedViews }),
        ...(data.notes !== undefined && { notes: data.notes })
      }
    });

    res.json(plannedContent);
  } catch (error) {
    console.error('Error updating planned content:', error);
    res.status(500).json({ error: 'Error updating planned content' });
  }
};

export const deletePlannedContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.plannedContent.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting planned content:', error);
    res.status(500).json({ error: 'Error deleting planned content' });
  }
};

export const getPlannedContentByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    
    const plannedContent = await prisma.plannedContent.findMany({
      where: { status },
      orderBy: { scheduledDate: 'asc' }
    });

    res.json(plannedContent);
  } catch (error) {
    console.error('Error fetching planned content by status:', error);
    res.status(500).json({ error: 'Error fetching planned content by status' });
  }
};

export const getUpcomingContent = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days as string));

    const upcomingContent = await prisma.plannedContent.findMany({
      where: {
        scheduledDate: {
          gte: new Date(),
          lte: futureDate
        },
        status: {
          in: ['planned', 'in_progress', 'ready']
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    res.json(upcomingContent);
  } catch (error) {
    console.error('Error fetching upcoming content:', error);
    res.status(500).json({ error: 'Error fetching upcoming content' });
  }
};

export const updateContentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validar que el status sea válido
    const validStatuses = ['planned', 'in_progress', 'ready', 'published'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }

    const plannedContent = await prisma.plannedContent.update({
      where: { id },
      data: { status }
    });

    res.json(plannedContent);
  } catch (error) {
    console.error('Error updating content status:', error);
    res.status(500).json({ error: 'Error updating content status' });
  }
};