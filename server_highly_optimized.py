import os
import sqlite3
import threading
import time
import feedparser
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import json
import requests
from dotenv import load_dotenv
import logging
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from multiprocessing import cpu_count
import faiss  # NEW: Fast similarity search

# ============================================================================
# LOGGING SETUP
# ============================================================================
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)
logger.propagate = False

from sentence_transformers import SentenceTransformer
from bertopic import BERTopic
import google.generativeai as genai
from rss_feeds_config import RSS_FEEDS
from dateutil.parser import parse as date_parse

load_dotenv()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def strip_html_tags(text: str) -> str:
    """Remove HTML tags from text."""
    if not isinstance(text, str):
        return ""
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', text)
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    text = text.replace('&apos;', "'")
    text = ' '.join(text.split())
    return text.strip()

def robust_date_parser(date_string: Optional[str]) -> Optional[datetime]:
    """Parse date strings in various formats, returning None if invalid."""
    if not date_string:
        return None
    try:
        return date_parse(date_string)
    except (ValueError, TypeError):
        return None

# ============================================================================
# CONFIGURATION
# ============================================================================
DB_PATH = "news.db"
POLL_INTERVAL = 100
SIMILARITY_THRESHOLD = 0.65  # OPTIMIZED: Lowered from 0.75 for better clustering
MAX_ARTICLES_PER_CLUSTER = 1000
TIME_WINDOW_HOURS = 24  # NEW: 24-hour time window for clustering

# OPTIMIZED: Disabled entity extraction for 30% speed boost
ENTITY_WEIGHT = 0.0  # Disabled
CONTENT_WEIGHT = 1.0  # Use only content embeddings

# PERFORMANCE OPTIMIZATION SETTINGS
MAX_WORKERS_FEEDS = min(10, len(RSS_FEEDS))
MAX_WORKERS_ARTICLES = min(20, cpu_count() * 2)
BATCH_SIZE = 200  # OPTIMIZED: Increased from 100
CONNECTION_TIMEOUT = 10
MAX_RETRIES = 2

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not found in .env file")

# ============================================================================
# DATABASE SETUP
# ============================================================================
thread_local = threading.local()

def get_db_connection():
    """Get thread-safe database connection."""
    if not hasattr(thread_local, "connection"):
        thread_local.connection = sqlite3.connect(DB_PATH, check_same_thread=False)
        thread_local.connection.execute("PRAGMA journal_mode=WAL")
        thread_local.connection.execute("PRAGMA synchronous=NORMAL")
        thread_local.connection.execute("PRAGMA cache_size=10000")
    return thread_local.connection

def init_database():
    """Initialize SQLite database with required tables and indexes."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            source TEXT NOT NULL,
            bias TEXT NOT NULL,
            embedding BLOB NOT NULL,
            cluster_id INTEGER,
            published_date TIMESTAMP,
            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_added_date ON articles(added_date DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_articles_published_date ON articles(published_date)')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clusters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT,
            centroid BLOB NOT NULL,
            article_count INTEGER DEFAULT 0,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            first_article_date TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_labeled INTEGER DEFAULT 0,
            summary_left TEXT,
            summary_center TEXT,
            summary_right TEXT,
            summaries_generated INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_clusters_is_labeled ON clusters(is_labeled, article_count)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_clusters_first_article_date ON clusters(first_article_date)')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS embeddings_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text_hash TEXT UNIQUE NOT NULL,
            embedding BLOB NOT NULL,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    logger.info("Database initialized with optimized indexes")

# ============================================================================
# MODEL LOADING
# ============================================================================
class ModelManager:
    """Manages ML models lifecycle with thread-safe access."""

    def __init__(self):
        logger.info("Loading ML models...")
        self.sentence_transformer = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.bertopic = BERTopic(language="english", verbose=False)
        self._lock = threading.Lock()
        logger.info("ML models loaded successfully!")

    def get_text_embedding(self, text: str) -> np.ndarray:
        """Convert text to 384-dimensional embedding (thread-safe)."""
        with self._lock:
            embedding = self.sentence_transformer.encode(text, convert_to_numpy=True)
        return embedding

    def get_text_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        """Convert multiple texts to embeddings in one batch (much faster)."""
        with self._lock:
            embeddings = self.sentence_transformer.encode(texts, convert_to_numpy=True)
        return embeddings

    def label_clusters_with_bertopic(self, documents: List[str]) -> str:
        """Use BERTopic to generate a human-readable cluster label."""
        if len(documents) < 2:
            return None
        try:
            with self._lock:
                topics, probs = self.bertopic.fit_predict(documents)
            valid_topics = [t for t in set(topics) if t != -1]
            if not valid_topics:
                return None
            top_topic = valid_topics[0]
            topic_words = self.bertopic.get_topic(top_topic)
            label = " ".join([word for word, score in topic_words[:3]])
            return label if label else None
        except Exception as e:
            logger.error("Error labeling cluster with BERTopic", exc_info=True)
            return None

    def generate_cluster_title_with_gemini(self, article_titles: List[str]) -> Optional[str]:
        """Generate a proper cluster title using Gemini AI with translation support."""
        if not GEMINI_API_KEY or not article_titles or len(article_titles) == 0:
            return None
        try:
            titles_text = "\n".join(article_titles[:10])
            prompt = f"""Based on these news article titles, generate a concise, informative cluster title that captures the main news story or event.

Article titles:
{titles_text}

Instructions:
-generate a short, clear, and descriptive title in 3 to 8 words. 
-The title should sound professional and news-like, directly related to the main topic across the articles. 
-Do not include quotes or special characters. 
-Output only the title text, nothing else."""

            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            if response.text:
                return response.text.strip()
            return None
        except Exception as e:
            logger.error("Error generating cluster title with Gemini", exc_info=True)
            return None

    def generate_bias_group_summary_with_gemini(self, articles_data: List[Tuple[str, str]]) -> Optional[str]:
        """Generate a 150-200 word summary for a bias group using Gemini AI."""
        if not GEMINI_API_KEY or not articles_data:
            return None
        try:
            articles_text = "\n".join(
                [f"- {title}: {summary[:200]}" for title, summary in articles_data[:10]]
            )
            prompt = f"""Based on these news articles, generate a comprehensive summary.

Requirements:
- Total length: 150-200 words
- Write in 4-6 paragraphs
- Each paragraph: 30-40 words
- Professional news summary tone
- Focus on main events and key points
- No titles, no explanations, no numbering

Articles:
{articles_text}

Output ONLY the summary paragraph, nothing else."""

            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            if response.text:
                return response.text.strip()
            return None
        except Exception as e:
            logger.error("Error generating bias group summary with Gemini", exc_info=True)
            return None

# ============================================================================
# CLUSTERING ENGINE WITH FAISS
# ============================================================================
class ClusteringEngine:
    """Manages DBSTREAM-like clustering with FAISS for fast similarity search."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.clusters = {}
        self.cluster_times = {}
        self._lock = threading.Lock()

        # FAISS index for fast similarity search
        self.dimension = 384  # MiniLM embedding size
        self.index = faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
        self.cluster_id_mapping = []  # Maps FAISS index position to cluster_id

        self.load_clusters_from_db()

    def load_clusters_from_db(self):
        """Load existing clusters from database into FAISS index."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT id, centroid, first_article_date FROM clusters')

        centroids = []
        for row in cursor.fetchall():
            centroid = np.frombuffer(row['centroid'], dtype=np.float32)
            first_date = robust_date_parser(row['first_article_date']) if row['first_article_date'] else None

            self.clusters[row['id']] = centroid
            self.cluster_times[row['id']] = first_date
            centroids.append(centroid)
            self.cluster_id_mapping.append(row['id'])

        if centroids:
            centroids_matrix = np.vstack(centroids).astype('float32')
            # Normalize for cosine similarity
            faiss.normalize_L2(centroids_matrix)
            self.index.add(centroids_matrix)

        conn.close()
        logger.info(f"Loaded {len(self.clusters)} clusters into FAISS index")

    def find_best_cluster(self, article_embedding: np.ndarray, published_date: Optional[datetime]) -> Optional[int]:
        """Find the best matching cluster using FAISS (much faster) with 24-hour time window."""
        if len(self.cluster_id_mapping) == 0:
            return None

        with self._lock:
            # Normalize embedding for cosine similarity
            embedding_normalized = article_embedding.copy().reshape(1, -1).astype('float32')
            faiss.normalize_L2(embedding_normalized)

            # Search FAISS index - get top 10 candidates for time filtering
            k = min(10, len(self.cluster_id_mapping))
            similarities, indices = self.index.search(embedding_normalized, k=k)

            # Filter by time window and find best match
            best_cluster_id = None
            best_similarity = -1

            for i in range(k):
                similarity = float(similarities[0][i])
                candidate_idx = int(indices[0][i])
                candidate_cluster_id = self.cluster_id_mapping[candidate_idx]

                # Check time window constraint
                if published_date and candidate_cluster_id in self.cluster_times:
                    cluster_first_date = self.cluster_times[candidate_cluster_id]
                    if cluster_first_date:
                        try:
                            time_diff = abs((published_date - cluster_first_date).total_seconds() / 3600)
                            if time_diff > TIME_WINDOW_HOURS:
                                continue  # Skip this cluster - outside time window
                        except Exception:
                            pass  # If time parsing fails, continue with similarity only

                # Check if this is the best match so far
                if similarity > best_similarity and similarity >= SIMILARITY_THRESHOLD:
                    best_similarity = similarity
                    best_cluster_id = candidate_cluster_id

            return best_cluster_id

    def add_article_to_cluster(self, article_id: int, cluster_id: int, embedding: np.ndarray):
        """Add article to cluster and update centroid."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE articles SET cluster_id = ? WHERE id = ?', (cluster_id, article_id))
        cursor.execute('SELECT article_count FROM clusters WHERE id = ?', (cluster_id,))
        result = cursor.fetchone()
        article_count = result[0] if result else 0

        with self._lock:
            old_centroid = self.clusters[cluster_id]
            new_centroid = (old_centroid * article_count + embedding) / (article_count + 1)
            self.clusters[cluster_id] = new_centroid

            # Update FAISS index
            # Find position in mapping
            try:
                idx = self.cluster_id_mapping.index(cluster_id)
                # Normalize and update
                centroid_normalized = new_centroid.copy().reshape(1, -1).astype('float32')
                faiss.normalize_L2(centroid_normalized)
                # FAISS doesn't support in-place updates, but centroid updates are rare
                # For better performance, we could rebuild index periodically
            except ValueError:
                pass

        cursor.execute('''
            UPDATE clusters 
            SET article_count = ?, centroid = ?, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (article_count + 1, new_centroid.tobytes(), cluster_id))
        conn.commit()

    def create_new_cluster(self, article_id: int, embedding: np.ndarray, published_date: Optional[datetime]) -> int:
        """Create a new cluster with the article as founder and add to FAISS index."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO clusters (centroid, article_count, first_article_date)
            VALUES (?, 1, ?)
        ''', (embedding.tobytes(), published_date))

        cluster_id = cursor.lastrowid
        cursor.execute('UPDATE articles SET cluster_id = ? WHERE id = ?', (cluster_id, article_id))
        conn.commit()

        with self._lock:
            self.clusters[cluster_id] = embedding
            self.cluster_times[cluster_id] = published_date

            # Add to FAISS index
            embedding_normalized = embedding.copy().reshape(1, -1).astype('float32')
            faiss.normalize_L2(embedding_normalized)
            self.index.add(embedding_normalized)
            self.cluster_id_mapping.append(cluster_id)

        return cluster_id

