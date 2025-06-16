import prisma from '../services/database';

export const seedData = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Crear algunas publicaciones de ejemplo
    const publication1 = await prisma.tikTokPublication.create({
      data: {
        title: 'Tutorial: Cómo crear videos virales',
        description: 'Tips y trucos para hacer contenido viral en TikTok',
        type: 'Tutorial',
        duration: 60,
        hashtags: ['tutorial', 'viral', 'tiktok', 'tips'],
        soundName: 'Original Sound - CreatorName',
        soundTrending: true,
        publishedAt: new Date('2024-01-15'),
        videoUrl: 'https://tiktok.com/@user/video/123',
        thumbnailUrl: 'https://example.com/thumb1.jpg'
      }
    });

    const publication2 = await prisma.tikTokPublication.create({
      data: {
        title: 'Danza trending del momento',
        description: 'La nueva coreografía que está rompiendo TikTok',
        type: 'Danza',
        duration: 30,
        hashtags: ['dance', 'trending', 'viral', 'fyp'],
        soundName: 'Trending Dance Beat 2024',
        soundTrending: true,
        publishedAt: new Date('2024-01-20'),
        videoUrl: 'https://tiktok.com/@user/video/124'
      }
    });

    // Agregar métricas para las publicaciones
    await prisma.tikTokMetrics.create({
      data: {
        publicationId: publication1.id,
        views: 125000,
        likes: 15600,
        comments: 890,
        shares: 2340,
        engagementRate: 15.2,
        averageWatchTime: 45.5,
        viralScore: 87,
        soundInteractions: 560
      }
    });

    await prisma.tikTokMetrics.create({
      data: {
        publicationId: publication2.id,
        views: 89000,
        likes: 12300,
        comments: 670,
        shares: 1890,
        engagementRate: 16.8,
        averageWatchTime: 28.3,
        viralScore: 92,
        soundInteractions: 780
      }
    });

    // Crear contenido planeado
    await prisma.plannedContent.create({
      data: {
        title: 'Video sobre productividad',
        description: 'Tips para ser más productivo trabajando desde casa',
        contentType: 'Educativo',
        hashtags: ['productivity', 'tips', 'workspace', 'motivation'],
        soundIdea: 'Música motivacional',
        scheduledDate: new Date('2024-02-01'),
        status: 'planned',
        estimatedViews: 50000,
        notes: 'Grabar en la oficina nueva, usar atril para el teléfono'
      }
    });

    // Crear referentes
    await prisma.tikTokReferent.create({
      data: {
        url: 'https://tiktok.com/@productivity_guru',
        username: 'productivity_guru',
        followers: 2500000,
        avgViews: 150000,
        engagementRate: 12.5,
        niche: 'Productividad',
        notes: 'Excelente para ideas de contenido educativo, muy buen engagement'
      }
    });

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};