import React from 'react';
import { NewsCluster } from '../types';
import { ICONS } from '../constants';

interface ClusterCardProps {
  cluster: NewsCluster;
  onClick?: () => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onClick }) => {
  if (!cluster) return null;

  return (
    <div 
        onClick={onClick}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-8 group cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Mock Image Placeholder since we don't have real images from RSS */}
      <div className="h-48 bg-gradient-to-r from-gray-800 to-gray-700 relative flex items-center justify-center">
        <span className="text-gray-400 font-serif italic text-lg opacity-20">News Imagery</span>
        <div className="absolute bottom-3 left-3 flex items-center space-x-2">
             <span className="bg-white/90 text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                Daily Briefing
             </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
            <span>{cluster.articles.length} stories</span>
            <span>•</span>
            <span>{cluster.totalSources} articles</span>
            <span>•</span>
            <span>3m read</span>
        </div>

        <h2 className="font-serif font-bold text-2xl text-gray-900 leading-tight mb-3 group-hover:text-blue-700 transition-colors">
            {cluster.topicLabel}
        </h2>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
            {cluster.summary}
        </p>
        
        {/* NER Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
            {cluster.articles[0]?.entities?.people && cluster.articles[0].entities.people.length > 0 ? (
                cluster.articles[0].entities.people.slice(0, 2).map((p, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                        {p}
                    </span>
                ))
            ) : (
                <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-1 rounded">
                    No entities found
                </span>
            )}
        </div>

        <div className="border-t border-gray-100 pt-3">
             {/* Use the new styled Bias Bar manually here to match the hero look */}
             <div className="flex w-full h-6 rounded overflow-hidden relative">
                <div className="bg-bias-left flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${cluster.biasDistribution.left}%` }}>
                    {cluster.biasDistribution.left > 15 && `Left ${cluster.biasDistribution.left}%`}
                </div>
                <div className="bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600" style={{ width: `${cluster.biasDistribution.center}%` }}>
                    {cluster.biasDistribution.center > 15 && `C ${cluster.biasDistribution.center}%`}
                </div>
                <div className="bg-bias-right flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${cluster.biasDistribution.right}%` }}>
                    {cluster.biasDistribution.right > 15 && `Right ${cluster.biasDistribution.right}%`}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterCard;