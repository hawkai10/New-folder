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
    if (cluster.summaries?.center) {
      setActiveSummary('center');
    } else if (cluster.summaries?.left) {
      setActiveSummary('left');
    } else if (cluster.summaries?.right) {
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

  // Calculate count by bias
  const getArticleCountByBias = (bias: 'Left' | 'Center' | 'Right') => {
    if (bias === 'Left') {
      return cluster.articles.filter(a => a.source.bias === BiasRating.LEFT || a.source.bias === BiasRating.LEAN_LEFT).length;
    }
    if (bias === 'Right') {
      return cluster.articles.filter(a => a.source.bias === BiasRating.RIGHT || a.source.bias === BiasRating.LEAN_RIGHT).length;
    }
    return cluster.articles.filter(a => a.source.bias === BiasRating.CENTER).length;
  };

  // Check if summary is available
  const isSummaryAvailable = (bias: 'left' | 'center' | 'right'): boolean => {
    return !!(cluster.summaries && cluster.summaries[bias]);
  };

  // Get the dominant bias
  const getDominantBias = (): string => {
    const { left, center, right } = cluster.biasDistribution;
    const max = Math.max(left, center, right);
    if (max === left) return 'Left-Leaning';
    if (max === right) return 'Right-Leaning';
    return 'Balanced/Center';
  };

  // Aggregate entities from all articles
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
      case BiasRating.LEAN_LEFT: return 'bg-blue-600';
      case BiasRating.RIGHT:
      case BiasRating.LEAN_RIGHT: return 'bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  const getBiasLabel = (bias: BiasRating) => {
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
      {/* Breadcrumb & Top Meta */}
      <div className="flex items-center text-xs text-gray-500 mb-6 space-x-2 font-medium">
        <button onClick={onBack} className="hover:text-black flex items-center">
          <ICONS.Back size={14} className="mr-1" />
          Home
        </button>
        <span>•</span>
        <span>Published {formatDate(cluster.lastUpdated)}</span>
        <span>•</span>
        <span>Updated just now</span>
        <div className="flex-1"></div>
        <div className="flex space-x-3 text-gray-400">
          <ICONS.Share size={16} className="hover:text-black cursor-pointer" />
          <ICONS.Bookmark size={16} className="hover:text-black cursor-pointer" />
          <ICONS.Print size={16} className="hover:text-black cursor-pointer" />
          <ICONS.Mail size={16} className="hover:text-black cursor-pointer" />
          <ICONS.Code size={16} className="hover:text-black cursor-pointer" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* LEFT MAIN COLUMN */}
        <div className="lg:col-span-8">
          {/* Title */}
          <h1 className="font-serif font-bold text-3xl md:text-5xl text-gray-900 leading-tight mb-6">
            {cluster.topicLabel}
          </h1>

          {/* Overall Bias Indicator */}
          <div className="flex items-center space-x-2 mb-6">
            <div className="flex items-center px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
              <span className="text-xs font-bold text-gray-600 mr-2">Story Bias:</span>
              <span className={`text-xs font-bold ${
                getDominantBias().includes('Left') ? 'text-blue-600' : 
                getDominantBias().includes('Right') ? 'text-red-600' : 'text-gray-700'
              }`}>
                {getDominantBias()}
              </span>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
              <ICONS.Eye size={14} className="mr-1 text-gray-600" />
              <span className="text-xs font-bold text-gray-700">{cluster.totalSources} Sources</span>
            </div>
          </div>

          {/* Bias Summary Selector */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs font-bold">
                {(['left', 'center', 'right'] as const).map((bias) => (
                  <button
                    key={bias}
                    onClick={() => setActiveSummary(bias)}
                    disabled={!isSummaryAvailable(bias)}
                    className={`px-4 py-2 transition-colors border-r border-gray-200 last:border-r-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeSummary === bias
                        ? bias === 'left' ? 'bg-blue-600 text-white' :
                          bias === 'right' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {bias.charAt(0).toUpperCase() + bias.slice(1)} Perspective
                  </button>
                ))}
              </div>
              <button className="flex items-center text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors">
                <ICONS.Info size={14} className="mr-1" />
                Bias Comparison
              </button>
            </div>

            {/* Summary Content */}
            <div className="prose prose-lg text-gray-700 mb-4 leading-relaxed bg-gray-50 p-6 rounded-lg border border-gray-200">
              {cluster.summaries?.[activeSummary] ? (
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {cluster.summaries[activeSummary]}
                </p>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> A summary for this perspective is not available due to an insufficient number of articles from {activeSummary}-leaning sources.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-400 mb-8">
            <div className="flex items-center">
              <ICONS.Info size={14} className="mr-1" />
              Insights by Ground AI
            </div>
            <button className="flex items-center hover:text-gray-600">
              <ICONS.Flag size={14} className="mr-1" />
              Does this summary seem wrong?
            </button>
          </div>

          {/* Article Filter Tabs */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-1">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('All')}
                className={`text-sm font-bold pb-3 border-b-2 transition-colors ${
                  activeTab === 'All'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {cluster.articles.length} Articles
              </button>
              <button
                onClick={() => setActiveTab('Left')}
                className={`text-sm font-bold pb-3 border-b-2 transition-colors ${
                  activeTab === 'Left'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-blue-600'
                }`}
              >
                Left ({getArticleCountByBias('Left')})
              </button>
              <button
                onClick={() => setActiveTab('Center')}
                className={`text-sm font-bold pb-3 border-b-2 transition-colors ${
                  activeTab === 'Center'
                    ? 'border-gray-500 text-gray-800'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Center ({getArticleCountByBias('Center')})
              </button>
              <button
                onClick={() => setActiveTab('Right')}
                className={`text-sm font-bold pb-3 border-b-2 transition-colors ${
                  activeTab === 'Right'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-red-600'
                }`}
              >
                Right ({getArticleCountByBias('Right')})
              </button>
            </div>

            <div className="flex space-x-2 text-gray-400 pb-2">
              <ICONS.Search size={18} className="cursor-pointer hover:text-black" />
              <ICONS.Filter size={18} className="cursor-pointer hover:text-black" />
            </div>
          </div>

          {/* Article List */}
          <div className="space-y-4">
            {filteredArticles.map(article => (
              <div
                key={article.id}
                className="bg-gray-50 border border-transparent hover:border-gray-300 hover:bg-white p-5 rounded-lg transition-all duration-200 group"
              >
                {/* Article Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                      {article.source.name.substring(0, 2)}
                    </div>
                    <span className="text-xs font-bold text-gray-900">{article.source.name}</span>

                    {/* Bias Badge */}
                    <span className={`flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white ${getBiasColor(article.source.bias)}`}>
                      {getBiasLabel(article.source.bias)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(article.publishedAt)}</span>
                </div>

                {/* Content */}
                <a href={article.url} target="_blank" rel="noreferrer" className="block">
                  <h3 className="font-serif font-bold text-xl text-gray-900 mb-2 group-hover:underline decoration-2 underline-offset-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.summary}</p>
                </a>

                {/* Entity Tags */}
                <div className="flex flex-wrap gap-2">
                  {article.entities.people.slice(0, 3).map((p, i) => (
                    <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {p}
                    </span>
                  ))}
                  {article.entities.organizations.slice(0, 2).map((o, i) => (
                    <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          {/* Coverage Details Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Coverage Summary</h3>
            
            {/* Quick Stats */}
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Articles</span>
                <span className="font-bold text-gray-900">{cluster.articles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">News Sources</span>
                <span className="font-bold text-gray-900">{cluster.totalSources}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <span className="text-gray-600">Leaning Left</span>
                <span className="font-bold text-blue-600">{getArticleCountByBias('Left')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Center</span>
                <span className="font-bold text-gray-700">{getArticleCountByBias('Center')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Leaning Right</span>
                <span className="font-bold text-red-600">{getArticleCountByBias('Right')}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <span className="text-gray-600">Overall Bias</span>
                <span className={`font-bold ${
                  getDominantBias().includes('Left') ? 'text-blue-600' : 
                  getDominantBias().includes('Right') ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {getDominantBias()}
                </span>
              </div>
            </div>

            {/* Bias Visualization Bar */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center">
                Bias Distribution
                <ICONS.ArrowUpRight size={10} className="ml-1" />
              </h4>
              <div className="flex w-full h-8 rounded-md overflow-hidden text-[10px] font-bold text-white mb-4">
                <div
                  className="bg-blue-600 flex items-center justify-center"
                  style={{ width: `${cluster.biasDistribution.left}%` }}
                >
                  {cluster.biasDistribution.left > 10 && `${Math.round(cluster.biasDistribution.left)}%`}
                </div>
                <div
                  className="bg-gray-300 text-gray-700 flex items-center justify-center"
                  style={{ width: `${cluster.biasDistribution.center}%` }}
                >
                  {cluster.biasDistribution.center > 10 && `${Math.round(cluster.biasDistribution.center)}%`}
                </div>
                <div
                  className="bg-red-600 flex items-center justify-center"
                  style={{ width: `${cluster.biasDistribution.right}%` }}
                >
                  {cluster.biasDistribution.right > 10 && `${Math.round(cluster.biasDistribution.right)}%`}
                </div>
              </div>
            </div>

            {/* Source Bubbles */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-500 mb-2">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {cluster.articles.slice(0, 12).map((article, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white text-[9px] font-bold uppercase overflow-hidden shadow-sm ${
                      article.source.bias.includes("Left")
                        ? "border-blue-400 text-blue-800"
                        : article.source.bias.includes("Right")
                        ? "border-red-400 text-red-800"
                        : "border-gray-300 text-gray-700"
                    }`}
                    title={article.source.name}
                  >
                    {article.source.name.substring(0, 1)}
                  </div>
                ))}
                {cluster.totalSources > 12 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-600">
                    +{cluster.totalSources - 12}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Key Entities Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Key Entities</h3>
            
            {entities.people.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-500 mb-2">People</h4>
                <div className="flex flex-wrap gap-2">
                  {entities.people.map((person, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 cursor-pointer transition-colors">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {entities.organizations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2">Organizations</h4>
                <div className="flex flex-wrap gap-2">
                  {entities.organizations.map((org, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded hover:bg-purple-100 cursor-pointer transition-colors">
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Article Filter Quick Access */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Filter Articles</h3>
            <div className="space-y-2">
              {['All', 'Left', 'Center', 'Right'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`w-full text-left text-sm font-medium p-3 rounded-lg transition-colors ${
                    activeTab === tab 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{tab} Perspectives</span>
                    <span className="text-xs">
                      {tab === 'All' ? cluster.articles.length : getArticleCountByBias(tab as any)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterDetail;
