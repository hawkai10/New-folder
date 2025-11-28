import React from 'react';
import { NewsCluster } from '../types';
import BiasMeter from './BiasMeter';
import { ICONS } from '../constants';

interface ClusterCardProps {
  cluster: NewsCluster;
  onClick?: () => void;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onClick }) => {
  return (
    <div 
        onClick={onClick}
        className="bg-white rounded-2xl border border-brand-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
                {/* Meta */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Trending
                    </span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <ICONS.Map size={12} /> Global
                    </span>
                </div>

                {/* Title */}
                <h3 className="font-serif font-black text-2xl md:text-3xl text-gray-900 leading-tight mb-4 group-hover:text-bias-left transition-colors">
                    {cluster.topicLabel}
                </h3>

                {/* Summary */}
                <p className="text-gray-600 leading-relaxed mb-6 font-medium">
                    {cluster.summary}
                </p>

                {/* Bias Meter Large */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Media Bias Distribution</span>
                        <span className="text-xs font-bold text-gray-900">{cluster.totalSources} Sources</span>
                    </div>
                    <BiasMeter distribution={cluster.biasDistribution} height="h-3" />
                    <div className="flex justify-between mt-2 text-xs font-bold">
                        <span className="text-bias-left">{cluster.biasDistribution.left}% Left</span>
                        <span className="text-gray-400">{cluster.biasDistribution.center}% Center</span>
                        <span className="text-bias-right">{cluster.biasDistribution.right}% Right</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterCard;