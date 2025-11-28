import React from 'react';
import { NewsCluster } from '../types';
import { getBlindspotSide } from '../src/utils';

import BiasMeter from './BiasMeter';
import { ICONS } from '../constants';

interface ArticleCardProps {
  cluster: NewsCluster;
  variant?: 'standard' | 'hero' | 'briefing' | 'compact';
  onClick?: () => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ cluster, variant = 'standard', onClick }) => {
  // Determine if this is a "blindspot"
  const blindspotSide = getBlindspotSide(cluster);
  const isBlindspot = blindspotSide !== null;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diff < 24) return `${Math.floor(diff)}h ago`;
    return `${Math.floor(diff / 24)}d ago`;
  }

  // --- HERO VARIANT (Center Large) ---
  if (variant === 'hero') {
    return (
        <div 
            onClick={onClick}
            className="group relative w-full bg-black rounded-xl overflow-hidden cursor-pointer h-[500px] hover:shadow-2xl transition-all duration-500"
        >
            {/* Background Image Placeholder since we don't have real images in mock */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-gray-800 z-0">
                 {/* In a real app, img tag here */}
                 <div className="w-full h-full opacity-40 bg-[url('https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 z-20 flex flex-col justify-end h-full">
                <div className="flex items-center gap-2 mb-3 text-white/90 text-xs font-bold uppercase tracking-wider">
                    <span>{cluster.totalSources} Stories</span>
                    <span>•</span>
                    <span>{cluster.articles.length} Articles</span>
                    <span>•</span>
                    <span>7m read</span>
                </div>
                
                <h2 className="font-serif font-black text-3xl md:text-5xl text-white leading-tight mb-6 drop-shadow-lg">
                    {cluster.topicLabel}
                </h2>

                {/* Integrated Bias Meter on Hero */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 max-w-lg">
                     <BiasMeter distribution={cluster.biasDistribution} height="h-3" hideLabels />
                     <div className="flex justify-between mt-2 text-[10px] font-bold text-white uppercase tracking-widest">
                        <span className="text-blue-300">{cluster.biasDistribution.left}% Left</span>
                        <span className="text-gray-300">C {cluster.biasDistribution.center}%</span>
                        <span className="text-red-300">Right {cluster.biasDistribution.right}%</span>
                    </div>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 z-20 text-white/50 group-hover:text-white transition-colors">
                <ICONS.Info size={20} />
            </div>
        </div>
    );
  }

  // --- COMPACT VARIANT (Left Column List) ---
  if (variant === 'compact') {
      return (
        <div 
            onClick={onClick}
            className="group cursor-pointer py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
        >
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex justify-between">
                <span>{cluster.articles[0]?.source.name || 'News Source'}</span>
            </div>
            <h4 className="font-sans font-bold text-[15px] text-brand-black leading-snug mb-2 group-hover:text-bias-left group-hover:underline decoration-2 underline-offset-2 transition-all">
                {cluster.topicLabel}
            </h4>
            
            {/* Slim Bias Bar */}
            <div className="flex items-center gap-2 mt-1">
                 <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                    <div className="bg-bias-left" style={{ width: `${cluster.biasDistribution.left}%` }}></div>
                    <div className="bg-gray-300" style={{ width: `${cluster.biasDistribution.center}%` }}></div>
                    <div className="bg-bias-right" style={{ width: `${cluster.biasDistribution.right}%` }}></div>
                </div>
                <div className="text-[10px] font-medium text-gray-500 min-w-[60px] text-right">
                    {cluster.biasDistribution.center}% Center
                </div>
            </div>
            <div className="mt-1 text-[10px] text-gray-400">
                {cluster.totalSources} sources
            </div>
        </div>
      );
  }

  // --- BRIEFING VARIANT (Left Column Top) ---
  if (variant === 'briefing') {
      return (
        <div 
            onClick={onClick}
            className="bg-white rounded-xl overflow-hidden cursor-pointer group mb-6 shadow-sm border border-gray-200 hover:shadow-md transition-all"
        >
            <div className="h-40 bg-gray-200 bg-[url('https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
            <div className="p-4">
                <div className="text-[10px] font-bold text-gray-500 mb-2 flex items-center gap-1">
                    {cluster.articles.length} stories • {formatDate(cluster.lastUpdated)}
                </div>
                <h3 className="font-serif font-black text-xl text-gray-900 leading-tight mb-3 group-hover:text-bias-left transition-colors">
                    {cluster.topicLabel}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
                    {cluster.summary}
                </p>
                
                {/* Bullet points link styling */}
                <div className="space-y-2 border-t border-gray-100 pt-3">
                    {cluster.articles.slice(0, 2).map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-500 hover:text-black">
                            <span className="text-gray-300 mt-1">+</span>
                            <span className="underline decoration-gray-300 underline-offset-2">{a.title}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // --- STANDARD VARIANT (Center Feed) ---
  return (
    <div 
        onClick={onClick}
        className="bg-white rounded-lg border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col md:flex-row gap-5 p-4 group"
    >
        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
            <div>
            <div className="flex items-center gap-2 mb-2">
                    {/* Source Favicon */}
                    {cluster.articles[0]?.source.favicon && (
                        <img 
                            src={cluster.articles[0].source.favicon} 
                            alt="" 
                            className="w-4 h-4 rounded-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    )}
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        {cluster.articles[0]?.source.name}
                    </span>
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        {cluster.articles[0]?.source.name}
                    </span>                    <span className="text-gray-300">•</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        {cluster.articles[0]?.source.name}
                    </span>
                 </div>
                 
                 <h3 className="font-serif font-bold text-xl text-gray-900 leading-snug mb-2 group-hover:text-bias-left transition-colors">
                    {cluster.topicLabel}
                 </h3>
                 
                 <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
                    {cluster.summary}
                 </p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 mt-2">
                 {/* Mini Bias Bar */}
                 <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                    <div className="flex w-full h-2 rounded-sm overflow-hidden bg-gray-100">
                        <div className="bg-bias-left" style={{ width: `${cluster.biasDistribution.left}%` }}></div>
                        <div className="bg-gray-300 border-l border-r border-white/50" style={{ width: `${cluster.biasDistribution.center}%` }}></div>
                        <div className="bg-bias-right" style={{ width: `${cluster.biasDistribution.right}%` }}></div>
                    </div>
                 </div>
                 <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                     {cluster.biasDistribution.center}% Center coverage: {cluster.totalSources} sources
                 </span>
            </div>
        </div>

        {/* Thumbnail (Fake) */}
        <div className="w-full md:w-32 h-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden relative self-start mt-1">
             <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                 <ICONS.Newspaper size={24} />
             </div>
             {/* If we had images: <img src="..." className="w-full h-full object-cover" /> */}
        </div>
    </div>
  );
};

export default ArticleCard;