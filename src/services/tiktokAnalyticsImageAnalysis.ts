import { GoogleGenerativeAI } from '@google/generative-ai';

interface ProfileAnalyticsResult {
  success: boolean;
  profile_views?: number;
  profile_views_change?: string;
  traffic_source?: {
    for_you?: string;
    personal_profile?: string;
    search?: string;
    following?: string;
    sound?: string;
  };
  search_queries?: Array<{
    query: string;
    percentage: string;
  }>;
  error?: string;
  raw_response?: string;
}

interface ViewerStatsResult {
  success: boolean;
  total_viewers?: number;
  total_viewers_change?: string;
  new_viewers?: number;
  new_viewers_change?: string;
  most_active_times?: {
    day?: string;
    time_range?: string;
    full_description?: string;
  };
  gender?: {
    male?: string;
    female?: string;
    other?: string;
  };
  age_ranges?: Array<{
    range: string;
    percentage: string;
  }>;
  locations?: Array<{
    location: string;
    percentage: string;
  }>;
  creators_also_watched?: Array<{
    name: string;
    followers: string;
  }>;
  error?: string;
  raw_response?: string;
}

interface FollowerStatsResult {
  success: boolean;
  total_followers?: number;
  total_followers_change?: string;
  net_followers?: number;
  net_followers_change?: string;
  gender?: {
    male?: string;
    female?: string;
    other?: string;
  };
  most_active_times?: {
    day?: string;
    time?: string;
    full_description?: string;
  };
  age_ranges?: Array<{
    range: string;
    percentage: string;
  }>;
  error?: string;
  raw_response?: string;
}

