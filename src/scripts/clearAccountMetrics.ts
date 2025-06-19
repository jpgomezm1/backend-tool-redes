import prisma from '../services/database';

async function clearAccountMetrics() {
  try {
    console.log('🗑️ Eliminando todas las métricas de cuenta...');
    
    const result = await prisma.tikTokAccountMetrics.deleteMany({});
    
    console.log(`✅ Eliminadas ${result.count} métricas de cuenta`);
  } catch (error) {
    console.error('❌ Error eliminando métricas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAccountMetrics();