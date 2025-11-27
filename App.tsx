import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ArticleCard from './components/ArticleCard';
import ClusterCard from './components/ClusterCard';
import ClusterDetail from './components/ClusterDetail';
import { fetchNewsFeed } from './services/mockBackend';
import { NewsCluster } from './types';
import { ICONS, NAV_ITEMS } from './constants';

const sortClusters = (clusters: NewsCluster[]): NewsCluster[] => {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  return [...clusters].sort((a, b) => {
    const aWasUpdatedRecently = new Date(a.lastUpdated) > twentyFourHoursAgo;
    const bWasUpdatedRecently = new Date(b.lastUpdated) > twentyFourHoursAgo;

    if (aWasUpdatedRecently && !bWasUpdatedRecently) {
      return -1; // a comes first
    }
    if (!aWasUpdatedRecently && bWasUpdatedRecently) {
      return 1; // b comes first
    }

    // If both are in the same recency group, sort by totalSources
    return b.totalSources - a.totalSources;
  });
};

const App: React.FC = () => {
  const [clusters, setClusters] = useState<NewsCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'detail'>('home');
  const [selectedCluster, setSelectedCluster] = useState<NewsCluster | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchNewsFeed();
        // Ensure data is strictly an array before setting state
        if (Array.isArray(data)) {
            const sortedData = sortClusters(data);
            setClusters(sortedData);
        } else {
            console.error("Data received is not an array:", data);
            setClusters([]); 
        }
        setError(null);
      } catch (err) {
  console.error("Failed to load news clusters", err);
        setError("Could not connect to local backend.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const handleClusterClick = (cluster: NewsCluster) => {
      setSelectedCluster(cluster);
      setView('detail');
      window.scrollTo(0, 0);
  };

  const handleBack = () => {
      setView('home');
      setSelectedCluster(null);
      window.scrollTo(0, 0);
  };

  // Organize Data with safety checks
  const safeClusters = Array.isArray(clusters) ? clusters : [];
  const dailyBriefingCluster = safeClusters[0];
  const topStories = safeClusters.slice(1, 10);
  
  // Calculate blindspots for sidebar
  const blindspots = safeClusters.filter(c => {
      if (!c.biasDistribution) return false;
      const { left, right } = c.biasDistribution;
      return (left < 15 && right > 50) || (right < 15 && left > 50);
  });

  return (
    <div className="min-h-screen font-sans bg-[#f9fafb]">
      
      {/* 1. Header Section */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                {/* Left: Mobile Menu & Logo */}
                <div className="flex items-center gap-4">
                    <button className="lg:hidden text-gray-500">
                        <ICONS.Menu size={24} />
                    </button>
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={handleBack}>
                         <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-serif font-black text-xl rounded-sm">G</div>
                         <span className="font-serif font-black text-xl tracking-tighter hidden sm:block">GROUND NEWS</span>
                    </div>
                    
                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex space-x-6 ml-6 text-sm font-semibold text-gray-600">
                        <a href="#" className="text-black" onClick={handleBack}>Home</a>
                        <a href="#" className="hover:text-black">For You</a>
                        <a href="#" className="hover:text-black">Local</a>
                        <a href="#" className="hover:text-black">Blindspot</a>
                    </nav>
                </div>

                {/* Right: Search & Actions */}
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex relative">
                        <ICONS.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search" 
                            className="bg-gray-100 border-none rounded-md py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-gray-200 outline-none w-64"
                        />
                    </div>
                    <button className="bg-black text-white px-4 py-2 rounded text-sm font-bold hover:bg-gray-800 transition-colors">
                        Subscribe
                    </button>
                    <button className="text-sm font-bold border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
                        Login
                    </button>
                </div>
            </div>
            
            {/* Sub Nav / Ticker */}
            <div className="hidden md:flex items-center space-x-6 h-10 border-t border-gray-100 text-[11px] uppercase font-bold text-gray-500 tracking-wider overflow-x-auto no-scrollbar">
                {NAV_ITEMS.map((item, idx) => (
                    <a key={idx} href="#" className="whitespace-nowrap hover:text-blue-600 transition-colors">{item}</a>
                ))}
            </div>
        </div>
      </header>

      {/* Main Content Router */}
      <main>
        {view === 'detail' && selectedCluster ? (
             <ClusterDetail cluster={selectedCluster} onBack={handleBack} />
        ) : (
            // HOME VIEW
            <>
                {/* 2. Hero Section */}
                <section className="bg-white border-b border-gray-200 py-12 pattern-grid relative overflow-hidden">
                    <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
                        <h1 className="font-serif font-black text-4xl md:text-6xl text-gray-900 mb-6 leading-tight">
                            See every side of<br/> every news story.
                        </h1>
                        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                            Read the news from multiple perspectives. See through media bias with reliable news from local and international sources.
                        </p>
                        <button className="bg-gray-900 text-white px-8 py-3 rounded text-lg font-bold hover:bg-black transition-transform hover:-translate-y-0.5 shadow-lg mb-12">
                            Get Started
                        </button>

                        {/* Social Proof */}
                        <div className="flex justify-center items-center gap-8 text-gray-400 grayscale opacity-70">
                            <span className="font-serif font-bold text-xl">Forbes</span>
                            <span className="font-sans font-black text-xl">Mashable</span>
                            <span className="font-serif font-bold text-xl">USA TODAY</span>
                            <span className="font-serif font-bold text-xl">WSJ</span>
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 p-8 rounded-xl text-center">
                            <ICONS.Blindspot className="text-red-500 mx-auto mb-4" size={40} />
                            <h2 className="text-red-900 font-bold text-lg mb-2">Backend Connection Error</h2>
                            <p className="text-red-700 text-sm mb-4">Ensure your local Python server is running on port 8000.</p>
                            <code className="bg-white px-4 py-2 rounded border border-red-100 text-xs font-mono">python server.py</code>
                        </div>
                    ) : loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* Left Column: Daily Briefing (Starts at 4 cols wide on LG) */}
                            <div className="lg:col-span-4 space-y-8">
                                <h2 className="font-serif font-bold text-2xl text-gray-900">Daily Briefing</h2>
                                {dailyBriefingCluster ? (
                                    <ClusterCard cluster={dailyBriefingCluster} onClick={() => handleClusterClick(dailyBriefingCluster)} />
                                ) : (
                                    <div className="p-4 bg-gray-100 rounded text-center text-gray-500">No briefing available</div>
                                )}

                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-yellow-500 text-xl">★★★★★</span>
                                        <span className="font-bold">10,000+</span>
                                    </div>
                                    <p className="text-sm text-gray-600">5-star reviews on App Store & Play Store.</p>
                                </div>
                            </div>

                            {/* Center Column: Top News Stories (Starts at 5 cols wide on LG) */}
                            <div className="lg:col-span-5 space-y-6">
                                <h2 className="font-serif font-bold text-2xl text-gray-900 mb-6">Top News Stories</h2>
                                <div className="space-y-4">
                                    {topStories.length > 0 ? (
                                        topStories.map(cluster => (
                                            <ArticleCard 
                                                key={cluster.id} 
                                                cluster={cluster} 
                                                onClick={() => handleClusterClick(cluster)}
                                            />
                                        ))
                                    ) : (
                                        <div className="text-gray-500 text-sm italic">Waiting for more stories from RSS feed...</div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Sidebar Widgets (Starts at 3 cols wide on LG) */}
                            <div className="lg:col-span-3">
                                <Sidebar blindspots={blindspots} />
                            </div>

                        </div>
                    )}
                </div>
            </>
        )}
      </main>

    </div>
  );
};

export default App;