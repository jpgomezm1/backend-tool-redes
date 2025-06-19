import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

interface GCSImageAnalysisResult {
  success: boolean;
  searchQueries?: Array<{term: string, percentage: number}>;
  ageRanges?: Array<{range: string, percentage: number}>;
  topLocations?: Array<{location: string, type: string, percentage: number}>;
  mostActiveTimesViewers?: Array<{hour: number, percentage: number}>;
  mostActiveTimesFollowers?: Array<{hour: number, percentage: number}>;
  creatorsAlsoWatched?: Array<{username: string, followers: number}>;
  error?: string;
  raw_response?: string;
}

export class GCSImageAnalyzer {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeImageFromGCS(imageUrl: string, analysisType: string): Promise<GCSImageAnalysisResult> {
    try {
      console.log(`🖼️ Analizando imagen: ${imageUrl}`);
      console.log(`📊 Tipo de análisis: ${analysisType}`);

      // Descargar imagen desde GCS
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      let prompt = '';
      
      switch (analysisType) {
        case 'search':
          prompt = `
          Extrae de esta imagen de TikTok Analytics las consultas de búsqueda:
          
          Busca términos de búsqueda y sus porcentajes correspondientes.
          
          Responde SOLO con este JSON:
          {
              "searchQueries": [
                  {"term": "término", "percentage": número}
              ]
          }
          
          Si no hay datos, usa [].
          `;
          break;

        case 'demographics':
          prompt = `
          Extrae de esta imagen de TikTok Analytics los rangos de edad:
          
          Busca rangos de edad como "18-24", "25-34", etc. y sus porcentajes.
          
          Responde SOLO con este JSON:
          {
              "ageRanges": [
                  {"range": "18-24", "percentage": número}
              ]
          }
          
          Si no hay datos, usa [].
          `;
          break;

        case 'locations':
          prompt = `
          Extrae de esta imagen de TikTok Analytics las ubicaciones principales:
          
          Busca países/ciudades y sus porcentajes.
          
          Responde SOLO con este JSON:
          {
              "topLocations": [
                  {"location": "nombre", "type": "country", "percentage": número}
              ]
          }
          
          Si no hay datos, usa [].
          `;
          break;

        case 'viewers_times':
          prompt = `
          Extrae de esta imagen de TikTok Analytics los horarios más activos de viewers:
          
          Busca horas específicas y porcentajes de actividad.
          
          Responde SOLO con este JSON:
          {
              "mostActiveTimesViewers": [
                  {"hour": número_hora, "percentage": número}
              ]
          }
          
          Si no hay datos, usa [].
          `;
          break;

        case 'followers_times':
          prompt = `
          Extrae de esta imagen de TikTok Analytics los horarios más activos de followers:
          
          Busca horas específicas y porcentajes de actividad.
          
          Responde SOLO con este JSON:
          {
              "mostActiveTimesFollowers": [
                  {"hour": número_hora, "percentage": número}
              ]
          }
          
          Si no hay datos, usa [].
          `;
          break;

        case 'creators':
          prompt = `
          Extrae de esta imagen de TikTok Analytics los creadores relacionados:
          
          Busca nombres de usuarios y número de seguidores.
          
          Responde SOLO con este JSON:
          {
              "creatorsAlsoWatched": [
                  {"username": "@usuario", "followers": número}
              ]
          }
          
          Si no hay datos, usa [].
          `;
          break;

        default:
          throw new Error(`Tipo de análisis no válido: ${analysisType}`);
      }

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = await result.response.text();

      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const analysisResult = JSON.parse(jsonMatch[0]);
          console.log(`✅ Análisis completado para ${analysisType}`);
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
}

export const analyzeGCSImage = async (
  imageUrl: string,
  analysisType: string,
  apiKey: string
): Promise<GCSImageAnalysisResult> => {
  const analyzer = new GCSImageAnalyzer(apiKey);
  return analyzer.analyzeImageFromGCS(imageUrl, analysisType);
};