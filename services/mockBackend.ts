import { NewsCluster, Article, BiasRating } from '../types';
import keywordsData from '../keywords.json';

const API_URL = ''; // Relative path because of Vite proxy

// Generate a stateless stateless image URL using a proxy service
const getStatelessImageUrl = (articleUrl: string): string => {
  // We use Microlink API to extract the image on-the-fly.
  // This avoids storing images in the DB.
  // We encode the URL to ensure it passes safely.
  const encodedUrl = encodeURIComponent(articleUrl);
  return `https://api.microlink.io/?url=${encodedUrl}&screenshot=false&meta=true&embed=image.url`;
};

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

      const articleUrl = serverArticle.url;
      // Use provided image or generate a stateless one
      const imageUrl = serverArticle.top_image || serverArticle.image_url || getStatelessImageUrl(articleUrl);

      return {
        id: `${serverCluster.id}-${serverArticle.id}`,
        title: serverArticle.title,
        summary: serverArticle.summary || '',
        url: articleUrl,
        publishedAt: serverArticle.published_date || new Date().toISOString(),
        imageUrl: imageUrl,
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

    // Parse keywords from comma-separated string to array
    const keywords: string[] = serverCluster.keywords 
      ? serverCluster.keywords.split(',').map((k: string) => k.trim()) 
      : [];
    
    // Extract summaries from the backend response
    const summaries = {
      left: serverCluster.summaries?.lean_left || null,
      center: serverCluster.summaries?.center || null,
      right: serverCluster.summaries?.lean_right || null,
    };

    // Calculate lastUpdated based on the most recent article
    let lastUpdated = new Date().toISOString();
    if (articles.length > 0) {
      const timestamps = articles.map(a => new Date(a.publishedAt).getTime());
      const maxTimestamp = Math.max(...timestamps);
      lastUpdated = new Date(maxTimestamp).toISOString();
    }

    return {
      id: `cluster-${serverCluster.id}`,
      topicLabel: topicLabel,
      keywords: keywords, 
      summary: summaries.center || summaries.left || summaries.right || articles.map(a => a.title).join(' | ').substring(0, 200), // Fallback for card view
      summaries,
      articles,
      biasDistribution: {
        left: Math.round((bias.lean_left / total) * 100) || 0,
        center: Math.round((bias.center / total) * 100) || 0,
        right: Math.round((bias.lean_right / total) * 100) || 0
      },
      totalSources: new Set(articles.map(a => a.source.name)).size,
      lastUpdated: lastUpdated
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

// Simulate fetching keywords from keywords.db
export const fetchKeywords = async (): Promise<{ [key: string]: string[] }> => {
  // In a real app, this would hit /keywords endpoint
  // For now, we use the imported JSON file
  return new Promise((resolve) => {
      setTimeout(() => {
          // Return the full object structure instead of flattening it
          resolve(keywordsData);
      }, 300);
  });
};