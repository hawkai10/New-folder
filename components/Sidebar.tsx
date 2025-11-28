import React from 'react';
import { ICONS } from '../constants';
import { NewsCluster } from '../types';

interface SidebarProps {
    blindspots: NewsCluster[];
    onClusterClick: (cluster: NewsCluster) => void;
}
  
const Sidebar: React.FC<SidebarProps> = ({ blindspots, onClusterClick }) => {
    return (
      <div className="space-y-6">
      
      {/* Blindspot Widget */}
      <div className="bg-white rounded-xl border border-brand-border shadow-card p-6">
        <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-gray-100 rounded-md">
                <ICONS.Blindspot size={18} className="text-gray-900" />
            </div>
            <h3 className="font-serif font-bold text-lg text-gray-900">Blindspots</h3>
        </div>
        
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Stories that are disproportionately covered by one side of the political spectrum.
        </p>

        <div className="space-y-6">
        {blindspots.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">No active blindspots.</div>
        ) : (
            blindspots.slice(0, 3).map(cluster => {
                const isLeftBlindspot = cluster.biasDistribution.left < 15;
                
                return (
                    <div key={cluster.id} className="group cursor-pointer" onClick={() => onClusterClick(cluster)}>
                         <div className="flex items-center mb-2">
                            {isLeftBlindspot ? (
                                <span className="text-[10px] font-bold text-bias-left bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-bias-left"></div> Left Missed
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-bias-right bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                                         <div className="w-1.5 h-1.5 rounded-full bg-bias-right"></div> Right Missed
                                    </span>
                                )}
                            </div>
                            <h4 className="font-serif font-bold text-base text-gray-900 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                                {cluster.topicLabel}
                            </h4>
                            
                            {/* Micro Bias Bar */}
                            <div className="flex w-full h-1 rounded-full overflow-hidden bg-gray-100 opacity-70">
                                <div className="bg-bias-left" style={{ width: `${cluster.biasDistribution.left}%` }}></div>
                                <div className="bg-gray-300" style={{ width: `${cluster.biasDistribution.center}%` }}></div>
                                <div className="bg-bias-right" style={{ width: `${cluster.biasDistribution.right}%` }}></div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        <button className="w-full mt-6 py-2.5 border border-gray-200 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors">
            View All Blindspots
        </button>
      </div>

      {/* My News Bias Widget */}
      <div className="bg-white rounded-xl border border-brand-border shadow-card p-6">
         <div className="flex items-center justify-between mb-4">
             <h3 className="font-serif font-bold text-lg text-gray-900">My News Bias</h3>
             <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Free</span>
         </div>
         
         <div className="text-center py-6">
            <div className="flex justify-center -space-x-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-bias-left opacity-20"></div>
                <div className="w-10 h-10 rounded-full bg-bias-center opacity-20"></div>
                <div className="w-10 h-10 rounded-full bg-bias-right opacity-20"></div>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-2">Track your reading habits</p>
            <p className="text-xs text-gray-500 mb-4 px-4">See which side of the story you might be missing.</p>
            <button className="w-full py-2.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors">
                Start Tracking
            </button>
         </div>
      </div>

      {/* Local News Widget */}
      <div className="bg-white rounded-xl border border-brand-border shadow-card p-6">
        <div className="flex items-center gap-2 mb-3">
             <ICONS.Map size={18} className="text-gray-900" />
             <h3 className="font-serif font-bold text-lg text-gray-900">Local News</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
            Filter the noise. Get news from your community.
        </p>
        <div className="flex gap-2">
            <input type="text" placeholder="Zip or City" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold">
                <ICONS.Search size={16} />
            </button>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;