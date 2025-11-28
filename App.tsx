import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import LeftSidebar from './components/LeftSidebar';
import ArticleCard from './components/ArticleCard';
import ClusterDetail from './components/ClusterDetail';
import TopicPage from './components/TopicPage';
import { fetchNewsFeed, fetchKeywords } from './services/mockBackend';
import { NewsCluster } from './types';
import { ICONS, NAV_ITEMS } from './constants';

const sortClusters = (clusters: NewsCluster[]): NewsCluster[] => {
  return [...clusters].sort((a, b) => {
    // Sort primarily by totalSources (popularity/coverage)
    return b.totalSources - a.totalSources;
  });
};

const App: React.FC = () => {
    const [clusters, setClusters] = useState<NewsCluster[]>([]);
    // Update state type to match the object structure
    const [keywords, setKeywords] = useState<{ [key: string]: string[] }>({});
    const [loading, setLoading] = useState(true);
  
const [error, setError] = useState<string | null>(null);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'detail' | 'topic'>('home');
  const [selectedCluster, setSelectedCluster] = useState<NewsCluster | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [newsData, keywordsData] = await Promise.all([
            fetchNewsFeed(),
            fetchKeywords()
        ]);
        
        if (Array.isArray(newsData)) {
            // Filter: Only show clusters updated in the last 24 hours
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            
            const freshClusters = newsData.filter(cluster => {
                const clusterDate = new Date(cluster.lastUpdated);
                return clusterDate > twentyFourHoursAgo;
            });

            const sortedData = sortClusters(freshClusters);
            setClusters(sortedData);
        } else {
            setClusters([]); 
        }
        setKeywords(keywordsData);
        setError(null);
      } catch (err) {
        console.error("Failed to load data", err);
        setError("Could not connect to backend service.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000); 
    return () => clearInterval(interval);
  }, []);

  const handleClusterClick = (cluster: NewsCluster) => {
      setSelectedCluster(cluster);
      setView('detail');
      window.scrollTo(0, 0);
  };

  const handleTopicClick = (topic: string) => {
      setSelectedTopic(topic);
      setView('topic');
      setIsMenuOpen(false);
      window.scrollTo(0, 0);
  };

  const handleBack = () => {
      setView('home');
      setSelectedCluster(null);
      setSelectedTopic('');
      window.scrollTo(0, 0);
  };

  const safeClusters = Array.isArray(clusters) ? clusters : [];
  
  // Filter clusters for the topic view
  // strict filtering based on database keywords
  const topicClusters = selectedTopic 
    ? safeClusters.filter(c => 
        c.keywords && c.keywords.some(k => k.toLowerCase() === selectedTopic.toLowerCase())
      )
    : [];

  // Distribute content for the 3-column layout
  const heroStory = safeClusters[0];
  const briefingStory = safeClusters[1];
  const topStories = safeClusters.slice(2, 6);
  const feedStories = safeClusters.slice(6);
  
  const blindspots = safeClusters.filter(c => {
      if (!c.biasDistribution) return false;
      const { left, right } = c.biasDistribution;
      return (left < 15 && right > 50) || (right < 15 && left > 50);
  });

  return (
    <div className="min-h-screen font-sans bg-[#F8F9FA] text-brand-black selection:bg-blue-100">
      
      <LeftSidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        keywords={keywords}
        onKeywordClick={handleTopicClick}
        onHomeClick={handleBack}
      />

      {/* 1. Header Section */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-16">
                {/* Left: Branding & Main Nav */}
                <div className="flex items-center gap-6">
                    <button 
                        className="text-gray-500 hover:text-black p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(true)}
                    >
                        <ICONS.Menu size={24} />
                    </button>
                    <div className="flex items-center space-x-2 cursor-pointer group" onClick={handleBack}>
                         <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-bold text-lg rounded-[4px] group-hover:bg-gray-800 transition-colors">G</div>
                         <span className="font-extrabold text-2xl tracking-tighter hidden sm:block font-sans">GROUND <span className="font-medium">NEWS</span></span>
                    </div>
                    
                    <nav className="hidden xl:flex space-x-2 ml-2 text-sm font-bold text-gray-500">
                        <a href="#" className={`px-4 py-2 rounded-full transition-colors ${view === 'home' ? 'text-black bg-gray-100' : 'hover:text-black hover:bg-gray-100'}`} onClick={handleBack}>Home</a>
                        <a href="#" className="hover:text-black hover:bg-gray-100 px-4 py-2 rounded-full transition-colors">For You</a>
                        <a href="#" className="hover:text-black hover:bg-gray-100 px-4 py-2 rounded-full transition-colors">Local</a>
                        <a href="#" className="hover:text-black hover:bg-gray-100 px-4 py-2 rounded-full transition-colors">Blindspot</a>
                    </nav>
                </div>

                {/* Right: Search & Auth */}
                <div className="flex items-center space-x-3">
                    <div className="hidden md:flex relative group">
                        <ICONS.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-600" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search" 
                            className="bg-gray-100 border border-transparent group-hover:border-gray-200 rounded-md py-2 pl-10 pr-4 text-sm w-48 xl:w-80 transition-all focus:ring-0 focus:border-gray-400 focus:bg-white placeholder-gray-500"
                        />
                    </div>
                    <button className="bg-black text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-sm">
                        Subscribe
                    </button>
                    <button className="hidden sm:block text-sm font-bold text-gray-600 hover:text-black px-4 py-2 border border-gray-200 rounded-md bg-white">
                        Login
                    </button>
                </div>
            </div>
            
            {/* Ticker / Sub Nav */}
            <div className="hidden md:flex items-center space-x-1 h-10 border-t border-gray-100 text-[11px] font-bold text-gray-500 tracking-wide overflow-x-auto no-scrollbar">
                {NAV_ITEMS.map((item, idx) => (
                    <a key={idx} href="#" className="whitespace-nowrap px-3 py-1 hover:text-black transition-colors border-r border-gray-100 last:border-0">{item}</a>
                ))}
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-8 pb-16">
        {view === 'topic' ? (
             <TopicPage 
                topic={selectedTopic} 
                clusters={topicClusters} // Removed fallback to safeClusters
                onClusterClick={handleClusterClick} 
                onBack={handleBack} 
            />
        ) : view === 'detail' && selectedCluster ? (
             <ClusterDetail cluster={selectedCluster} onBack={handleBack} />
        ) : (
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                {error ? (
                    <div className="max-w-md mx-auto bg-white border border-red-100 p-8 rounded-2xl shadow-sm text-center my-20">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ICONS.Blindspot className="text-red-500" size={24} />
                        </div>
                        <h2 className="text-gray-900 font-bold text-lg mb-2">Connection Issue</h2>
                        <p className="text-gray-500 mb-6 text-sm">We couldn't reach the news server.</p>
                        <button onClick={() => window.location.reload()} className="text-sm font-bold text-blue-600 hover:underline">Try Again</button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col justify-center items-center py-40 space-y-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-black"></div>
                        <span className="text-sm font-bold text-gray-400 animate-pulse">Loading Feed...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* --- LEFT COLUMN (3 cols) --- 
                            Daily Briefing & Top Stories List 
                        */}
                        <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
                            
                            {/* Daily Briefing Section */}
                            <section>
                                <h2 className="font-serif font-black text-xl text-gray-900 mb-4">Daily Briefing</h2>
                                {briefingStory ? (
                                    <ArticleCard 
                                        cluster={briefingStory} 
                                        variant="briefing"
                                        onClick={() => handleClusterClick(briefingStory)} 
                                    />
                                ) : (
                                    <div className="text-sm text-gray-400 italic mb-6">No briefing available</div>
                                )}
                            </section>

                            {/* Top News Stories List */}
                            <section>
                                <h2 className="font-serif font-black text-xl text-gray-900 mb-4">Top News Stories</h2>
                                <div className="space-y-4">
                                    {topStories.map(cluster => (
                                        <ArticleCard 
                                            key={cluster.id} 
                                            cluster={cluster} 
                                            variant="compact"
                                            onClick={() => handleClusterClick(cluster)}
                                        />
                                    ))}
                                    {topStories.length === 0 && (
                                         <div className="text-sm text-gray-400 italic">No top stories currently available</div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* --- CENTER COLUMN (6 cols - THICKEST) --- 
                            Hero & Main Feed 
                        */}
                        <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
                            {/* Hero Card */}
                            {heroStory ? (
                                <ArticleCard 
                                    cluster={heroStory} 
                                    variant="hero"
                                    onClick={() => handleClusterClick(heroStory)} 
                                />
                            ) : (
                                <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                    No featured stories in the last 24h
                                </div>
                            )}
                            
                            {/* Feed Items */}
                            <div className="space-y-6">
                                {feedStories.map(cluster => (
                                    <ArticleCard 
                                        key={cluster.id} 
                                        cluster={cluster} 
                                        variant="standard"
                                        onClick={() => handleClusterClick(cluster)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN (3 cols) --- 
                            Sidebar Widgets
                        */}
                        <div className="lg:col-span-3 space-y-6 order-3 lg:sticky lg:top-20">
                            <Sidebar blindspots={blindspots} />
                            
                            {/* Footer Links */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-gray-400">
                                    <a href="#" className="hover:text-gray-600">About</a>
                                    <a href="#" className="hover:text-gray-600">History</a>
                                    <a href="#" className="hover:text-gray-600">Mission</a>
                                    <a href="#" className="hover:text-gray-600">Blog</a>
                                    <a href="#" className="hover:text-gray-600">Methodology</a>
                                    <a href="#" className="hover:text-gray-600">Contact</a>
                                    <span className="w-full mt-2">© 2025 Ground News Clone</span>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default App;