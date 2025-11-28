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

  // Initialize summary selection based on availability
  useEffect(() => {
    if (cluster.summaries?.center) setActiveSummary('center');
    else if (cluster.summaries?.left) setActiveSummary('left');
    else if (cluster.summaries?.right) setActiveSummary('right');
  }, [cluster.summaries]);

  // Filter articles based on selected tab
  const filteredArticles = cluster.articles.filter(article => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Left') return article.source.bias === BiasRating.LEFT || article.source.bias === BiasRating.LEAN_LEFT;
    if (activeTab === 'Right') return article.source.bias === BiasRating.RIGHT || article.source.bias === BiasRating.LEAN_RIGHT;
    if (activeTab === 'Center') return article.source.bias === BiasRating.CENTER;
    return true;
  });

  // Helpers for counts
  const getArticleCountByBias = (bias: 'Left' | 'Center' | 'Right') => {
    if (bias === 'Left') return cluster.articles.filter(a => a.source.bias === BiasRating.LEFT || a.source.bias === BiasRating.LEAN_LEFT).length;
    if (bias === 'Right') return cluster.articles.filter(a => a.source.bias === BiasRating.RIGHT || a.source.bias === BiasRating.LEAN_RIGHT).length;
    return cluster.articles.filter(a => a.source.bias === BiasRating.CENTER).length;
  };

  const isSummaryAvailable = (bias: 'left' | 'center' | 'right') => !!(cluster.summaries && cluster.summaries[bias]);

  const getDominantBias = () => {
    const { left, center, right } = cluster.biasDistribution;
    const max = Math.max(left, center, right);
    if (max === left) return 'Left-Leaning';
    if (max === right) return 'Right-Leaning';
    return 'Balanced';
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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-2 pb-3 animate-in fade-in duration-500 font-sans">
      
      {/* --- Breadcrumb & Actions --- */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
        <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide group"
        >
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
               <ICONS.Back size={14} />
            </div>
            Back to Feed
        </button>
        
        <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all">
                <ICONS.Share size={18} />
            </button>
            <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all">
                <ICONS.Bookmark size={18} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* === LEFT MAIN CONTENT === */}
        <div className="lg:col-span-8">
          
          {/* Header */}
          <div className="mb-2">
            <div className="flex items-center gap-3 mb-4">
               <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Trending
               </span>
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                   <span className="flex items-center gap-1">
                       <ICONS.Map size={14} /> Global
                   </span>
                   <span className="text-gray-300">•</span>
                   <span>{formatDate(cluster.lastUpdated)}</span>
               </div>
            </div>
            
            <h1 className="font-serif font-black text-3xl md:text-5xl text-gray-900 leading-tight mb-6">
              {cluster.topicLabel}
            </h1>
          </div>

          {/* === AI Summary Card === */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-10 ring-1 ring-black/5">
            {/* Header: Tabs & Bias Comparison */}
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              {/* Custom Segmented Control */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['left', 'center', 'right'] as const).map((bias) => (
                  <button
                    key={bias}
                    onClick={() => setActiveSummary(bias)}
                    disabled={!isSummaryAvailable(bias)}
                    className={`
                      px-4 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all
                      ${activeSummary === bias
                        ? 'bg-white text-black shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-800'
                      }
                      ${!isSummaryAvailable(bias) ? 'opacity-40 cursor-not-allowed' : ''}
                    `}
                  >
                    {bias}
                  </button>
                ))}
              </div>
              <button className="hidden sm:block text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  Bias Comparison
              </button>
            </div>
            
            {/* Summary Content */}
            <div className="p-6 md:p-8">
              {cluster.summaries?.[activeSummary] ? (
                <div className="animate-in fade-in">
                  <ul className="space-y-3 list-disc list-inside text-gray-800 text-[16px] leading-relaxed font-serif">
                    {cluster.summaries[activeSummary]
                      .split(/(?<=\.)\s+/) // Split sentences while keeping period
                      .filter(s => s.trim().length > 0)
                      .map((point, index) => (
                        <li key={index} className="pl-2">{point}</li>
                      ))}
                  </ul>
                  <div className="mt-6 text-right text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Summarized from {
                      activeSummary === 'left' ? getArticleCountByBias('Left') :
                      activeSummary === 'right' ? getArticleCountByBias('Right') :
                      getArticleCountByBias('Center')
                    } sources
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                  <ICONS.Info size={24} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No summary available for this perspective.</p>
                  <p className="text-xs text-gray-400 mt-1">Select another bias tab to see its summary.</p>
                </div>
              )}
            </div>
          </div>

          {/* === FEED FILTER TABS === */}
          <div className="sticky top-0 bg-brand-gray z-20 pt-2 pb-4 mb-2">
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                    {cluster.articles.length} Articles
                </span>
                <div className="h-6 w-px bg-gray-200"></div>
                <button
                    onClick={() => setActiveTab('All')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                        activeTab === 'All' 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                >
                    All Coverage
                </button>
                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                <button
                    onClick={() => setActiveTab('Left')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${
                        activeTab === 'Left' 
                        ? 'bg-bias-left text-white border-bias-left' 
                        : 'bg-white text-gray-600 border-gray-200 hover:text-bias-left hover:border-blue-200'
                    }`}
                >
                    Left <span className="bg-black/10 px-1.5 rounded text-[10px]">{getArticleCountByBias('Left')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('Center')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${
                        activeTab === 'Center' 
                        ? 'bg-gray-500 text-white border-gray-500' 
                        : 'bg-white text-gray-600 border-gray-200 hover:text-gray-800 hover:border-gray-300'
                    }`}
                >
                    Center <span className="bg-black/10 px-1.5 rounded text-[10px]">{getArticleCountByBias('Center')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('Right')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${
                        activeTab === 'Right' 
                        ? 'bg-bias-right text-white border-bias-right' 
                        : 'bg-white text-gray-600 border-gray-200 hover:text-bias-right hover:border-red-200'
                    }`}
                >
                    Right <span className="bg-black/10 px-1.5 rounded text-[10px]">{getArticleCountByBias('Right')}</span>
                </button>
             </div>
          </div>

          {/* === ARTICLE LIST === */}
          <div className="space-y-3">
            {filteredArticles.map(article => (
              <a 
                key={article.id}
                href={article.url} 
                target="_blank" 
                rel="noreferrer"
                className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Color Sidebar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    article.source.bias.includes('Left') ? 'bg-bias-left' :
                    article.source.bias.includes('Right') ? 'bg-bias-right' : 'bg-gray-400'
                }`}></div>

                <div className="flex justify-between items-start pl-3">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            {/* Favicon or Placeholder */}
                            <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                                {article.source.favicon ? (
                                    <img src={article.source.favicon} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <ICONS.Newspaper className="w-full h-full p-0.5 text-gray-400" />
                                )}
                            </div>
                            <span className="text-xs font-bold text-gray-700">{article.source.name}</span>
                            <span className="text-gray-300 text-[10px]">•</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(article.publishedAt)}</span>
                        </div>
                        
                        <h3 className="font-serif font-bold text-lg text-gray-900 mb-1 leading-snug group-hover:underline decoration-2 underline-offset-2 decoration-gray-900">
                            {article.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                            {article.summary}
                        </p>
                    </div>
                    <div className="mt-1 text-gray-300 group-hover:text-blue-600 transition-colors">
                        <ICONS.Link size={16} />
                    </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* === RIGHT SIDEBAR: COVERAGE DETAILS === */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Top Summary Card */}
          <div className="bg-gray-100 rounded-xl p-5 border border-transparent">
             <h3 className="font-bold text-gray-800 text-base mb-4">Coverage Details</h3>
             
             <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Total News Sources</span>
                    <span className="text-gray-900 font-bold">{cluster.totalSources}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Leaning Left</span>
                    <span className="text-gray-900 font-bold">{getArticleCountByBias('Left')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Leaning Right</span>
                    <span className="text-gray-900 font-bold">{getArticleCountByBias('Right')}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Center</span>
                    <span className="text-gray-900 font-bold">{getArticleCountByBias('Center')}</span>
                </div>
                
                <div className="pt-2 mt-2 border-t border-gray-200/50"></div>
                
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="text-gray-900 font-medium">{formatDate(cluster.lastUpdated)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Bias Distribution</span>
                    <span className="text-gray-900 font-medium">
                        {Math.max(cluster.biasDistribution.left, cluster.biasDistribution.center, cluster.biasDistribution.right)}% {
                             cluster.biasDistribution.left >= Math.max(cluster.biasDistribution.center, cluster.biasDistribution.right) ? 'Left' :
                             cluster.biasDistribution.right >= Math.max(cluster.biasDistribution.left, cluster.biasDistribution.center) ? 'Right' : 'Center'
                        }
                    </span>
                </div>
             </div>
          </div>

          {/* 2. Visual Bias Distribution Card */}
          <div className="bg-gray-100 rounded-xl p-5">
             <div className="flex items-center justify-between mb-2 cursor-pointer hover:bg-black/5 rounded -mx-2 px-2 py-1 transition-colors">
                 <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                    Bias Distribution <ICONS.ArrowUpRight size={14} className="rotate-45" />
                 </h3>
                 <ICONS.ChevronDown size={20} className="text-gray-400" />
             </div>
             
             <p className="text-sm text-gray-600 mb-4">
                 • <span className="font-bold">{cluster.biasDistribution.center}%</span> of the sources are Center
             </p>

             {/* Custom Segmented Bar */}
             <div className="flex h-8 rounded-sm overflow-hidden mb-6 text-[10px] font-bold text-white uppercase tracking-wider">
                 <div className="bg-gradient-to-r from-blue-700 to-blue-400 flex items-center justify-center relative" style={{ width: `${cluster.biasDistribution.left}%` }}>
                    L {cluster.biasDistribution.left}%
                 </div>
                 <div className="bg-white text-gray-800 flex items-center justify-center relative border-l border-r border-gray-100" style={{ width: `${cluster.biasDistribution.center}%` }}>
                    C {cluster.biasDistribution.center}%
                 </div>
                 <div className="bg-gradient-to-r from-red-300 to-red-700 flex items-center justify-center relative" style={{ width: `${cluster.biasDistribution.right}%` }}>
                    R {cluster.biasDistribution.right}%
                 </div>
             </div>

             {/* Source Bubbles Layout */}
             <div className="grid grid-cols-3 gap-2 relative">
                 {/* Background columns for visual separation */}
                 <div className="absolute inset-0 grid grid-cols-3 gap-2 pointer-events-none">
                     <div className="bg-blue-100/50 rounded-full h-full w-full mx-auto max-w-[60px]"></div>
                     <div className="bg-gray-200/50 rounded-full h-full w-full mx-auto max-w-[60px]"></div>
                     <div className="bg-red-100/50 rounded-full h-full w-full mx-auto max-w-[60px]"></div>
                 </div>

                 {/* Left Column */}
                 <div className="flex flex-col items-center gap-3 py-4 relative z-10">
                     {cluster.articles
                         .filter(a => a.source.bias.includes('Left'))
                         .slice(0, 6)
                         .map((a, i) => (
                         <div key={i} className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform cursor-pointer group" title={a.source.name}>
                             {a.source.favicon ? (
                                 <img src={a.source.favicon} alt={a.source.name} className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-[10px] font-bold text-blue-700">{a.source.name.substring(0, 2)}</span>
                             )}
                         </div>
                     ))}
                     {getArticleCountByBias('Left') > 6 && (
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                             +{getArticleCountByBias('Left') - 6}
                         </div>
                     )}
                 </div>

                 {/* Center Column */}
                 <div className="flex flex-col items-center gap-3 py-4 relative z-10">
                     {cluster.articles
                         .filter(a => a.source.bias === 'Center')
                         .slice(0, 8) // Show a few more center ones
                         .map((a, i) => (
                         <div key={i} className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform cursor-pointer group" title={a.source.name}>
                             {a.source.favicon ? (
                                 <img src={a.source.favicon} alt={a.source.name} className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-[10px] font-bold text-gray-700">{a.source.name.substring(0, 2)}</span>
                             )}
                         </div>
                     ))}
                     {getArticleCountByBias('Center') > 8 && (
                         <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                             +{getArticleCountByBias('Center') - 8}
                         </div>
                     )}
                 </div>

                 {/* Right Column */}
                 <div className="flex flex-col items-center gap-3 py-4 relative z-10">
                     {cluster.articles
                         .filter(a => a.source.bias.includes('Right'))
                         .slice(0, 6)
                         .map((a, i) => (
                         <div key={i} className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform cursor-pointer group" title={a.source.name}>
                             {a.source.favicon ? (
                                 <img src={a.source.favicon} alt={a.source.name} className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-[10px] font-bold text-red-700">{a.source.name.substring(0, 2)}</span>
                             )}
                         </div>
                     ))}
                     {getArticleCountByBias('Right') > 6 && (
                         <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-700">
                             +{getArticleCountByBias('Right') - 6}
                         </div>
                     )}
                 </div>
             </div>
             
             {/* Untracked Bias Footer */}
             <div className="mt-8 pt-6 border-t border-gray-200/50">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Untracked bias</h4>
                <div className="flex flex-wrap gap-2">
                     {[1,2,3,4].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[8px] text-gray-400">
                             N/A
                         </div>
                     ))}
                     <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                         +12
                     </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClusterDetail;