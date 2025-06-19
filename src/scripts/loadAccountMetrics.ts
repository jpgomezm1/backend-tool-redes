import readline from 'readline';
import prisma from '../services/database';
import { analyzeGCSImage } from '../services/gcsImageAnalysis';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function parseNumber(input: string): number | undefined {
  if (!input || input === '') return undefined;
  const num = parseFloat(input);
  return isNaN(num) ? undefined : num;
}

function parseBigInt(input: string): bigint | undefined {
  if (!input || input === '') return undefined;
  const num = parseInt(input);
  return isNaN(num) ? undefined : BigInt(num);
}

async function loadAccountMetrics() {
  try {
    console.log('📊 CARGA DE MÉTRICAS DE CUENTA TIKTOK');
    console.log('=====================================');
    console.log('Presiona Enter para saltar campos opcionales\n');

    // Verificar API Key de Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ API Key de Gemini no configurada');
      rl.close();
      return;
    }

    // Período
    const periodStart = await askQuestion('📅 Fecha inicio del período (YYYY-MM-DD): ');
    const periodEnd = await askQuestion('📅 Fecha fin del período (YYYY-MM-DD): ');

    if (!periodStart || !periodEnd) {
      console.log('❌ Las fechas de período son obligatorias');
      rl.close();
      return;
    }

    // MÉTRICAS POR CONSOLA
    console.log('\n📹 MÉTRICAS BÁSICAS');
    const videoViews = await askQuestion('Vistas de videos: ');
    const profileViews = await askQuestion('Vistas de perfil: ');

    console.log('\n👥 MÉTRICAS DE AUDIENCIA');
    const totalViewers = await askQuestion('Total de viewers: ');
    const newViewers = await askQuestion('Nuevos viewers: ');
    const totalFollowers = await askQuestion('Total de seguidores: ');
    const netFollowers = await askQuestion('Seguidores netos: ');

    console.log('\n🚦 FUENTES DE TRÁFICO (%)');
    const forYouTrafficPercent = await askQuestion('Tráfico de For You (%): ');
    const personalProfilePercent = await askQuestion('Tráfico de perfil personal (%): ');
    const searchTrafficPercent = await askQuestion('Tráfico de búsqueda (%): ');
    const followingTrafficPercent = await askQuestion('Tráfico de siguiendo (%): ');
    const soundTrafficPercent = await askQuestion('Tráfico de sonido (%): ');

    console.log('\n🚻 DEMOGRAFÍA DE GÉNERO (%)');
    const maleGenderPercent = await askQuestion('Género masculino (%): ');
    const femaleGenderPercent = await askQuestion('Género femenino (%): ');
    const otherGenderPercent = await askQuestion('Otro género (%): ');

    // IMÁGENES PARA ANÁLISIS CON GEMINI
    console.log('\n🖼️ ANÁLISIS DE IMÁGENES CON GEMINI');
    console.log('Proporciona las URLs de las imágenes en Google Cloud Storage:');
    
    const searchImageUrl = await askQuestion('📱 URL imagen de búsquedas (Enter para saltar): ');
    const demographicsImageUrl = await askQuestion('👥 URL imagen de demografía/edad (Enter para saltar): ');
    const locationsImageUrl = await askQuestion('🌍 URL imagen de ubicaciones (Enter para saltar): ');
    const viewersTimesImageUrl = await askQuestion('⏰ URL imagen horarios viewers (Enter para saltar): ');
    const followersTimesImageUrl = await askQuestion('⏰ URL imagen horarios followers (Enter para saltar): ');
    const creatorsImageUrl = await askQuestion('👤 URL imagen creadores relacionados (Enter para saltar): ');

    // Inicializar variables
    let searchQueries: any = undefined;
    let ageRanges: any = undefined;
    let topLocations: any = undefined;
    let mostActiveTimesViewers: any = undefined;
    let mostActiveTimesFollowers: any = undefined;
    let creatorsAlsoWatched: any = undefined;

    // Analizar imágenes con Gemini
    console.log('\n🤖 Analizando imágenes con Gemini...');

    if (searchImageUrl) {
      console.log('🔍 Analizando búsquedas...');
      const result = await analyzeGCSImage(searchImageUrl, 'search', geminiApiKey);
      if (result.success) {
        searchQueries = result.searchQueries;
        console.log('✅ Búsquedas extraídas:', searchQueries?.length || 0, 'elementos');
      } else {
        console.log('❌ Error analizando búsquedas:', result.error);
      }
    }

    if (demographicsImageUrl) {
      console.log('👥 Analizando demografía...');
      const result = await analyzeGCSImage(demographicsImageUrl, 'demographics', geminiApiKey);
      if (result.success) {
        ageRanges = result.ageRanges;
        console.log('✅ Rangos de edad extraídos:', ageRanges?.length || 0, 'elementos');
      } else {
        console.log('❌ Error analizando demografía:', result.error);
      }
    }

    if (locationsImageUrl) {
      console.log('🌍 Analizando ubicaciones...');
      const result = await analyzeGCSImage(locationsImageUrl, 'locations', geminiApiKey);
      if (result.success) {
        topLocations = result.topLocations;
        console.log('✅ Ubicaciones extraídas:', topLocations?.length || 0, 'elementos');
      } else {
        console.log('❌ Error analizando ubicaciones:', result.error);
      }
    }

    if (viewersTimesImageUrl) {
      console.log('⏰ Analizando horarios de viewers...');
      const result = await analyzeGCSImage(viewersTimesImageUrl, 'viewers_times', geminiApiKey);
      if (result.success) {
        mostActiveTimesViewers = result.mostActiveTimesViewers;
        console.log('✅ Horarios viewers extraídos:', mostActiveTimesViewers?.length || 0, 'elementos');
      } else {
        console.log('❌ Error analizando horarios viewers:', result.error);
      }
    }

    if (followersTimesImageUrl) {
      console.log('⏰ Analizando horarios de followers...');
      const result = await analyzeGCSImage(followersTimesImageUrl, 'followers_times', geminiApiKey);
      if (result.success) {
        mostActiveTimesFollowers = result.mostActiveTimesFollowers;
        console.log('✅ Horarios followers extraídos:', mostActiveTimesFollowers?.length || 0, 'elementos');
      } else {
        console.log('❌ Error analizando horarios followers:', result.error);
      }
    }

    if (creatorsImageUrl) {
      console.log('👤 Analizando creadores relacionados...');
      const result = await analyzeGCSImage(creatorsImageUrl, 'creators', geminiApiKey);
      if (result.success) {
        creatorsAlsoWatched = result.creatorsAlsoWatched;
        console.log('✅ Creadores extraídos:', creatorsAlsoWatched?.length || 0, 'elementos');
      } else {
        console.log('❌ Error analizando creadores:', result.error);
      }
    }

    // Guardar en base de datos
    console.log('\n💾 Guardando métricas en base de datos...');

    const metrics = await prisma.tikTokAccountMetrics.create({
      data: {
        // Métricas básicas
        videoViews: parseBigInt(videoViews),
        profileViews: parseBigInt(profileViews),
        
        // Audiencia
        totalViewers: parseBigInt(totalViewers),
        newViewers: parseBigInt(newViewers),
        totalFollowers: parseBigInt(totalFollowers),
        netFollowers: parseBigInt(netFollowers),
        
        // Tráfico
        forYouTrafficPercent: parseNumber(forYouTrafficPercent),
        personalProfilePercent: parseNumber(personalProfilePercent),
        searchTrafficPercent: parseNumber(searchTrafficPercent),
        followingTrafficPercent: parseNumber(followingTrafficPercent),
        soundTrafficPercent: parseNumber(soundTrafficPercent),
        
        // Demografía
        maleGenderPercent: parseNumber(maleGenderPercent),
        femaleGenderPercent: parseNumber(femaleGenderPercent),
        otherGenderPercent: parseNumber(otherGenderPercent),
        
        // Datos complejos extraídos por Gemini
        searchQueries: searchQueries || undefined,
        ageRanges: ageRanges || undefined,
        topLocations: topLocations || undefined,
        mostActiveTimesViewers: mostActiveTimesViewers || undefined,
        mostActiveTimesFollowers: mostActiveTimesFollowers || undefined,
        creatorsAlsoWatched: creatorsAlsoWatched || undefined,
        
        // Período
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      }
    });

    console.log('\n✅ Métricas guardadas exitosamente!');
    console.log(`📊 ID: ${metrics.id}`);
    console.log(`📅 Período: ${periodStart} - ${periodEnd}`);
    console.log(`🖼️ Imágenes analizadas: ${[searchImageUrl, demographicsImageUrl, locationsImageUrl, viewersTimesImageUrl, followersTimesImageUrl, creatorsImageUrl].filter(Boolean).length}/6`);

  } catch (error) {
    console.error('❌ Error guardando métricas:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

loadAccountMetrics();