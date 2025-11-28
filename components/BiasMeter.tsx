import React from 'react';

interface BiasMeterProps {
  distribution: {
    left: number;
    center: number;
    right: number;
  };
  totalSources?: number;
  hideLabels?: boolean;
  height?: string;
}

const BiasMeter: React.FC<BiasMeterProps> = ({ distribution, totalSources, hideLabels, height = "h-2" }) => {
  const { left, center, right } = distribution;

  return (
    <div className="w-full">
      <div className={`flex w-full ${height} rounded-full overflow-hidden bg-gray-100`}>
        {/* Left Segment */}
        <div 
            className="bg-bias-left transition-all duration-500 ease-out relative group" 
            style={{ width: `${left}%` }}
        ></div>
        
        {/* Center Segment - using a lighter gray or specific color if needed */}
        <div 
            className="bg-gray-300 transition-all duration-500 ease-out relative group border-l border-r border-white/20" 
            style={{ width: `${center}%` }}
        ></div>
        
        {/* Right Segment */}
        <div 
            className="bg-bias-right transition-all duration-500 ease-out relative group" 
            style={{ width: `${right}%` }}
        ></div>
      </div>
      
      {!hideLabels && (
          <div className="flex justify-between mt-1 text-[10px] font-medium text-gray-400">
            <span>Left</span>
            <span>Center</span>
            <span>Right</span>
          </div>
      )}
    </div>
  );
};

export default BiasMeter;