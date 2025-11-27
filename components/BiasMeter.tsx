import React from 'react';
import { BIAS_COLORS } from '../constants';

interface BiasMeterProps {
  distribution: {
    left: number;
    center: number;
    right: number;
  };
  totalSources?: number;
}

const BiasMeter: React.FC<BiasMeterProps> = ({ distribution, totalSources }) => {
  const { left, center, right } = distribution;

  // Find dominant bias for the text label
  let maxVal = Math.max(left, center, right);
  let dominantLabel = 'Balanced';
  if (maxVal === left && left > 40) dominantLabel = 'Left';
  if (maxVal === center && center > 40) dominantLabel = 'Center';
  if (maxVal === right && right > 40) dominantLabel = 'Right';

  return (
    <div className="w-full">
      <div className="flex w-full h-2 rounded-sm overflow-hidden mb-2">
        <div className="bg-bias-left" style={{ width: `${left}%` }}></div>
        <div className="bg-gray-200" style={{ width: `${center}%` }}></div>
        <div className="bg-bias-right" style={{ width: `${right}%` }}></div>
      </div>
      
      <div className="flex items-center text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
        <span className={`mr-1 ${
            dominantLabel === 'Left' ? 'text-blue-600' : 
            dominantLabel === 'Right' ? 'text-red-600' : 'text-gray-600'
        }`}>
            {maxVal}% {dominantLabel} coverage
        </span>
        {totalSources !== undefined && (
            <>
                <span className="mx-1">:</span>
                <span>{totalSources} sources</span>
            </>
        )}
      </div>
    </div>
  );
};

export default BiasMeter;