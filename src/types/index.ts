export interface CreatePublicationRequest {
    title: string;
    description?: string;
    type: string;
    duration?: number;
    hashtags?: string[];
    soundName?: string;
    soundTrending?: boolean;
    publishedDate: string; // Cambié publishedAt por publishedDate
    videoUrl?: string;
    thumbnailUrl?: string;
    platform?: string;
    metrics?: {
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
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
    engagementRate: number;
    viralScore?: number;
    averageWatchTime?: number;
  }