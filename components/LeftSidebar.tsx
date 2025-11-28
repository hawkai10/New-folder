import React, { useState } from 'react';
import { ICONS } from '../constants';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: { [key: string]: string[] };
  onKeywordClick: (keyword: string) => void;
  onHomeClick: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    isOpen, 
    onClose, 
    keywords, 
    onKeywordClick,
    onHomeClick 
}) => {
  // state to track the currently selected category for drill-down
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleClose = () => {
    setSelectedCategory(null); // Reset on close
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white z-[70] transform transition-transform duration-300 shadow-2xl overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { onHomeClick(); handleClose(); }}>
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-base rounded-[4px]">G</div>
                <span className="font-extrabold text-xl tracking-tighter font-sans">GROUND <span className="font-medium">NEWS</span></span>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ICONS.Close size={20} />
            </button>
        </div>

        {/* Content Area with Slide Transition */}
        <div className="relative h-[calc(100%-65px)] w-full overflow-hidden">
            
            {/* Main Menu & Categories (Level 1) */}
            <div 
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto transition-transform duration-300 ease-in-out ${selectedCategory ? '-translate-x-full' : 'translate-x-0'}`}
            >
                {/* Standard Nav Items */}
                <div className="py-2">
                    <NavItem icon={ICONS.Newspaper} label="Home" onClick={() => { onHomeClick(); handleClose(); }} active />
                    <NavItem icon={ICONS.User} label="Login" />
                    <NavItem icon={ICONS.Info} label="About Ground News" />
                    <NavItem icon={ICONS.Mail} label="Subscribe" highlight />
                    <NavItem icon={ICONS.Settings} label="Website Settings" />
                    <NavItem icon={ICONS.Phone} label="Contact us" />
                </div>

                <div className="border-t border-gray-100 my-2"></div>

                {/* Categories List */}
                <div className="p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Interests</h3>
                    <div className="space-y-1">
                        {Object.keys(keywords).map((interest, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setSelectedCategory(interest)}
                                className="w-full flex justify-between items-center text-left px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors group"
                            >
                                <span>{interest}</span>
                                <ICONS.ChevronRight className="text-gray-400 group-hover:text-black" size={16} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Keywords List (Level 2) */}
            <div 
                className={`absolute top-0 left-0 w-full h-full overflow-y-auto bg-white transition-transform duration-300 ease-in-out ${selectedCategory ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Back Button */}
                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <button 
                        onClick={handleBackToCategories}
                        className="flex items-center space-x-2 text-sm font-bold text-gray-600 hover:text-black px-2 py-2 w-full rounded-lg hover:bg-gray-50"
                    >
                        <ICONS.ChevronRight className="rotate-180" size={16} />
                        <span>Back to Interests</span>
                    </button>
                </div>

                {/* Selected Category Title */}
                <div className="p-4 pb-2">
                     <h3 className="text-lg font-bold text-black">{selectedCategory}</h3>
                </div>

                {/* Keywords */}
                <div className="px-4 pb-4 space-y-1">
                    {selectedCategory && keywords[selectedCategory]?.map((keyword, idx) => (
                        <button 
                            key={idx}
                            onClick={() => { onKeywordClick(keyword); handleClose(); }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors truncate"
                        >
                            {keyword}
                        </button>
                    ))}
                </div>
            </div>

        </div>

      </div>
    </>
  );
};

const NavItem = ({ icon: Icon, label, onClick, active, highlight }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-6 py-3 text-sm font-bold transition-colors ${
            active ? 'text-black bg-gray-50 border-r-4 border-black' : 'text-gray-500 hover:text-black hover:bg-gray-50'
        } ${highlight ? 'text-blue-600' : ''}`}
    >
        <Icon size={18} />
        <span>{label}</span>
    </button>
);

export default LeftSidebar;