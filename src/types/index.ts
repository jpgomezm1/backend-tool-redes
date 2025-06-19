// src/types/index.ts
export interface CreatePublicationRequest {
  title?: string; // Hacer opcional para auto-generación
  description?: string;
  type: string;
  duration?: number;
  hashtags?: string[];
  soundName?: string;
  soundTrending?: boolean;
  publishedDate: string;
  videoUrl?: string;
  videoFile?: string; // Nueva propiedad
  thumbnailUrl?: string;
  scriptUrl?: string;
  platform?: string;
  autoGenerateContent?: boolean; // Flag para análisis automático
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    engagementRate?: number;
  };
  tiktokMetrics?: {
    averageWatchTime?: number;
    viralScore?: number;
    soundInteractions?: number;
    peakViewingHour?: number;
  };
}

export interface UpdateMetricsRequest {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  averageWatchTime: number;
  viralScore: number;
  soundInteractions?: number;
}

export interface CreatePlannedContentRequest {
  title: string;
  description?: string;
  contentType: string;
  hashtags: string[];
  soundIdea?: string;
  scheduledDate: string;
  status: 'planned' | 'in_progress' | 'ready' | 'published';
  estimatedViews?: number;
  notes?: string;
}

export interface CreateReferentRequest {
  url: string;
  username: string;
  followers: number;
  avgViews: number;
  engagementRate: number;
  niche: string;
  notes?: string;
}

export interface MetricUpdate {
  publicationId: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  viralScore?: number;
  averageWatchTime?: number;
}

export interface CreateAccountMetricsRequest {
  // Métricas básicas
  videoViews?: number;
  profileViews?: number;
  
  // Audiencia
  totalViewers?: number;
  newViewers?: number;
  totalFollowers?: number;
  netFollowers?: number;
  
  // Tráfico
  forYouTrafficPercent?: number;
  personalProfilePercent?: number;
  searchTrafficPercent?: number;
  followingTrafficPercent?: number;
  soundTrafficPercent?: number;
  
  // Demografía
  maleGenderPercent?: number;
  femaleGenderPercent?: number;
  otherGenderPercent?: number;
  
  // Datos complejos (extraídos por Gemini)
  searchQueries?: Array<{term: string, percentage: number}>;
  ageRanges?: Array<{range: string, percentage: number}>;
  topLocations?: Array<{location: string, type: 'country' | 'city', percentage: number}>;
  mostActiveTimesViewers?: Array<{hour: number, percentage: number}>;
  mostActiveTimesFollowers?: Array<{hour: number, percentage: number}>;
  creatorsAlsoWatched?: Array<{username: string, followers: number}>;
  
  // Período
  periodStart: string;
  periodEnd: string;
}