export class TikTokAnalyticsImageAnalyzer {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeProfileAnalytics(imageBuffer: Buffer): Promise<ProfileAnalyticsResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const prompt = `
      Extrae de esta imagen de TikTok Analytics:
      
      1. Profile views (número y cambio porcentual si está visible)
      2. Traffic source (porcentajes de For You, Personal profile, Search, Following, Sound)  
      3. Search queries (términos y porcentajes)
      
      Responde SOLO con este JSON:
      {
          "profile_views": número,
          "profile_views_change": "cambio porcentual o null",
          "traffic_source": {
              "for_you": "X%",
              "personal_profile": "X%", 
              "search": "X%",
              "following": "X%",
              "sound": "X%"
          },
          "search_queries": [
              {"query": "término", "percentage": "X%"}
          ]
      }
      
      Si algún dato no está visible, usa null o [].
      `;

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const responseText = response.text();

      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const analysisResult = JSON.parse(jsonMatch[0]);
          return { success: true, ...analysisResult };
        } catch (parseError) {
          return {
            success: false,
            error: "Error parseando JSON",
            raw_response: responseText
          };
        }
      } else {
        return {
          success: false,
          error: "No se encontró JSON en la respuesta",
          raw_response: responseText
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error analizando imagen: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async analyzeViewerStats(imageBuffer: Buffer): Promise<ViewerStatsResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const prompt = `
      Extrae de esta imagen de TikTok Analytics los datos de viewers:
      
      1. Total viewers (número y cambio porcentual)
      2. New viewers (número y cambio porcentual)
      3. Most active times (horario específico mencionado)
      4. Gender (porcentajes de Male/Female/Other si están visibles)
      5. Age (rangos de edad y porcentajes si están visibles)
      6. Locations (países/ciudades y porcentajes si están visibles)
      7. Creators your viewers also watched (nombres y seguidores si están visibles)
      
      Responde SOLO con este JSON:
      {
          "total_viewers": número,
          "total_viewers_change": "cambio porcentual",
          "new_viewers": número,
          "new_viewers_change": "cambio porcentual",
          "most_active_times": {
              "day": "día específico",
              "time_range": "rango de horas",
              "full_description": "descripción completa"
          },
          "gender": {
              "male": "X%",
              "female": "X%",
              "other": "X%"
          },
          "age_ranges": [
              {"range": "18-24", "percentage": "X%"},
              {"range": "25-34", "percentage": "X%"}
          ],
          "locations": [
              {"location": "país/ciudad", "percentage": "X%"}
          ],
          "creators_also_watched": [
              {"name": "nombre", "followers": "cantidad seguidores"}
          ]
      }
      
      Si algún dato no está visible en esta imagen específica, usa null o [].
      `;

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const responseText = response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const analysisResult = JSON.parse(jsonMatch[0]);
          return { success: true, ...analysisResult };
        } catch (parseError) {
          return {
            success: false,
            error: "Error parseando JSON",
            raw_response: responseText
          };
        }
      } else {
        return {
          success: false,
          error: "No se encontró JSON en la respuesta",
          raw_response: responseText
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error analizando imagen: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async analyzeFollowerStats(imageBuffer: Buffer): Promise<FollowerStatsResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const prompt = `
      Extrae de esta imagen de TikTok Analytics los datos de followers:
      
      1. Total followers (número y cambio porcentual si está visible)
      2. Net followers (número y cambio porcentual si está visible)
      3. Gender (porcentajes exactos de Male/Female/Other)
      4. Most active times (día específico y hora mencionada)
      5. Age (rangos de edad específicos y sus porcentajes exactos)
      
      Responde SOLO con este JSON:
      {
          "total_followers": número,
          "total_followers_change": "cambio porcentual o null",
          "net_followers": número,
          "net_followers_change": "cambio porcentual",
          "gender": {
              "male": "X%",
              "female": "X%",
              "other": "X%"
          },
          "most_active_times": {
              "day": "día específico",
              "time": "hora específica",
              "full_description": "descripción completa del texto"
          },
          "age_ranges": [
              {"range": "rango exacto", "percentage": "porcentaje exacto"}
          ]
      }
      
      Si algún dato no está visible en esta imagen, usa null o [].
      Extrae los porcentajes exactos como aparecen (ej: "62%", "38%", "60.4%").
      `;

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const responseText = response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const analysisResult = JSON.parse(jsonMatch[0]);
          return { success: true, ...analysisResult };
        } catch (parseError) {
          return {
            success: false,
            error: "Error parseando JSON",
            raw_response: responseText
          };
        }
      } else {
        return {
          success: false,
          error: "No se encontró JSON en la respuesta",
          raw_response: responseText
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error analizando imagen: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Función para combinar resultados de múltiples imágenes
  combineResults(results: any[], type: 'profile' | 'viewer' | 'follower'): any {
    const combined: any = {};

    for (const result of results) {
      if (result.success) {
        // Combinar datos según el tipo
        Object.keys(result).forEach(key => {
          if (key === 'success') return;
          
          if (!combined[key] && result[key] !== null && result[key] !== undefined) {
            combined[key] = result[key];
          }
          
          // Para arrays, combinar sin duplicar
          if (Array.isArray(result[key]) && Array.isArray(combined[key])) {
            result[key].forEach((item: any) => {
              const exists = combined[key].some((existing: any) => 
                JSON.stringify(existing) === JSON.stringify(item)
              );
              if (!exists) {
                combined[key].push(item);
              }
            });
          } else if (Array.isArray(result[key]) && !combined[key]) {
            combined[key] = [...result[key]];
          }
        });
      }
    }

    return { success: true, ...combined };
  }
}

export const analyzeTikTokImages = async (
  images: Buffer[],
  type: 'profile' | 'viewer' | 'follower',
  apiKey: string
) => {
  const analyzer = new TikTokAnalyticsImageAnalyzer(apiKey);
  const results = [];

  for (const imageBuffer of images) {
    let result;
    switch (type) {
      case 'profile':
        result = await analyzer.analyzeProfileAnalytics(imageBuffer);
        break;
      case 'viewer':
        result = await analyzer.analyzeViewerStats(imageBuffer);
        break;
      case 'follower':
        result = await analyzer.analyzeFollowerStats(imageBuffer);
        break;
      default:
        throw new Error('Tipo de análisis no válido');
    }
    results.push(result);
  }

  // Combinar resultados si hay múltiples imágenes
  const combined = analyzer.combineResults(results, type);
  
  return {
    individual_results: results,
    combined_result: combined
  };
};