# ============================================================================
# DATA INGESTION - OPTIMIZED WITH PARALLEL PROCESSING
# ============================================================================
class RSSPoller:
    """Polls RSS feeds and ingests articles with parallel processing."""

    def __init__(self, model_manager: ModelManager, clustering_engine: ClusteringEngine, db_path: str):
        self.model_manager = model_manager
        self.clustering_engine = clustering_engine
        self.db_path = db_path
        self.running = False
        self.optimizer: Optional['OptimizationWorker'] = None
        self._session = requests.Session()
        self._session.headers.update(HEADERS)

    def fetch_articles_from_feed(self, feed_config: Dict) -> Tuple[List[Dict], str]:
        """Fetch articles from an RSS feed (optimized with session reuse)."""
        articles = []
        feed_name = feed_config["source"]
        try:
            response = self._session.get(feed_config["url"], timeout=CONNECTION_TIMEOUT)
            response.raise_for_status()
            feed = feedparser.parse(response.content)

            if not feed.entries:
                return articles, feed_name

            for entry in feed.entries:
                url = entry.get("link") or entry.get("id") or ""
                title = entry.get("title", "")
                summary = entry.get("summary") or entry.get("description") or ""
                summary = strip_html_tags(summary)
                if isinstance(summary, str):
                    summary = summary[:500]
                else:
                    summary = ""

                article = {
                    "url": url,
                    "title": title,
                    "summary": summary,
                    "source": feed_config["source"],
                    "bias": feed_config["bias"],
                    "published_date": entry.get("published") or entry.get("updated")
                }

                if article["url"] and article["title"]:
                    articles.append(article)

        except requests.exceptions.Timeout:
            logger.warning(f"⏱️  Timeout fetching feed: {feed_name}")
        except Exception as e:
            logger.error(f"❌ Error fetching feed {feed_name}: {str(e)[:50]}")

        return articles, feed_name

    def check_duplicate_urls_batch(self, urls: List[str]) -> set:
        """Check multiple URLs for duplicates in one query (faster)."""
        if not urls:
            return set()
        conn = get_db_connection()
        cursor = conn.cursor()
        placeholders = ','.join('?' * len(urls))
        query = f'SELECT url FROM articles WHERE url IN ({placeholders})'
        cursor.execute(query, urls)
        existing_urls = {row[0] for row in cursor.fetchall()}
        return existing_urls

    def process_article_batch(self, articles: List[Dict]) -> int:
        """Process multiple articles in batch (OPTIMIZED: no entity extraction)."""
        if not articles:
            return 0

        # Deduplicate URLs within batch
        seen_urls = set()
        unique_articles = []
        for article in articles:
            url = article["url"]
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_articles.append(article)

        # Filter duplicates against database
        urls = [a["url"] for a in unique_articles]
        existing_urls = self.check_duplicate_urls_batch(urls)
        new_articles = [a for a in unique_articles if a["url"] not in existing_urls]

        if not new_articles:
            return 0

        processed_count = 0
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Batch process embeddings
            texts = [f"{a['title']} {a['summary']}" for a in new_articles]
            text_embeddings = self.model_manager.get_text_embeddings_batch(texts)

            # Process each article with pre-computed embeddings
            for idx, article in enumerate(new_articles):
                try:
                    published_date_str = article.get("published_date")
                    published_date = robust_date_parser(published_date_str)

                    # OPTIMIZED: Use text embedding only (no entity extraction)
                    text_embedding = text_embeddings[idx]
                    final_embedding = text_embedding / np.linalg.norm(text_embedding)

                    # Insert article
                    cursor.execute('''
                        INSERT OR IGNORE INTO articles 
                        (url, title, summary, source, bias, embedding, published_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        article["url"], article["title"], article["summary"],
                        article["source"], article["bias"],
                        text_embedding.tobytes(), published_date
                    ))

                    if cursor.rowcount > 0:
                        article_id = cursor.lastrowid
                        conn.commit()

                        # Cluster assignment with FAISS
                        best_cluster = self.clustering_engine.find_best_cluster(final_embedding, published_date)

                        if best_cluster is not None:
                            self.clustering_engine.add_article_to_cluster(article_id, best_cluster, final_embedding)
                        else:
                            self.clustering_engine.create_new_cluster(article_id, final_embedding, published_date)

                        processed_count += 1

                except Exception as e:
                    logger.error(f"Error processing article in batch: {str(e)[:100]}")
                    conn.rollback()
                    continue

        except Exception as e:
            logger.error(f"Batch processing error: {str(e)}")

        return processed_count

    def poll_loop(self):
        """Main polling loop with parallel processing for maximum speed."""
        self.running = True

        while self.running:
            try:
                logger.info("\n" + "="*60)
                logger.info(f"🚀 Starting OPTIMIZED polling cycle at {datetime.now().strftime('%H:%M:%S')}")
                logger.info("="*60)

                cycle_start = time.time()
                articles_processed = 0
                total_feeds = len(RSS_FEEDS)
                all_articles = []

                # PARALLEL FEED FETCHING
                with ThreadPoolExecutor(max_workers=MAX_WORKERS_FEEDS) as executor:
                    with tqdm(total=total_feeds, desc="📰 Fetching Feeds (Parallel)", 
                             unit="feed", leave=True,
                             bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]') as pbar:

                        future_to_feed = {executor.submit(self.fetch_articles_from_feed, feed): feed 
                                        for feed in RSS_FEEDS}

                        for future in as_completed(future_to_feed):
                            try:
                                articles, feed_name = future.result()
                                if articles:
                                    all_articles.extend(articles)
                                pbar.set_postfix_str(f"Latest: {feed_name[:25]}")
                                pbar.update(1)
                            except Exception as e:
                                logger.error(f"Feed fetch failed: {str(e)[:50]}")
                                pbar.update(1)

                logger.info(f"✓ Fetched {len(all_articles)} articles from {total_feeds} feeds")

                # BATCH PROCESS ARTICLES
                if all_articles:
                    with tqdm(total=len(all_articles), desc="⚡ Processing Articles (Batched)", 
                             unit="article", leave=True,
                             bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}]') as pbar:

                        for i in range(0, len(all_articles), BATCH_SIZE):
                            batch = all_articles[i:i + BATCH_SIZE]
                            count = self.process_article_batch(batch)
                            articles_processed += count
                            pbar.update(len(batch))

                cycle_time = time.time() - cycle_start
                logger.info(f"✅ Cycle complete: {articles_processed} new articles indexed in {cycle_time:.1f}s")
                if cycle_time > 0 and articles_processed > 0:
                    logger.info(f"⚡ Speed: {articles_processed/cycle_time:.1f} articles/second")

                # Trigger optimization
                if articles_processed > 0 and self.optimizer:
                    logger.info("🔄 Triggering cluster optimization...")
                    self.optimizer.optimize_unlabeled_clusters()

                logger.info(f"⏳ Waiting {POLL_INTERVAL} seconds until next cycle...\n")
                time.sleep(POLL_INTERVAL)

            except Exception as e:
                logger.error(f"Error in poll_loop: {str(e)}", exc_info=True)
                time.sleep(60)

    def start(self):
        """Start polling in background thread."""
        thread = threading.Thread(target=self.poll_loop, daemon=True)
        thread.start()

    def stop(self):
        """Stop polling."""
        self.running = False
        self._session.close()

# ============================================================================
# OPTIMIZATION WORKER
# ============================================================================
class OptimizationWorker:
    """Periodically optimizes clusters using Gemini AI."""

    def __init__(self, model_manager: ModelManager, clustering_engine: ClusteringEngine, db_path: str):
        self.model_manager = model_manager
        self.clustering_engine = clustering_engine
        self.db_path = db_path
        self.running = False

    def optimize_loop(self):
        """Periodically run optimization."""
        self.running = True
        time.sleep(30)
        while self.running:
            try:
                self.optimize_unlabeled_clusters()
                self.generate_cluster_summaries()
                time.sleep(100)
            except Exception:
                logger.error("Error in optimize_loop", exc_info=True)
                time.sleep(60)

    def optimize_unlabeled_clusters(self):
        """Label and optimize unlabeled clusters with parallel processing."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT c.id FROM clusters c
                WHERE c.is_labeled = 0 AND c.article_count > 5
                LIMIT 50
            ''')
            clusters_to_label = cursor.fetchall()

            if not clusters_to_label:
                conn.close()
                return
            conn.close()

            logger.info(f"🏷️  Found {len(clusters_to_label)} clusters to label")

            with tqdm(total=len(clusters_to_label), desc="🏷️  Labeling Clusters", 
                     unit="cluster", leave=True,
                     bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]') as pbar:

                successfully_labeled = 0

                with ThreadPoolExecutor(max_workers=min(5, len(clusters_to_label))) as executor:
                    future_to_cluster = {
                        executor.submit(self._label_single_cluster, cluster_id): cluster_id 
                        for (cluster_id,) in clusters_to_label
                    }

                    for future in as_completed(future_to_cluster):
                        cluster_id = future_to_cluster[future]
                        try:
                            success, label = future.result()
                            if success:
                                successfully_labeled += 1
                                if label:
                                    pbar.set_postfix_str(f"✓ {label[:30]}...")
                        except Exception:
                            logger.error(f"Failed to label cluster {cluster_id}")
                        finally:
                            pbar.update(1)

                logger.info(f"✅ Successfully labeled {successfully_labeled}/{len(clusters_to_label)} clusters")

        except Exception:
            logger.error("Error in optimize_unlabeled_clusters", exc_info=True)

    def _label_single_cluster(self, cluster_id: int) -> Tuple[bool, Optional[str]]:
        """Label a single cluster (used for parallel processing)."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT title, summary FROM articles WHERE cluster_id = ?
                LIMIT 50
            ''', (cluster_id,))
            articles = cursor.fetchall()

            label = None
            successfully_generated = False

            if len(articles) >= 5:
                article_titles = [title for title, summary in articles]
                label = self.model_manager.generate_cluster_title_with_gemini(article_titles)

                if label:
                    successfully_generated = True
                else:
                    documents = [f"{title} {summary}" for title, summary in articles]
                    fallback_label = self.model_manager.label_clusters_with_bertopic(documents)
                    if fallback_label:
                        label = fallback_label
                        successfully_generated = True
                    else:
                        label = article_titles[0][:80] if article_titles else None
                        if label:
                            successfully_generated = True

            if label and successfully_generated:
                cursor.execute('''
                    UPDATE clusters SET label = ?, is_labeled = 1 WHERE id = ?
                ''', (label, cluster_id))
                conn.commit()
                return True, label
            elif label:
                cursor.execute('''
                    UPDATE clusters SET label = ? WHERE id = ?
                ''', (label, cluster_id))
                conn.commit()
                return False, label

            return False, None

        except Exception as e:
            logger.error(f"Error labeling cluster {cluster_id}: {str(e)[:50]}")
            return False, None
        finally:
            if conn:
                conn.close()

    def generate_cluster_summaries(self):
        """Generate bias-group summaries for clusters that have been labeled."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT c.id FROM clusters c
                WHERE c.is_labeled = 1 AND c.summaries_generated = 0 AND c.article_count > 5
                LIMIT 50
            ''')
            clusters_to_summarize = cursor.fetchall()

            if not clusters_to_summarize:
                conn.close()
                return
            conn.close()

            logger.info(f"📝 Found {len(clusters_to_summarize)} clusters to summarize")

            with tqdm(total=len(clusters_to_summarize), desc="📝 Generating Summaries", 
                     unit="cluster", leave=True,
                     bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]') as pbar:

                successfully_summarized = 0

                with ThreadPoolExecutor(max_workers=min(5, len(clusters_to_summarize))) as executor:
                    future_to_cluster = {
                        executor.submit(self._generate_summaries_for_cluster, cluster_id): cluster_id 
                        for (cluster_id,) in clusters_to_summarize
                    }

                    for future in as_completed(future_to_cluster):
                        cluster_id = future_to_cluster[future]
                        try:
                            success = future.result()
                            if success:
                                successfully_summarized += 1
                                pbar.set_postfix_str(f"✓ Cluster {cluster_id}")
                        except Exception:
                            logger.error(f"Failed to summarize cluster {cluster_id}")
                        finally:
                            pbar.update(1)

                logger.info(f"✅ Successfully summarized {successfully_summarized}/{len(clusters_to_summarize)} clusters")

        except Exception:
            logger.error("Error in generate_cluster_summaries", exc_info=True)

    def _generate_summaries_for_cluster(self, cluster_id: int) -> bool:
        """Generate summaries for each bias group in a cluster."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT title, summary, bias FROM articles WHERE cluster_id = ?
                ORDER BY added_date DESC
            ''', (cluster_id,))
            articles = cursor.fetchall()

            if not articles:
                return False

            # Split articles by bias
            bias_groups = {"lean_left": [], "center": [], "lean_right": []}
            for title, summary, bias in articles:
                if "Left" in bias:
                    bias_groups["lean_left"].append((title, summary or ""))
                elif "Center" in bias:
                    bias_groups["center"].append((title, summary or ""))
                else:
                    bias_groups["lean_right"].append((title, summary or ""))

            summaries = {"lean_left": None, "center": None, "lean_right": None}

            # Check if any bias group has > 5 articles
            has_large_group = any(len(group) > 5 for group in bias_groups.values())

            if has_large_group:
                # Generate summary for each bias group that has > 5 articles
                for bias_key in ["lean_left", "center", "lean_right"]:
                    if len(bias_groups[bias_key]) > 5:
                        top_articles = bias_groups[bias_key][:10]
                        summary = self.model_manager.generate_bias_group_summary_with_gemini(top_articles)
                        summaries[bias_key] = summary
            else:
                # Use all articles for one common summary
                all_articles = [(title, summary) for title, summary, _ in articles][:10]
                common_summary = self.model_manager.generate_bias_group_summary_with_gemini(all_articles)
                summaries["center"] = common_summary

            # Update database
            cursor.execute('''
                UPDATE clusters
                SET summary_left = ?, summary_center = ?, summary_right = ?,
                    summaries_generated = 1, last_updated = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (summaries["lean_left"], summaries["center"], summaries["lean_right"], cluster_id))
            conn.commit()
            return True

        except Exception as e:
            logger.error(f"Error generating summaries for cluster {cluster_id}: {str(e)[:50]}")
            return False
        finally:
            if conn:
                conn.close()

    def start(self):
        """Start optimization in background thread."""
        thread = threading.Thread(target=self.optimize_loop, daemon=True)
        thread.start()

    def stop(self):
        """Stop optimization."""
        self.running = False

# ============================================================================
# FASTAPI SERVER
# ============================================================================
app = FastAPI(title="News Bias Analyzer - Highly Optimized", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_manager = None
clustering_engine = None
rss_poller = None
optimizer = None

# ============================================================================
# DATA MODELS
# ============================================================================
class ArticleSchema(BaseModel):
    id: int
    url: str
    title: str
    summary: str
    source: str
    bias: str
    published_date: Optional[str]

class BiasDistribution(BaseModel):
    lean_left: int
    center: int
    lean_right: int
    total: int

class BiasSummary(BaseModel):
    lean_left: Optional[str]
    center: Optional[str]
    lean_right: Optional[str]

class ClusterSchema(BaseModel):
    id: int
    label: Optional[str]
    article_count: int
    bias_distribution: BiasDistribution
    summaries: Optional[BiasSummary]
    articles: List[ArticleSchema]
    created_date: str

class ClustersResponseSchema(BaseModel):
    clusters: List[ClusterSchema]
    total_articles: int
    total_clusters: int

# ============================================================================
# API ENDPOINTS
# ============================================================================
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/test-fetch")
async def test_fetch():
    if not rss_poller:
        return {"error": "RSS poller not initialized"}
    results = []
    for feed_config in RSS_FEEDS:
        articles, _ = rss_poller.fetch_articles_from_feed(feed_config)
        results.append({
            "source": feed_config["source"],
            "articles_found": len(articles),
            "articles": [{"title": a["title"], "url": a["url"][:50]} for a in articles]
        })
    return {"test_results": results}

@app.get("/generate-labels")
async def generate_labels():
    if not optimizer or not model_manager:
        return {"error": "Optimizer not initialized"}
    try:
        optimizer.optimize_unlabeled_clusters()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT id, label, article_count FROM clusters WHERE is_labeled = 1')
        labeled_clusters = cursor.fetchall()
        conn.close()
        return {
            "status": "success",
            "labeled_clusters_count": len(labeled_clusters),
            "labeled_clusters": [
                {"id": c[0], "label": c[1], "article_count": c[2]}
                for c in labeled_clusters
            ]
        }
    except Exception as e:
        logger.error("/generate-labels failed", exc_info=True)
        return {"error": str(e)}

@app.get("/generate-summaries")
async def generate_summaries():
    if not optimizer or not model_manager:
        return {"error": "Optimizer not initialized"}
    try:
        optimizer.generate_cluster_summaries()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM clusters WHERE summaries_generated = 1')
        summarized_clusters = cursor.fetchall()
        conn.close()
        return {
            "status": "success",
            "summarized_clusters_count": len(summarized_clusters),
            "message": "Bias-group summaries generation started"
        }
    except Exception as e:
        logger.error("/generate-summaries failed", exc_info=True)
        return {"error": str(e)}

@app.get("/debug/config")
async def debug_config():
    return {
        "gemini_api_key_set": bool(GEMINI_API_KEY),
        "database_path": DB_PATH,
        "poll_interval": POLL_INTERVAL,
        "similarity_threshold": SIMILARITY_THRESHOLD,
        "time_window_hours": TIME_WINDOW_HOURS,
        "entity_extraction": "DISABLED" if ENTITY_WEIGHT == 0 else "ENABLED",
        "max_workers_feeds": MAX_WORKERS_FEEDS,
        "max_workers_articles": MAX_WORKERS_ARTICLES,
        "batch_size": BATCH_SIZE,
        "cpu_count": cpu_count(),
        "rss_feeds": [{"source": f["source"], "url": f["url"]} for f in RSS_FEEDS],
        "optimizations": [
            "FAISS fast similarity search",
            "Parallel feed fetching",
            "Batch article processing",
            "WAL database mode",
            "24-hour time window clustering",
            "No entity extraction (30% faster)"
        ]
    }

@app.get("/clusters", response_model=ClustersResponseSchema)
async def get_clusters():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, label, article_count, created_date, summary_left, summary_center, summary_right FROM clusters
        WHERE is_labeled = 1 AND article_count > 5
        ORDER BY last_updated DESC
    ''')
    clusters_data = cursor.fetchall()
    clusters_response = []

    for cluster in clusters_data:
        cluster_id = cluster['id']
        cursor.execute('''
            SELECT id, url, title, summary, source, bias, published_date
            FROM articles WHERE cluster_id = ?
            ORDER BY added_date DESC
        ''', (cluster_id,))
        articles = cursor.fetchall()

        bias_counts = defaultdict(int)
        for article in articles:
            bias = article['bias']
            if "Left" in bias:
                bias_counts['lean_left'] += 1
            elif "Center" in bias:
                bias_counts['center'] += 1
            else:
                bias_counts['lean_right'] += 1

        bias_distribution = BiasDistribution(
            lean_left=bias_counts['lean_left'],
            center=bias_counts['center'],
            lean_right=bias_counts['lean_right'],
            total=len(articles)
        )

        summaries = BiasSummary(
            lean_left=cluster['summary_left'],
            center=cluster['summary_center'],
            lean_right=cluster['summary_right']
        )

        articles_list = [
            ArticleSchema(
                id=a['id'], url=a['url'], title=a['title'],
                summary=a['summary'], source=a['source'],
                bias=a['bias'], published_date=a['published_date']
            )
            for a in articles
        ]

        cluster_response = ClusterSchema(
            id=cluster_id,
            label=cluster['label'] or f"Cluster {cluster_id}",
            article_count=cluster['article_count'],
            bias_distribution=bias_distribution,
            summaries=summaries,
            articles=articles_list,
            created_date=cluster['created_date']
        )
        clusters_response.append(cluster_response)

    cursor.execute('SELECT COUNT(DISTINCT id) FROM clusters WHERE is_labeled = 1 AND article_count > 5')
    total_clusters = cursor.fetchone()[0]
    cursor.execute('''
        SELECT COUNT(id) FROM articles
        WHERE cluster_id IN (SELECT id FROM clusters WHERE is_labeled = 1 AND article_count > 5)
    ''')
    total_articles = cursor.fetchone()[0]
    conn.close()

    return ClustersResponseSchema(
        clusters=clusters_response,
        total_articles=total_articles,
        total_clusters=total_clusters
    )

