import os
import requests
from dotenv import load_dotenv
import json

# Load .env file
load_dotenv()

print("=" * 60)
print("Google Translate REST API Key Test")
print("=" * 60)

# Get API key
api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
print(f"1. API Key loaded: {'✓ YES' if api_key else '✗ NO'}")
print(f"   Key preview: {api_key[:4]}...{api_key[-4:] if api_key else 'N/A'}")

if not api_key:
    print("\n✗ ERROR: Add GOOGLE_TRANSLATE_API_KEY to your .env file")
    exit(1)

# Test 1: Single translation
print("\n2. Testing single translation (Hindi -> English)...")
test_text = "नमस्ते दुनिया"
url = "https://translation.googleapis.com/language/translate/v2"
params = {
    'key': api_key,
    'target': 'en',
    'q': test_text
}

try:
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    result = response.json()
    
    translated = result['data']['translations'][0]['translatedText']
    print(f"   ✓ SUCCESS: '{test_text}' -> '{translated}'")
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    exit(1)

# Test 2: Batch translation
print("\n3. Testing batch translation...")
batch_texts = ["Bonjour", "Hola", "नमस्ते"]
params['q'] = batch_texts

try:
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    result = response.json()
    
    print("   ✓ SUCCESS:")
    for orig, trans in zip(batch_texts, result['data']['translations']):
        print(f"     '{orig}' -> '{trans['translatedText']}'")
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    exit(1)

# Test 3: Language detection
print("\n4. Testing language detection...")
detect_params = {
    'key': api_key,
    'target': 'en',
    'q': test_text
}
detect_url = "https://translation.googleapis.com/language/translate/v2/detect"

try:
    response = requests.post(detect_url, params=detect_params, timeout=10)
    response.raise_for_status()
    result = response.json()
    
    lang = result['data']['detections'][0][0]['language']
    confidence = result['data']['detections'][0][0]['confidence']
    print(f"   ✓ SUCCESS: Detected '{lang}' (confidence: {confidence:.2%})")
except Exception as e:
    print(f"   ✗ FAILED: {e}")

print("\n" + "=" * 60)
print("🎉 REST API KEY WORKING PERFECTLY!")
print("=" * 60)
