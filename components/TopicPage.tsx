import React from 'react';
import ArticleCard from './ArticleCard';
import { NewsCluster } from '../types';
import { ICONS } from '../constants';

interface TopicPageProps {
  topic: string;
  clusters: NewsCluster[];
  onClusterClick: (cluster: NewsCluster) => void;
  onBack: () => void;
}

const TopicPage: React.FC<TopicPageProps> = ({ topic, clusters, onClusterClick, onBack }) => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 animate-in fade-in duration-500">
      
      {/* Breadcrumb */}
      <div className="flex items-center text-xs text-gray-500 mt-6 mb-6 font-medium">
        <button onClick={onBack} className="hover:text-black">Home</button>
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-gray-900">Interest</span>
        <span className="mx-2 text-gray-300">/</span>
        <span className="text-gray-900 font-bold">{topic}</span>
      </div>

      {/* Header Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-bl-full -z-0 opacity-50"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="font-serif font-black text-3xl md:text-5xl text-gray-900 leading-tight mb-2">
                    {topic}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                    <span>{clusters.length} Stories</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>Updated just now</span>
                </div>
            </div>
            
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-black text-black text-sm font-bold rounded-full hover:bg-black hover:text-white transition-all uppercase tracking-wide">
                <ICONS.Check size={16} />
                Follow
            </button>
        </div>
      </div>

      {/* Feed Filter (Optional visual flair) */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-xl text-gray-900">Top Stories</h2>
        <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-100 rounded text-gray-500"><ICONS.Filter size={18} /></button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {clusters.length > 0 ? (
              clusters.map(cluster => (
                <div key={cluster.id} className="h-full">
                     <ArticleCard 
                        cluster={cluster} 
                        variant="standard" // Or a specific 'topic-card' variant if desired
                        onClick={() => onClusterClick(cluster)}
                    />
                </div>
              ))
          ) : (
              <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <ICONS.Newspaper className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500 font-medium">No recent stories found for "{topic}"</p>
                  <p className="text-sm text-gray-400 mt-2">Try checking back later.</p>
              </div>
          )}
      </div>

    </div>
  );
};

export default TopicPage;