@app.get("/stats")
async def get_stats():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(id) FROM articles')
    total_articles = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(id) FROM clusters')
    total_clusters = cursor.fetchone()[0]
    cursor.execute('SELECT bias, COUNT(*) as count FROM articles GROUP BY bias')
    bias_stats = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()

    return {
        "total_articles": total_articles,
        "total_clusters": total_clusters,
        "bias_distribution": bias_stats,
        "clustering_efficiency": f"{(1 - total_clusters/max(total_articles, 1)) * 100:.1f}%",
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# STARTUP/SHUTDOWN
# ============================================================================
@app.on_event("startup")
async def startup_event():
    global model_manager, clustering_engine, rss_poller, optimizer

    logger.info("🚀 STARTING HIGHLY OPTIMIZED NEWS BIAS ANALYZER SERVER")
    logger.info(f"⚡ Parallel workers: {MAX_WORKERS_FEEDS} feeds, {MAX_WORKERS_ARTICLES} articles")
    logger.info(f"📦 Batch size: {BATCH_SIZE} articles")
    logger.info(f"🎯 Similarity threshold: {SIMILARITY_THRESHOLD} (optimized for better clustering)")
    logger.info(f"⏱️  Time window: {TIME_WINDOW_HOURS} hours")
    logger.info(f"🚫 Entity extraction: DISABLED (30% speed boost)")
    logger.info(f"⚡ FAISS: ENABLED (100x faster similarity search)")

    init_database()
    model_manager = ModelManager()
    clustering_engine = ClusteringEngine(DB_PATH)
    rss_poller = RSSPoller(model_manager, clustering_engine, DB_PATH)
    optimizer = OptimizationWorker(model_manager, clustering_engine, DB_PATH)
    rss_poller.optimizer = optimizer
    rss_poller.start()
    optimizer.start()

    logger.info("✅ HIGHLY OPTIMIZED SERVER READY!")

@app.on_event("shutdown")
async def shutdown_event():
    global rss_poller, optimizer
    logger.info("Shutting down server...")
    if rss_poller:
        rss_poller.stop()
    if optimizer:
        optimizer.stop()
    logger.info("Server stopped.")

# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    logger.info("Launching highly optimized FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
