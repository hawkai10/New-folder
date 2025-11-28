"""
Keyword Assignment Script using Sentence Transformers
Author: Auto-generated
Date: 2025-11-28

This script assigns keywords from a predefined list to articles based on
their titles and summaries using semantic similarity.
"""

from sentence_transformers import SentenceTransformer, util
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple
import sqlite3
import json

class KeywordAssigner:
    """
    Assigns keywords to articles using sentence transformer embeddings
    and cosine similarity.
    """

    def __init__(self, model_name='all-MiniLM-L6-v2', model=None):
        """
        Initialize the keyword assigner with a sentence transformer model.

        Args:
            model_name: HuggingFace model name (default: all-MiniLM-L6-v2)
                       Options: 'all-MiniLM-L6-v2' (fast, lightweight)
                               'all-mpnet-base-v2' (better quality, slower)
            model: An existing SentenceTransformer model instance. If provided,
                   model_name is ignored.
        """
        if model:
            self.model = model
            print("Using existing SentenceTransformer model.")
        else:
            print(f"Loading model: {model_name}...")
            self.model = SentenceTransformer(model_name)
        self.keywords = None
        self.keyword_embeddings = None

    def load_keywords(self, keywords: List[str]):
        """
        Load keywords and generate their embeddings.

        Args:
            keywords: List of keyword strings
        """
        print(f"Loading {len(keywords)} keywords...")
        self.keywords = keywords
        self.keyword_embeddings = self.model.encode(
            keywords, 
            convert_to_tensor=True,
            show_progress_bar=True
        )
        print("Keywords loaded and embedded successfully!")

    def load_keywords_from_file(self, filepath: str):
        """
        Load keywords from a text file (one keyword per line).

        Args:
            filepath: Path to keywords file
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            keywords = [line.strip() for line in f if line.strip()]
        self.load_keywords(keywords)

    def load_keywords_from_csv(self, filepath: str, column_name: str = 'keyword'):
        """
        Load keywords from a CSV file.

        Args:
            filepath: Path to CSV file
            column_name: Name of the column containing keywords
        """
        df = pd.read_csv(filepath)
        keywords = df[column_name].tolist()
        self.load_keywords(keywords)

    def load_keywords_from_db(self, db_path: str, query: str):
        """
        Load keywords from SQLite database.

        Args:
            db_path: Path to SQLite database
            query: SQL query to fetch keywords (should return single column)
        """
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(query)
        keywords = [row[0] for row in cursor.fetchall()]
        conn.close()
        self.load_keywords(keywords)

    def assign_keywords(
        self, 
        title: str, 
        summary: str, 
        top_k: int = 3, 
        threshold: float = 0.3
    ) -> List[Tuple[str, float]]:
        """
        Assign keywords to a single article.

        Args:
            title: Article title
            summary: Article summary/description
            top_k: Number of keywords to assign (default: 3)
            threshold: Minimum similarity score 0-1 (default: 0.3)

        Returns:
            List of tuples (keyword, similarity_score)
        """
        if self.keywords is None:
            raise ValueError("Keywords not loaded. Call load_keywords() first.")

        # Combine title and summary
        article_text = f"{title}. {summary}"

        # Generate article embedding
        article_embedding = self.model.encode(article_text, convert_to_tensor=True)

        # Calculate cosine similarities
        similarities = util.cos_sim(article_embedding, self.keyword_embeddings)[0]

        # Get top-k indices
        top_indices = np.argsort(similarities.cpu().numpy())[::-1][:top_k]

        # Filter by threshold and return keywords with scores
        results = []
        for idx in top_indices:
            score = similarities[idx].item()
            if score >= threshold:
                results.append((self.keywords[idx], score))

        return results

    def assign_keywords_batch(
        self, 
        articles: List[Dict], 
        top_k: int = 3, 
        threshold: float = 0.3,
        batch_size: int = 32
    ) -> List[Dict]:
        """
        Assign keywords to multiple articles efficiently.

        Args:
            articles: List of dicts with 'title' and 'summary' keys
            top_k: Number of keywords to assign per article
            threshold: Minimum similarity score
            batch_size: Batch size for encoding (default: 32)

        Returns:
            List of dicts with article info and assigned keywords
        """
        if self.keywords is None:
            raise ValueError("Keywords not loaded. Call load_keywords() first.")

        print(f"Processing {len(articles)} articles...")

        # Combine titles and summaries
        article_texts = [f"{art['title']}. {art['summary']}" for art in articles]

        # Generate embeddings for all articles
        article_embeddings = self.model.encode(
            article_texts, 
            convert_to_tensor=True,
            batch_size=batch_size,
            show_progress_bar=True
        )

        # Calculate similarities for all articles at once
        similarities = util.cos_sim(article_embeddings, self.keyword_embeddings)

        results = []
        for i, article in enumerate(articles):
            # Get top-k indices for this article
            top_indices = np.argsort(similarities[i].cpu().numpy())[::-1][:top_k]

            # Filter by threshold
            assigned_keywords = []
            for idx in top_indices:
                score = similarities[i][idx].item()
                if score >= threshold:
                    assigned_keywords.append({
                        'keyword': self.keywords[idx],
                        'score': round(score, 4)
                    })

            result = {
                'id': article.get('id'),
                'title': article['title'],
                'summary': article['summary'],
                'assigned_keywords': assigned_keywords
            }
            results.append(result)

        return results

    def save_results_to_csv(self, results: List[Dict], output_path: str):
        """
        Save assignment results to CSV.

        Args:
            results: Output from assign_keywords_batch()
            output_path: Path to save CSV file
        """
        rows = []
        for result in results:
            for kw in result['assigned_keywords']:
                rows.append({
                    'article_id': result['id'],
                    'title': result['title'],
                    'keyword': kw['keyword'],
                    'score': kw['score']
                })

        df = pd.DataFrame(rows)
        df.to_csv(output_path, index=False)
        print(f"Results saved to {output_path}")

    def save_results_to_db(self, results: List[Dict], db_path: str, table_name: str = 'article_keywords'):
        """
        Save assignment results to SQLite database.

        Args:
            results: Output from assign_keywords_batch()
            db_path: Path to SQLite database
            table_name: Name of table to create/insert into
        """
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create table if not exists
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                article_id INTEGER,
                keyword TEXT,
                score REAL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert results
        for result in results:
            for kw in result['assigned_keywords']:
                cursor.execute(
                    f"INSERT INTO {table_name} (article_id, keyword, score) VALUES (?, ?, ?)",
                    (result['id'], kw['keyword'], kw['score'])
                )

        conn.commit()
        conn.close()
        print(f"Results saved to database: {db_path}, table: {table_name}")


# Example Usage
if __name__ == "__main__":

    # Initialize the assigner
    assigner = KeywordAssigner(model_name='all-MiniLM-L6-v2')

    # Example 1: Load keywords from a list
    keywords = [
        "artificial intelligence",
        "machine learning",
        "data science",
        "cybersecurity",
        "blockchain",
        "cloud computing",
        "web development",
        "mobile apps",
        "fintech",
        "healthcare technology",
        "climate change",
        "renewable energy",
        "cryptocurrency",
        "5G technology",
        "quantum computing"
    ]
    assigner.load_keywords(keywords)

    # Example 2: Load articles (mock data)
    articles = [
        {
            "id": 1,
            "title": "New AI Model Beats Human Performance",
            "summary": "Researchers developed a machine learning algorithm that outperforms humans in image recognition tasks using deep neural networks."
        },
        {
            "id": 2,
            "title": "Solar Power Costs Drop 50%",
            "summary": "New solar panel technology has reduced costs dramatically, making renewable energy more accessible to developing nations."
        },
        {
            "id": 3,
            "title": "Major Bank Launches Digital Wallet",
            "summary": "Leading financial institution introduces blockchain-based payment system for instant transactions and cryptocurrency support."
        },
        {
            "id": 4,
            "title": "Hospital Uses AI for Diagnosis",
            "summary": "Healthcare providers are implementing artificial intelligence systems to assist doctors in diagnosing diseases more accurately."
        },
        {
            "id": 5,
            "title": "New React Framework Released",
            "summary": "Web developers can now build faster applications with the latest JavaScript framework update featuring improved performance."
        }
    ]

    # Assign keywords to all articles
    results = assigner.assign_keywords_batch(
        articles, 
        top_k=3,           # Assign top 3 keywords
        threshold=0.25     # Minimum similarity score
    )

    # Display results
    print("\n" + "="*80)
    print("KEYWORD ASSIGNMENT RESULTS")
    print("="*80)
    for result in results:
        print(f"\nArticle {result['id']}: {result['title']}")
        print(f"Assigned Keywords:")
        for kw in result['assigned_keywords']:
            print(f"  - {kw['keyword']}: {kw['score']:.3f}")

    # Save results
    # assigner.save_results_to_csv(results, 'keyword_assignments.csv')
    # assigner.save_results_to_db(results, 'articles.db', 'article_keywords')

    print("\n" + "="*80)
    print("Processing complete!")


    # ============================================================
    # INTEGRATION EXAMPLES FOR YOUR DATABASE
    # ============================================================

    print("\n\n" + "="*80)
    print("INTEGRATION EXAMPLES")
    print("="*80)

    integration_examples = """

    # Example 1: Load keywords from your SQLite database
    assigner = KeywordAssigner()
    assigner.load_keywords_from_db(
        db_path='your_database.db',
        query='SELECT keyword_name FROM keywords_table'
    )

    # Example 2: Load articles from your database
    import sqlite3
    conn = sqlite3.connect('your_database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, summary FROM articles')
    articles = []
    for row in cursor.fetchall():
        articles.append({
            'id': row[0],
            'title': row[1],
            'summary': row[2]
        })
    conn.close()

    # Example 3: Process and save back to database
    results = assigner.assign_keywords_batch(articles, top_k=5, threshold=0.25)
    assigner.save_results_to_db(results, 'your_database.db', 'article_keywords')

    # Example 4: Load keywords from CSV
    assigner.load_keywords_from_csv('keywords.csv', column_name='keyword')

    # Example 5: Load keywords from text file
    assigner.load_keywords_from_file('keywords.txt')

    # Example 6: Assign keywords to a single article
    keywords_assigned = assigner.assign_keywords(
        title="Breaking: New Technology Announced",
        summary="Company reveals revolutionary product...",
        top_k=3,
        threshold=0.3
    )
    """

    print(integration_examples)
