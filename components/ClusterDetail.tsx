import React, { useState } from 'react';
import { NewsCluster, Article, BiasRating } from '../types';
import { ICONS } from '../constants';
import BiasMeter from './BiasMeter';

interface ClusterDetailProps {
  cluster: NewsCluster;
  onBack: () => void;
}

const ClusterDetail: React.FC<ClusterDetailProps> = ({ cluster, onBack }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Left' | 'Center' | 'Right'>('All');

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
      
      {/* Breadcrumb / Top Meta */}
      <div className="flex items-center text-xs text-gray-500 mb-6 space-x-2 font-medium">
        <button onClick={onBack} className="hover:text-black flex items-center">
            <ICONS.Back size={14} className="mr-1"/> Home
        </button>
        <span>•</span>
        <span>Published {formatDate(cluster.lastUpdated)}</span>
        <span>•</span>
        <span>Updated just now</span>
        <div className="flex-1"></div>
        <div className="flex space-x-3 text-gray-400">
            <ICONS.Share size={16} className="hover:text-black cursor-pointer"/>
            <ICONS.Bookmark size={16} className="hover:text-black cursor-pointer"/>
            <ICONS.Print size={16} className="hover:text-black cursor-pointer"/>
            <ICONS.Mail size={16} className="hover:text-black cursor-pointer"/>
            <ICONS.Code size={16} className="hover:text-black cursor-pointer"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT MAIN COLUMN */}
        <div className="lg:col-span-8">
            
            {/* Title */}
            <h1 className="font-serif font-bold text-3xl md:text-5xl text-gray-900 leading-tight mb-6">
                {cluster.topicLabel}
            </h1>

            {/* Bias Strip */}
            <div className="flex items-center space-x-2 mb-8">
                <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs font-bold w-64">
                    <div className="flex-1 py-1.5 bg-gray-50 text-center text-gray-700 border-r border-gray-200">Left</div>
                    <div className="flex-1 py-1.5 bg-white text-center text-gray-900 border-r border-gray-200">Center</div>
                    <div className="flex-1 py-1.5 bg-gray-50 text-center text-gray-700">Right</div>
                </div>
                <button className="flex items-center text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors">
                    <ICONS.Info size={14} className="mr-1"/> Bias Comparison
                </button>
            </div>

            {/* Summary */}
            <div className="prose prose-lg text-gray-700 mb-8 leading-relaxed">
                <ul className="list-disc pl-5 space-y-3">
                    {/* Basic heuristic to split summary into bullets if it's long, or just show it */}
                    {cluster.summary.split('. ').filter(s => s.length > 10).map((sentence, idx) => (
                        <li key={idx}>{sentence.replace(/\.$/, '')}.</li>
                    ))}
                </ul>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400 mb-12">
                <div className="flex items-center">
                    <ICONS.Info size={14} className="mr-1"/> Insights by Ground AI
                </div>
                <button className="flex items-center hover:text-gray-600">
                    <ICONS.Flag size={14} className="mr-1"/> Does this summary seem wrong?
                </button>
            </div>

            {/* Articles Section */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-1">
                <div className="flex space-x-8">
                    <button 
                        onClick={() => setActiveTab('All')}
                        className={`text-sm font-bold pb-3 border-b-2 transition-colors ${activeTab === 'All' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        {cluster.articles.length} Articles
                    </button>
                    <button 
                        onClick={() => setActiveTab('Left')}
                        className={`text-sm font-bold pb-3 border-b-2 transition-colors ${activeTab === 'Left' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
                    >
                        Left {Math.round(cluster.biasDistribution.left / 100 * cluster.articles.length)}
                    </button>
                    <button 
                        onClick={() => setActiveTab('Center')}
                        className={`text-sm font-bold pb-3 border-b-2 transition-colors ${activeTab === 'Center' ? 'border-gray-500 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        Center {Math.round(cluster.biasDistribution.center / 100 * cluster.articles.length)}
                    </button>
                    <button 
                        onClick={() => setActiveTab('Right')}
                        className={`text-sm font-bold pb-3 border-b-2 transition-colors ${activeTab === 'Right' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-red-600'}`}
                    >
                        Right {Math.round(cluster.biasDistribution.right / 100 * cluster.articles.length)}
                    </button>
                </div>
                <div className="flex space-x-2 text-gray-400 pb-2">
                    <ICONS.Search size={18} className="cursor-pointer hover:text-black"/>
                    <ICONS.Filter size={18} className="cursor-pointer hover:text-black"/>
                </div>
            </div>

            <div className="space-y-4">
                {filteredArticles.map((article) => (
                    <div key={article.id} className="bg-gray-50 border border-transparent hover:border-gray-300 hover:bg-white p-5 rounded-lg transition-all duration-200 group">
                        
                        {/* Article Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                {/* Fallback Icon/Initial for Source */}
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                                    {article.source.name.substring(0,2)}
                                </div>
                                <span className="text-xs font-bold text-gray-900">{article.source.domain}</span>
                                
                                {/* Mock Badges for UI fidelity */}
                                <span className="flex items-center px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] text-gray-400">
                                    Ownership <ICONS.Lock size={8} className="ml-1"/>
                                </span>
                                <span className="flex items-center px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] text-gray-400">
                                    Factuality <ICONS.Lock size={8} className="ml-1"/>
                                </span>

                                {/* Bias Badge */}
                                <span className={`flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white ${getBiasColor(article.source.bias)}`}>
                                    {getBiasLabel(article.source.bias)}
                                </span>
                            </div>
                            <ICONS.More size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer"/>
                        </div>

                        {/* Content */}
                        <a href={article.url} target="_blank" rel="noreferrer" className="block">
                            <h3 className="font-serif font-bold text-xl text-gray-900 mb-2 group-hover:underline decoration-2 underline-offset-2 decoration-gray-900">
                                {article.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {article.summary}
                            </p>
                        </a>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                             <span className="text-xs text-gray-500">{formatDate(article.publishedAt)}</span>
                             <a href={article.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-900 hover:text-blue-600 flex items-center">
                                Read Full Article <span className="border-b border-black ml-0.5 w-0 group-hover:w-full transition-all"></span>
                             </a>
                        </div>
                    </div>
                ))}
            </div>

        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Coverage Details Card */}
            <div className="bg-gray-100 rounded-xl p-6">
                <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Coverage Details</h3>
                
                <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total News Sources</span>
                        <span className="font-bold">{cluster.totalSources}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Leaning Left</span>
                        <span className="font-bold">{Math.round(cluster.biasDistribution.left / 100 * cluster.totalSources)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Leaning Right</span>
                        <span className="font-bold">{Math.round(cluster.biasDistribution.right / 100 * cluster.totalSources)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Center</span>
                        <span className="font-bold">{Math.round(cluster.biasDistribution.center / 100 * cluster.totalSources)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                        <span className="text-gray-600">Last Updated</span>
                        <span className="font-bold">29 minutes ago</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Bias Distribution</span>
                        <span className="font-bold">
                            {Math.max(cluster.biasDistribution.left, cluster.biasDistribution.center, cluster.biasDistribution.right)}% {
                                cluster.biasDistribution.left >= cluster.biasDistribution.center && cluster.biasDistribution.left >= cluster.biasDistribution.right ? 'Left' :
                                cluster.biasDistribution.center >= cluster.biasDistribution.left && cluster.biasDistribution.center >= cluster.biasDistribution.right ? 'Center' : 'Right'
                            }
                        </span>
                    </div>
                </div>

                {/* Bias Visualization */}
                <div className="mb-2">
                     <h4 className="text-xs font-bold text-gray-500 mb-2">Bias Distribution <ICONS.ArrowUpRight size={10} className="inline"/></h4>
                     <p className="text-xs text-gray-500 mb-2">• {Math.round(cluster.biasDistribution.center)}% of the sources are Center</p>
                     
                     {/* The Stacked Bar */}
                     <div className="flex w-full h-8 rounded-md overflow-hidden text-[10px] font-bold text-white mb-6">
                        <div className="bg-bias-left flex items-center justify-center" style={{ width: `${cluster.biasDistribution.left}%` }}>
                            {cluster.biasDistribution.left > 10 && `L ${Math.round(cluster.biasDistribution.left)}%`}
                        </div>
                        <div className="bg-gray-300 text-gray-700 flex items-center justify-center" style={{ width: `${cluster.biasDistribution.center}%` }}>
                            {cluster.biasDistribution.center > 10 && `C ${Math.round(cluster.biasDistribution.center)}%`}
                        </div>
                        <div className="bg-bias-right flex items-center justify-center" style={{ width: `${cluster.biasDistribution.right}%` }}>
                            {cluster.biasDistribution.right > 10 && `R ${Math.round(cluster.biasDistribution.right)}%`}
                        </div>
                     </div>

                     {/* Source Bubbles */}
                     <div className="flex flex-wrap gap-2 mb-6">
                        {cluster.articles.slice(0, 15).map((article, i) => (
                            <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white text-[9px] font-bold uppercase overflow-hidden shadow-sm
                                ${article.source.bias.includes('Left') ? 'border-blue-400 text-blue-800' : 
                                  article.source.bias.includes('Right') ? 'border-red-400 text-red-800' : 'border-gray-300 text-gray-700'}
                            `} title={article.source.name}>
                                {article.source.name.substring(0, 1)}
                            </div>
                        ))}
                        {cluster.totalSources > 15 && (
                            <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center text-[9px] font-bold text-orange-600">
                                +{cluster.totalSources - 15}
                            </div>
                        )}
                     </div>
                     
                     <div className="text-[10px] text-gray-400 font-medium">Untracked bias</div>
                     <div className="flex gap-2 mt-1">
                         <div className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center text-[8px]">AB</div>
                         <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-[8px]">CD</div>
                     </div>
                </div>
            </div>

            {/* Factuality Promo */}
            <div className="bg-gray-100 rounded-xl p-4 flex justify-between items-center border border-gray-200">
                <div>
                    <h3 className="font-serif font-bold text-sm text-gray-900 flex items-center">
                        Factuality <ICONS.Info size={12} className="ml-1 text-gray-400"/>
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">
                        To view factuality data please <a href="#" className="underline">Upgrade to Premium</a>
                    </p>
                </div>
                <ICONS.Lock size={16} className="text-gray-400"/>
            </div>

            {/* Ownership Promo */}
             <div className="bg-gray-100 rounded-xl p-4 flex justify-between items-center border border-gray-200">
                <div>
                    <h3 className="font-serif font-bold text-sm text-gray-900 flex items-center">
                        Ownership <ICONS.Info size={12} className="ml-1 text-gray-400"/>
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-1">
                        To view ownership data please <a href="#" className="underline">Upgrade to Vantage</a>
                    </p>
                </div>
                <ICONS.Lock size={16} className="text-gray-400"/>
            </div>

             {/* Similar News Topics */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="font-serif font-bold text-lg text-gray-900 mb-4">Similar News Topics</h3>
                <div className="space-y-0">
                    {/* Extract unique entities from articles */}
                    {Array.from(new Set(cluster.articles.flatMap(a => a.entities.people.concat(a.entities.organizations)))).slice(0, 5).map((topic, i) => (
                        <div key={i} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0 group cursor-pointer">
                            <div className="flex items-center">
                                {/* Random placeholder image for topic */}
                                <div className="w-8 h-8 rounded-full bg-red-100 mr-3 overflow-hidden">
                                     <div className={`w-full h-full opacity-50 ${i % 2 === 0 ? 'bg-blue-800' : 'bg-red-800'}`}></div>
                                </div>
                                <span className="text-sm font-bold text-gray-700 group-hover:text-black">{topic}</span>
                            </div>
                            <span className="text-xl text-gray-400 font-light">+</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default ClusterDetail;