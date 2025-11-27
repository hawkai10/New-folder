export enum BiasRating {
  LEFT = 'Left',
  LEAN_LEFT = 'Lean Left',
  CENTER = 'Center',
  LEAN_RIGHT = 'Lean Right',
  RIGHT = 'Right'
}

export interface Source {
  id: string;
  name: string;
  domain: string;
  bias: BiasRating;
}

export interface Entities {
  people: string[];
  places: string[];
  organizations: string[];
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: Source;
  entities: Entities;
}

export interface NewsCluster {
  id: string;
  topicLabel: string;
  keywords: string[];
  summary: string; // For ClusterCard preview
  summaries: {
    left: string | null;
    center: string | null;
    right: string | null;
  };
  articles: Article[];
  biasDistribution: {
    left: number;
    center: number;
    right: number;
  };
  totalSources: number;
  lastUpdated: string;
}

export interface PoliticalBlindspot {
  bias: BiasRating;
  score: number; // 0-100, how much you're missing out
  recentTopics: string[];
}