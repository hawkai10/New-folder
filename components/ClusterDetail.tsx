import React, { useState, useEffect } from 'react';
import ArticleCard from './ArticleCard';
import BiasMeter from './BiasMeter';
import { NewsCluster, BiasRating } from '../types';
import { ICONS } from '../constants';

interface ClusterDetailProps {
  cluster: NewsCluster;
  onBack: () => void;
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster, onBack }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Left' | 'Center' | 'Right'>('All');
  const [activeSummary, setActiveSummary] = useState<'left' | 'center' | 'right'>('center');

  // Set initial summary view based on availability
  useEffect(() => {
    if (cluster.summaries.center) {
      setActiveSummary('center');
    } else if (cluster.summaries.left) {
      setActiveSummary('left');
    } else if (cluster.summaries.right) {
      setActiveSummary('right');
    }
  }, [cluster.summaries]);

  // Filter articles based on tab
  const filteredArticles = cluster.articles.filter(article => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Left') return article.source.bias === BiasRating.LEFT || article.source.bias === BiasRating.LEAN_LEFT;
    if (activeTab === 'Right') return article.source.bias === BiasRating.RIGHT || article.source.bias === BiasRating.LEAN_RIGHT;
    if (activeTab === 'Center') return article.source.bias === BiasRating.CENTER;
    return true;
  });

  const getBiasColor = (bias: BiasRating) => {
    switch (bias) {
        case BiasRating.LEFT:
        case BiasRating.LEAN_LEFT: return 'bg-blue-600';
        case BiasRating.RIGHT:
        case BiasRating.LEAN_RIGHT: return 'bg-red-600';
        default: return 'bg-gray-400';
    }
  };

  const getBiasLabel = (bias: BiasRating) => {
      // Normalize internal enum to UI display string
      return bias; 
  };

  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
      return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      
      {/* Back Button */}
      <div className="mb-8">
        <button 
            onClick={onBack}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 group"
        >
            <ICONS.Back size={16} className="mr-1 group-hover:-translate-x-1 transition-transform"/>
            Back to all stories
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT MAIN COLUMN */}
        <div className="lg:col-span-8">
            
            {/* Title */}
            <h1 className="font-serif font-bold text-3xl md:text-5xl text-gray-900 leading-tight mb-6">
                {cluster.topicLabel}
            </h1>

            {/* Bias Summary Selector */}
            <div className="flex items-center space-x-2 mb-8">
                <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs font-bold">
                    {(['left', 'center', 'right'] as const).map((bias) => (
                        <button
                            key={bias}
                            onClick={() => setActiveSummary(bias)}
                            disabled={!cluster.summaries[bias]}
                            className={`px-4 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                activeSummary === bias
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {bias.charAt(0).toUpperCase() + bias.slice(1)} Perspective
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="prose prose-lg text-gray-700 mb-8 leading-relaxed bg-gray-50 p-6 rounded-md">
                <ul className="list-disc pl-5 space-y-3">
                    {cluster.summaries[activeSummary] ? (
                        cluster.summaries[activeSummary]?.split('. ').filter(s => s.length > 10).map((sentence, idx) => (
                            <li key={idx}>{sentence.replace(/\.$/, '')}.</li>
                        ))
                    ) : (
                        <p className="text-gray-500 italic">A summary for this perspective is not available due to an insufficient number of articles.</p>
                    )}
                </ul>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400 mb-12">
                <span className="font-medium text-gray-600">
                    Showing {filteredArticles.length} of {cluster.articles.length} total articles
                </span>
                <span>Last updated: {formatDate(cluster.lastUpdated)}</span>
            </div>

            {/* Article List */}
            <div className="space-y-8">
                {filteredArticles.map(article => (
                    <div key={article.id} className="bg-white p-5 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-center mb-3">
                            <span className={`w-2 h-2 rounded-full mr-2 ${getBiasColor(article.source.bias)}`}></span>
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{article.source.name}</span>
                            <span className="text-gray-400 mx-2">•</span>
                            <span className="text-xs text-gray-500">{formatDate(article.publishedAt)}</span>
                        </div>
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                            <h3 className="font-serif font-bold text-xl text-gray-900 leading-tight mb-2 hover:text-blue-700 transition-colors">
                                {article.title}
                            </h3>
                        </a>
                        <p className="text-sm text-gray-600 leading-relaxed mb-4">
                            {article.summary}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {article.entities.people.slice(0, 3).map((p, i) => (
                                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                    {p}
                                </span>
                            ))}
                            {article.entities.organizations.slice(0, 2).map((o, i) => (
                                <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded">
                                    {o}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-4">
            <div className="sticky top-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
                    <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Bias Distribution</h3>
                    <BiasMeter 
                        distribution={cluster.biasDistribution} 
                        totalSources={cluster.totalSources} 
                        showLabels={true}
                    />
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
                    <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Filter Articles</h3>
                    <div className="flex flex-col space-y-2">
                        {['All', 'Left', 'Center', 'Right'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`text-left text-sm font-medium p-2 rounded transition-colors ${
                                    activeTab === tab ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {tab} Perspectives
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Key Entities</h3>
                    <div className="space-y-3">
                        {/* Aggregate and display top entities */}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterDetail;