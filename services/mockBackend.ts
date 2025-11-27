import { NewsCluster, Article, BiasRating } from '../types';

const API_URL = ''; // Relative path because of Vite proxy

// Transform server response to match frontend types
const transformServerResponse = (serverData: any): NewsCluster[] => {
  if (!serverData || !serverData.clusters) {
    return [];
  }

  return serverData.clusters.map((serverCluster: any) => {
    // Transform articles
    const articles: Article[] = (serverCluster.articles || []).map((serverArticle: any) => {
      // Parse entities JSON string
      let entities = { people: [], places: [], organizations: [] };
      if (serverArticle.entities) {
        try {
          const parsed = typeof serverArticle.entities === 'string' 
            ? JSON.parse(serverArticle.entities) 
            : serverArticle.entities;
          
          // Map server entity types to frontend types
          entities = {
            people: parsed.PERSON || [],
            places: parsed.LOCATION || [],
            organizations: parsed.ORGANIZATION || []
          };
        } catch (e) {
          console.warn("Failed to parse entities:", e);
        }
      }

      // Map bias to BiasRating enum
      const biasMap: { [key: string]: BiasRating } = {
        'Lean Left': BiasRating.LEAN_LEFT,
        'Center': BiasRating.CENTER,
        'Lean Right': BiasRating.LEAN_RIGHT,
        'Left': BiasRating.LEFT,
        'Right': BiasRating.RIGHT,
      };

      return {
        id: `${serverCluster.id}-${serverArticle.id}`,
        title: serverArticle.title,
        summary: serverArticle.summary || '',
        url: serverArticle.url,
        publishedAt: serverArticle.published_date || new Date().toISOString(),
        source: {
          id: serverArticle.source,
          name: serverArticle.source,
          bias: biasMap[serverArticle.bias] || BiasRating.CENTER,
          domain: new URL(serverArticle.url).hostname
        },
        entities
      };
    });

    // Map bias distribution from server format
    const bias = serverCluster.bias_distribution || {
      lean_left: 0,
      center: 0,
      lean_right: 0,
      total: 0
    };

    const total = bias.total || 1; // Avoid division by zero
    
    // Use generated label if available, otherwise use first article title as fallback
    let topicLabel = serverCluster.label;
    if (!topicLabel && articles.length > 0) {
      topicLabel = articles[0].title;
    }
    if (!topicLabel) {
      topicLabel = `Topic ${serverCluster.id}`;
    }
    
    // Extract summaries from the backend response
    const summaries = {
      left: serverCluster.summaries?.lean_left || null,
      center: serverCluster.summaries?.center || null,
      right: serverCluster.summaries?.lean_right || null,
    };

    return {
      id: `cluster-${serverCluster.id}`,
      topicLabel: topicLabel,
      keywords: [], // Could be extracted from label
      summary: summaries.center || summaries.left || summaries.right || articles.map(a => a.title).join(' | ').substring(0, 200), // Fallback for card view
      summaries,
      articles,
      biasDistribution: {
        left: Math.round((bias.lean_left / total) * 100) || 0,
        center: Math.round((bias.center / total) * 100) || 0,
        right: Math.round((bias.lean_right / total) * 100) || 0
      },
      totalSources: new Set(articles.map(a => a.source.name)).size,
      lastUpdated: new Date().toISOString()
    };
  });
};

export const fetchNewsFeed = async (): Promise<NewsCluster[]> => {
  try {
    // We use the relative path '/clusters' so Vite proxies it to localhost:8000
    // If we used absolute URL, we might hit CORS issues if backend doesn't handle it.
    const response = await fetch(`/clusters`);
    
    if (!response.ok) {
        throw new Error(`Backend Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Received from backend:", data);
    
    // Transform the server response to match frontend types
    const clusters = transformServerResponse(data);
    
    if (clusters.length === 0) {
      console.warn("No clusters returned from backend");
    }
    
    return clusters;
    
  } catch (error) {
    console.error("Failed to connect to backend:", error);
    throw error;
  }
};