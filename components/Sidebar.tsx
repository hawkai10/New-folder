import React from 'react';
import { ICONS } from '../constants';
import { NewsCluster } from '../types';

interface SidebarProps {
  blindspots: NewsCluster[];
}

const Sidebar: React.FC<SidebarProps> = ({ blindspots }) => {
  return (
    <div className="space-y-8">
      
      {/* Blindspot Widget */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center space-x-2 mb-2">
            <ICONS.Blindspot size={20} className="text-gray-900" />
            <h3 className="font-serif font-bold text-lg text-gray-900">Blindspot</h3>
        </div>
        
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Stories disproportionately covered by one side of the political spectrum. 
            <a href="#" className="underline ml-1">Learn more about political bias.</a>
        </p>

        <div className="space-y-4">
            {blindspots.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">No blindspots detected currently.</div>
            ) : (
                blindspots.slice(0, 3).map(cluster => {
                    const isLeftBlindspot = cluster.biasDistribution.left < 15;
                    const isRightBlindspot = cluster.biasDistribution.right < 15;
                    
                    return (
                        <div key={cluster.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                             <div className="flex items-center mb-2">
                                {isLeftBlindspot && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center">
                                        <ICONS.EyeOff size={10} className="mr-1"/> Low coverage from Left
                                    </span>
                                )}
                                {isRightBlindspot && (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center">
                                         <ICONS.EyeOff size={10} className="mr-1"/> Low coverage from Right
                                    </span>
                                )}
                            </div>
                            <h4 className="font-serif font-bold text-sm text-gray-900 leading-snug mb-2 hover:text-blue-600 cursor-pointer">
                                {cluster.topicLabel}
                            </h4>
                            
                            {/* Mini Bias Bar */}
                            <div className="flex w-full h-1.5 rounded-full overflow-hidden mb-1 bg-gray-100">
                                <div className="bg-bias-left" style={{ width: `${cluster.biasDistribution.left}%` }}></div>
                                <div className="bg-gray-300" style={{ width: `${cluster.biasDistribution.center}%` }}></div>
                                <div className="bg-bias-right" style={{ width: `${cluster.biasDistribution.right}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                                <span>Left {cluster.biasDistribution.left}%</span>
                                <span>Center {cluster.biasDistribution.center}%</span>
                                <span>{cluster.biasDistribution.right}%</span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        <button className="w-full mt-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            View Blindspot Feed
        </button>
      </div>

      {/* My News Bias Widget */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
         <h3 className="font-serif font-bold text-lg text-gray-900 mb-2">My News Bias</h3>
         <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                LB
            </div>
            <div>
                <div className="text-sm font-bold text-gray-900">Linda B. (Sample)</div>
                <div className="text-xs text-gray-500">0 Stories • 0 Articles</div>
            </div>
         </div>
         <div className="flex justify-between gap-1 mb-4">
            <div className="flex-1 bg-blue-100 h-12 rounded flex items-center justify-center text-blue-800 text-xs font-bold">?</div>
            <div className="flex-1 bg-gray-100 h-12 rounded flex items-center justify-center text-gray-600 text-xs font-bold">?</div>
            <div className="flex-1 bg-red-100 h-12 rounded flex items-center justify-center text-red-800 text-xs font-bold">?</div>
         </div>
         <button className="w-full py-2 border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            See the demo
        </button>
      </div>

      {/* Daily Local News Widget */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="font-serif font-bold text-lg text-gray-900 mb-2">Daily Local News</h3>
        <p className="text-sm text-gray-500 mb-4">
            Discover stories and media bias happening right in your city.
        </p>
        <div className="flex gap-2">
            <input type="text" placeholder="Enter your city's name" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
            <button className="bg-gray-800 text-white px-3 py-2 rounded text-sm font-bold">Submit</button>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;