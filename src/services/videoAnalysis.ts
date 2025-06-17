// src/services/videoAnalysis.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

interface VideoAnalysisResult {
  success: boolean;
  titulo?: string;
  guion?: string;
  descripcion_corta?: string;
  duracion_estimada?: string;
  temas_principales?: string[];
  tono?: string;
  elementos_visuales?: string[];
  archivo_original?: string; // Agregado para evitar el error
  error?: string;
  raw_response?: string;
}

export class VideoAnalyzerGemini {
  private genAI: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
  }

  async uploadVideo(videoBuffer: Buffer, fileName: string): Promise<any> {
    try {
      console.log(`📤 Subiendo video: ${fileName}`);
      
      // Crear archivo temporal
      const tempPath = `/tmp/${Date.now()}-${fileName}`;
      const fs = await import('fs');
      fs.writeFileSync(tempPath, videoBuffer);

      // Subir el archivo
      const uploadResult = await this.fileManager.uploadFile(tempPath, {
        mimeType: this.getMimeType(fileName),
        displayName: fileName,
      });

      console.log(`✅ Video subido exitosamente. URI: ${uploadResult.file.uri}`);

      // Esperar a que el video sea procesado
      console.log("⏳ Esperando procesamiento del video...");
      let file = await this.fileManager.getFile(uploadResult.file.name);
      
      while (file.state === 'PROCESSING') {
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        file = await this.fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === 'FAILED') {
        throw new Error(`Error procesando el video: ${file.state}`);
      }

      console.log(`\n✅ Video procesado exitosamente`);
      
      // Limpiar archivo temporal
      fs.unlinkSync(tempPath);
      
      return file;
    } catch (error) {
      console.error(`❌ Error subiendo video:`, error);
      throw error;
    }
  }

  async analyzeVideoContent(videoFile: any): Promise<VideoAnalysisResult> {
    const prompt = `
    Analiza este video en detalle y proporciona la siguiente información en formato JSON:

    1. **Título del video**: Un título atractivo y descriptivo que capture la esencia del contenido (máximo 60 caracteres)
    2. **Guion del video**: Una transcripción detallada de lo que se dice y describe en el video, incluyendo:
       - Diálogos principales
       - Acciones importantes
       - Elementos visuales relevantes
       - Música o sonidos significativos
    3. **Descripción corta**: Una descripción concisa y atractiva para redes sociales (máximo 150 caracteres)

    Formato de respuesta requerido:
    {
        "titulo": "Título atractivo del video",
        "guion": "Transcripción detallada del contenido, acciones y diálogos del video...",
        "descripcion_corta": "Descripción breve y atractiva",
        "duracion_estimada": "Duración aproximada del video",
        "temas_principales": ["tema1", "tema2", "tema3"],
        "tono": "descriptivo/gracioso/serio/educativo/etc",
        "elementos_visuales": ["elemento1", "elemento2"],
        "success": true
    }

    Sé específico y detallado en el guion, capturando tanto el audio como los elementos visuales importantes.
    `;

    try {
      console.log("🤖 Analizando contenido del video con Gemini...");
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: videoFile.mimeType,
            fileUri: videoFile.uri
          }
        },
        prompt
      ]);

      const response = await result.response;
      const responseText = response.text();
      
      console.log("✅ Análisis completado");

      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const analysisResult = JSON.parse(jsonMatch[0]) as VideoAnalysisResult;
          return analysisResult;
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
        error: `Error analizando video: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async cleanupUploadedFile(videoFile: any): Promise<void> {
    try {
      await this.fileManager.deleteFile(videoFile.name);
      console.log("🗑️ Archivo temporal eliminado");
    } catch (error) {
      console.error("⚠️ No se pudo eliminar archivo temporal:", error);
    }
  }

  async analyzeVideoBuffer(videoBuffer: Buffer, fileName: string): Promise<VideoAnalysisResult> {
    console.log("🎬 Iniciando análisis de video...");
    
    let videoFile;
    try {
      // Subir video
      videoFile = await this.uploadVideo(videoBuffer, fileName);
      
      // Analizar contenido
      const result = await this.analyzeVideoContent(videoFile);
      
      if (result.success) {
        result.archivo_original = fileName;
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Error en el análisis: ${error instanceof Error ? error.message : String(error)}`
      };
    } finally {
      // Limpiar archivo subido
      if (videoFile) {
        await this.cleanupUploadedFile(videoFile);
      }
    }
  }

  private getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      '3gp': 'video/3gpp'
    };
    return mimeTypes[extension || ''] || 'video/mp4';
  }
}

export const analyzeVideoWithGemini = async (
  videoBuffer: Buffer, 
  fileName: string, 
  apiKey: string
): Promise<VideoAnalysisResult> => {
  const analyzer = new VideoAnalyzerGemini(apiKey);
  return analyzer.analyzeVideoBuffer(videoBuffer, fileName);
};