import sqlite3
from urllib.parse import urlparse, parse_qs, unquote

from rss_feeds_config import RSS_FEEDS


DB_PATH = "favicons.db"


def extract_site_domain(feed_url: str) -> str:
    """
    Given an RSS feed URL, return the best-guess domain for the actual news site.

    - For normal feeds (e.g. https://www.thehindu.com/...) → return the netloc.
    - For Google News search feeds (news.google.com/rss/search?q=India site:bbc.com...)
      → extract 'bbc.com' from the 'q' parameter.
    """
    parsed = urlparse(feed_url)

    # Handle Google News "site:" search feeds specially
    if "news.google.com" in parsed.netloc and parsed.path.startswith("/rss/search"):
        qs = parse_qs(parsed.query)
        q_vals = qs.get("q", [])

        if q_vals:
            # e.g. "India site:bbc.com"
            q = unquote(q_vals[0])
            parts = q.split()
            for part in parts:
                # look for parts starting with "site:"
                if part.startswith("site:"):
                    # everything after "site:" is the domain
                    site_domain = part.split("site:", 1)[1]
                    if site_domain:
                        return site_domain

        # Fallback: if parsing fails, just return Google News domain
        return parsed.netloc

    # Normal RSS feed: just return its own domain
    return parsed.netloc


def build_favicon_url(domain: str) -> str:
    """
    Build a favicon URL for a given domain using Google's favicon service.
    """
    return f"https://www.google.com/s2/favicons?sz=64&domain={domain}"


def init_db(db_path: str = DB_PATH):
    """
    Create the SQLite DB and table if they don't already exist.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sources_favicons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            domain TEXT NOT NULL,
            favicon_url TEXT NOT NULL,
            UNIQUE(source, domain)
        );
        """
    )

    conn.commit()
    conn.close()


def save_favicon_to_db(source: str, domain: str, favicon_url: str, db_path: str = DB_PATH):
    """
    Insert or update a favicon row for a given (source, domain).
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO sources_favicons (source, domain, favicon_url)
        VALUES (?, ?, ?)
        ON CONFLICT(source, domain)
        DO UPDATE SET favicon_url = excluded.favicon_url;
        """,
        (source, domain, favicon_url),
    )

    conn.commit()
    conn.close()


def main():
    # Step 1: Ensure DB & table exist
    init_db()

    # Step 2: Process feeds & store favicon info
    seen = set()  # avoid duplicate (source, domain) inserts in one run

    # Manual overrides for sources that use generic feed domains (like FeedBurner)
    # This maps the Source Name -> Real Website Domain
    DOMAIN_OVERRIDES = {
        "NDTV": "ndtv.com",
        "News24": "news24.com",
    }

    for feed in RSS_FEEDS:
        source = feed.get("source", "Unknown")
        feed_url = feed.get("url", "")

        if not feed_url:
            continue

        # Use override if available, otherwise extract from URL
        if source in DOMAIN_OVERRIDES:
            domain = DOMAIN_OVERRIDES[source]
        else:
            domain = extract_site_domain(feed_url)

        key = (source, domain)

        if key in seen:
            continue
        seen.add(key)

        favicon_url = build_favicon_url(domain)
        save_favicon_to_db(source, domain, favicon_url)

        print(f"Saved: source={source}, domain={domain}, favicon={favicon_url}")

    # Optional: Show final DB contents after run
    print("\nCurrent contents of sources_favicons table:")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for row in cursor.execute(
        "SELECT id, source, domain, favicon_url FROM sources_favicons ORDER BY source, domain;"
    ):
        print(row)
    conn.close()


if __name__ == "__main__":
    main()
