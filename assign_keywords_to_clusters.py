import pandas as pd
from keyword_assignment import KeywordAssigner
from typing import List

def parse_keywords_from_file(filepath: str) -> List[str]:
    """
    Parses keywords from the custom text file format in keywords.db.
    It reads all lines that don't start with '[' and aggregates all
    comma-separated values into a single list of unique keywords.
    """
    keywords = set()
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line.startswith('[') and line:
                line_keywords = [kw.strip() for kw in line.split(',')]
                keywords.update(line_keywords)
    
    return [kw for kw in list(keywords) if kw]

def process_clusters(
    clusters_filepath: str, 
    keywords_filepath: str, 
    output_filepath: str,
    model_name: str = 'all-MiniLM-L6-v2',
    top_k: int = 5,
    threshold: float = 0.3
):
    """
    Loads clusters from a CSV, assigns keywords based on their label and
    summary fields, and saves the results to a new CSV file.
    """
    print("Starting cluster processing...")

    # 1. Initialize KeywordAssigner and load keywords
    assigner = KeywordAssigner(model_name=model_name)
    
    print(f"Parsing keywords from {keywords_filepath}...")
    keywords_list = parse_keywords_from_file(keywords_filepath)
    assigner.load_keywords(keywords_list)

    # 2. Load cluster data
    print(f"Loading cluster data from {clusters_filepath}...")
    try:
        df = pd.read_csv(clusters_filepath)
    except FileNotFoundError:
        print(f"Error: The file '{clusters_filepath}' was not found.")
        print("Please make sure the file exists and its path is correct in the script.")
        return

    # 3. Prepare data for keyword assignment
    summary_cols = [col for col in df.columns if 'summary' in col.lower()]
    if not summary_cols:
        print("Error: No summary columns found in the CSV file.")
        print("Please ensure your file has at least one column with 'summary' in its name.")
        return

    if 'label' not in df.columns:
        print("Error: 'label' column not found in the CSV file.")
        return

    # Filter out rows with no label or summary, then reset index
    df.dropna(subset=['label'] + summary_cols, inplace=True)
    df.reset_index(drop=True, inplace=True)

    if df.empty:
        print("No valid clusters to process after filtering for empty labels or summaries.")
        return

    # Create the list of "articles" for the assigner
    articles_to_process = []
    for index, row in df.iterrows():
        combined_summary = ' '.join([str(row[col]) for col in summary_cols])
        articles_to_process.append({
            'id': index,  # Use dataframe index as a temporary ID
            'title': row['label'],
            'summary': combined_summary
        })

    # 4. Assign keywords in a batch
    print(f"Assigning keywords to {len(articles_to_process)} clusters...")
    results = assigner.assign_keywords_batch(
        articles_to_process, 
        top_k=top_k, 
        threshold=threshold
    )

    # 5. Add keyword results back to the DataFrame
    df['assigned_keywords'] = ''
    for result in results:
        article_id = result['id']
        assigned_kws = [kw['keyword'] for kw in result['assigned_keywords']]
        df.loc[article_id, 'assigned_keywords'] = ', '.join(assigned_kws)

    # 6. Save the final DataFrame to a new CSV
    df.to_csv(output_filepath, index=False)
    print(f"\nProcessing complete. Results saved to {output_filepath}")


if __name__ == "__main__":
    # --- CONFIGURATION ---
    # IMPORTANT: Change this to the path of your cluster file
    CLUSTERS_FILE = "clusters.csv"  
    
    KEYWORDS_FILE = "keywords.db"
    OUTPUT_FILE = "clusters_with_keywords.csv"
    
    # You can adjust these parameters for keyword assignment
    TOP_K_KEYWORDS = 5          # Max number of keywords to assign to each cluster
    SIMILARITY_THRESHOLD = 0.25 # Minimum similarity score for a keyword to be assigned

    process_clusters(
        clusters_filepath=CLUSTERS_FILE,
        keywords_filepath=KEYWORDS_FILE,
        output_filepath=OUTPUT_FILE,
        top_k=TOP_K_KEYWORDS,
        threshold=SIMILARITY_THRESHOLD
    )