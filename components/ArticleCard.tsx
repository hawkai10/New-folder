import React from 'react';
import { NewsCluster } from '../types';
import BiasMeter from './BiasMeter';

interface ArticleCardProps {
  cluster: NewsCluster;
  compact?: boolean;
  onClick?: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ cluster, compact, onClick }) => {
  return (
    <div 
        onClick={onClick}
        className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 group cursor-pointer"
    >
      <div className="mb-2">
        <span className="text-xs font-semibold text-gray-600">
            {cluster.articles[0]?.source.name || "Unknown Source"}
        </span>
        {cluster.articles[0]?.entities.places[0] && (
             <span className="text-xs text-gray-400 ml-2">
                • {cluster.articles[0].entities.places[0]}
             </span>
        )}
      </div>

      <h3 className="font-bold text-lg text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
        {cluster.topicLabel}
      </h3>

      <div className="mb-1">
        <BiasMeter 
            distribution={cluster.biasDistribution} 
            totalSources={cluster.totalSources} 
        />
      </div>
    </div>
  );
};

export default ArticleCard;