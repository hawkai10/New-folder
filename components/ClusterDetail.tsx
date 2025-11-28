import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (cluster.summaries?.center) {
      setActiveSummary('center');
    } else if (cluster.summaries?.left) {
      setActiveSummary('left');
    } else if (cluster.summaries?.right) {
      setActiveSummary('right');
    }
  }, [cluster.summaries]);

  const filteredArticles = cluster.articles.filter(article => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Left') return article.source.bias === BiasRating.LEFT || article.source.bias === BiasRating.LEAN_LEFT;
    if (activeTab === 'Right') return article.source.bias === BiasRating.RIGHT || article.source.bias === BiasRating.LEAN_RIGHT;
    if (activeTab === 'Center') return article.source.bias === BiasRating.CENTER;
    return true;
  });

  const getArticleCountByBias = (bias: 'Left' | 'Center' | 'Right') => {
    if (bias === 'Left') {
      return cluster.articles.filter(a => a.source.bias === BiasRating.LEFT || a.source.bias === BiasRating.LEAN_LEFT).length;
    }
    if (bias === 'Right') {
      return cluster.articles.filter(a => a.source.bias === BiasRating.RIGHT || a.source.bias === BiasRating.LEAN_RIGHT).length;
    }
    return cluster.articles.filter(a => a.source.bias === BiasRating.CENTER).length;
  };

  const isSummaryAvailable = (bias: 'left' | 'center' | 'right'): boolean => {
    return !!(cluster.summaries && cluster.summaries[bias]);
  };

  const getDominantBias = (): string => {
    const { left, center, right } = cluster.biasDistribution;
    const max = Math.max(left, center, right);
    if (max === left) return 'Left-Leaning';
    if (max === right) return 'Right-Leaning';
    return 'Balanced';
  };

  const aggregateEntities = () => {
    const peopleSet = new Set<string>();
    const orgsSet = new Set<string>();
    
    cluster.articles.forEach(article => {
      article.entities.people.forEach(p => peopleSet.add(p));
      article.entities.organizations.forEach(o => orgsSet.add(o));
    });
    
    return {
      people: Array.from(peopleSet).slice(0, 8),
      organizations: Array.from(orgsSet).slice(0, 6)
    };
  };

  const entities = aggregateEntities();

  const getBiasColor = (bias: BiasRating) => {
    switch (bias) {
      case BiasRating.LEFT:
      case BiasRating.LEAN_LEFT: return 'bg-bias-left text-white';
      case BiasRating.RIGHT:
      case BiasRating.LEAN_RIGHT: return 'bg-bias-right text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs text-gray-500 mb-8 font-medium border-b border-gray-200 pb-4">
        <button onClick={onBack} className="hover:text-black flex items-center group">
          <div className="p-1 bg-gray-100 rounded-full mr-2 group-hover:bg-gray-200"><ICONS.Back size={14} /></div>
          Back to Feed
        </button>
        <span className="mx-3 text-gray-300">/</span>
        <span className="text-gray-900 font-bold truncate max-w-xs">{cluster.topicLabel}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* LEFT MAIN COLUMN */}
        <div className="lg:col-span-8">
          <h1 className="font-serif font-black text-3xl md:text-5xl text-gray-900 leading-tight mb-6">
            {cluster.topicLabel}
          </h1>

          <div className="flex items-center space-x-3 mb-8">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                getDominantBias().includes('Left') ? 'border-blue-200 bg-blue-50 text-bias-left' : 
                getDominantBias().includes('Right') ? 'border-red-200 bg-red-50 text-bias-right' : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
                {getDominantBias()} Coverage
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-bold text-gray-500">{cluster.totalSources} Sources</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-bold text-gray-500">{formatDate(cluster.lastUpdated)}</span>
          </div>

          {/* AI Summary Section */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden mb-10">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ICONS.Code size={16} className="text-purple-600" />
                    <span className="text-sm font-bold text-gray-900">AI Summary</span>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    {(['left', 'center', 'right'] as const).map((bias) => (
                      <button
                        key={bias}
                        onClick={() => setActiveSummary(bias)}
                        disabled={!isSummaryAvailable(bias)}
                        className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                          activeSummary === bias
                            ? bias === 'left' ? 'bg-bias-left text-white shadow-sm' :
                              bias === 'right' ? 'bg-bias-right text-white shadow-sm' : 'bg-gray-800 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        } ${!isSummaryAvailable(bias) ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        {bias}
                      </button>
                    ))}
                </div>
            </div>
            <div className="p-8">
              {cluster.summaries?.[activeSummary] ? (
                <p className="text-gray-700 text-lg leading-loose font-serif">
                  {cluster.summaries[activeSummary]}
                </p>
              ) : (
                <div className="text-center py-8 text-gray-400 italic">
                  Not enough sources from this perspective to generate a summary.
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                <button className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1">
                    <ICONS.Flag size={12} /> Report Issue
                </button>
            </div>
          </div>

          {/* Feed Filter */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-6 sticky top-20 bg-brand-gray z-10 py-2">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('All')}
                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'All' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                All ({cluster.articles.length})
              </button>
              <button
                onClick={() => setActiveTab('Left')}
                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'Left' ? 'border-bias-left text-bias-left' : 'border-transparent text-gray-500 hover:text-bias-left'
                }`}
              >
                Left ({getArticleCountByBias('Left')})
              </button>
              <button
                onClick={() => setActiveTab('Center')}
                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'Center' ? 'border-gray-500 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Center ({getArticleCountByBias('Center')})
              </button>
              <button
                onClick={() => setActiveTab('Right')}
                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'Right' ? 'border-bias-right text-bias-right' : 'border-transparent text-gray-500 hover:text-bias-right'
                }`}
              >
                Right ({getArticleCountByBias('Right')})
              </button>
            </div>
          </div>

          {/* Article Cards */}
          <div className="space-y-4">
            {filteredArticles.map(article => (
              <a 
                key={article.id}
                href={article.url} 
                target="_blank" 
                rel="noreferrer"
                className="block bg-white border border-brand-border p-6 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${getBiasColor(article.source.bias)}`}>
                                {article.source.bias}
                            </span>
                            <span className="text-xs font-bold text-gray-900">{article.source.name}</span>
                            <span className="text-xs text-gray-400">• {formatDate(article.publishedAt)}</span>
                        </div>
                        <h3 className="font-serif font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                            {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{article.summary}</p>
                    </div>
                    <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <ICONS.Link size={16} />
                    </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-brand-border shadow-sm sticky top-24">
            <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Bias Distribution</h3>
            
            <BiasMeter distribution={cluster.biasDistribution} height="h-4" />
            <div className="flex justify-between mt-3 mb-6">
                <div className="text-center">
                    <div className="text-2xl font-black text-bias-left">{cluster.biasDistribution.left}%</div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Left</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-gray-400">{cluster.biasDistribution.center}%</div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Center</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-bias-right">{cluster.biasDistribution.right}%</div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Right</div>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Coverage Sources</h4>
                <div className="flex flex-wrap gap-2">
                    {cluster.articles.map((article, i) => (
                        <div key={i} className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            article.source.bias.includes('Left') ? 'bg-blue-50 border-blue-100 text-blue-700' :
                            article.source.bias.includes('Right') ? 'bg-red-50 border-red-100 text-red-700' :
                            'bg-gray-50 border-gray-100 text-gray-700'
                        }`}>
                            {article.source.name}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterDetail;