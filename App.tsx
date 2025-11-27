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
    <div className="min-h-screen font-sans bg-gray-50 text-gray-800">
      
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
                         <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xl rounded-sm">G</div>
                         <span className="font-bold text-xl tracking-tighter hidden sm:block">GROUND NEWS</span>
                    </div>
                    
                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex space-x-6 ml-6 text-sm font-medium text-gray-500">
                        <a href="#" className="text-black" onClick={handleBack}>Home</a>
                        <a href="#" className="hover:text-black">For You</a>
                        <a href="#" className="hover:text-black">Local</a>
                        <a href="#" className="hover:text-black">Blindspot</a>
                    </nav>
                </div>

                {/* Right: Search & Actions */}
                <div className="flex items-center space-x-4">
                    <div className="hidden md:flex relative">
                        <ICONS.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search" 
                            className="bg-gray-100 border-none rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-gray-300 outline-none w-64"
                        />
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors">
                        Subscribe
                    </button>
                    <button className="text-sm font-semibold border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100">
                        Login
                    </button>
                </div>
            </div>
            
            {/* Sub Nav / Ticker */}
            <div className="hidden md:flex items-center space-x-6 h-12 border-t border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider overflow-x-auto no-scrollbar">
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
                <section className="bg-white border-b border-gray-200 py-16 text-center">
                    <div className="max-w-4xl mx-auto px-4">
                        <h1 className="font-bold text-4xl md:text-5xl text-gray-900 mb-4">
                            See the full story from every angle.
                        </h1>
                        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                            Unbiased news coverage from thousands of sources. All in one place.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition-transform hover:-translate-y-0.5 shadow-lg">
                                Get Started Free
                            </button>
                            <button className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md font-semibold hover:bg-gray-300">
                                Download the App
                            </button>
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    {error ? (
                        <div className="bg-red-100 border border-red-300 p-6 rounded-lg text-center">
                            <ICONS.Blindspot className="text-red-600 mx-auto mb-4" size={48} />
                            <h2 className="text-red-800 font-bold text-xl mb-2">Backend Connection Error</h2>
                            <p className="text-red-700 mb-4">Could not connect to the local Python server. Please ensure it's running correctly.</p>
                            <code className="bg-white px-3 py-1 rounded border border-red-200 text-sm font-mono">python server.py</code>
                        </div>
                    ) : loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* Left Column: Daily Briefing (Starts at 4 cols wide on LG) */}
                            <div className="lg:col-span-4 space-y-6">
                                <h2 className="font-bold text-2xl text-gray-900 border-b pb-2">Daily Briefing</h2>
                                {dailyBriefingCluster ? (
                                    <ClusterCard cluster={dailyBriefingCluster} onClick={() => handleClusterClick(dailyBriefingCluster)} />
                                ) : (
                                    <div className="p-4 bg-gray-100 rounded-md text-center text-gray-500">No briefing available.</div>
                                )}

                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-yellow-500">★★★★★</span>
                                        <span className="font-semibold">12,000+ Reviews</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Top-rated on the App Store & Google Play.</p>
                                </div>
                            </div>

                            {/* Center Column: Top News Stories (Starts at 5 cols wide on LG) */}
                            <div className="lg:col-span-5 space-y-4">
                                <h2 className="font-bold text-2xl text-gray-900 border-b pb-2 mb-4">Top Stories</h2>
                                {topStories.length > 0 ? (
                                    topStories.map(cluster => (
                                        <ArticleCard 
                                            key={cluster.id} 
                                            cluster={cluster} 
                                            onClick={() => handleClusterClick(cluster)}
                                        />
                                    ))
                                ) : (
                                    <p className="text-gray-500">No top stories available at the moment.</p>
                                )}
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