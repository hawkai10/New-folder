# First, install the required packages
# pip install fast-langdetect
# pip install torch transformers IndicTransToolkit

import torch
from fast_langdetect import detect
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

class IndianLanguageTranslator:
    def __init__(self):
        # Language code mapping: fast-langdetect ISO codes -> IndicTrans2 codes
        self.lang_mapping = {
            'hi': 'hin_Deva',    # Hindi
            'bn': 'ben_Beng',    # Bengali
            'ta': 'tam_Taml',    # Tamil
            'te': 'tel_Telu',    # Telugu
            'mr': 'mar_Deva',    # Marathi
            'gu': 'guj_Gujr',    # Gujarati
            'kn': 'kan_Knda',    # Kannada
            'ml': 'mal_Mlym',    # Malayalam
            'pa': 'pan_Guru',    # Punjabi
            'or': 'ory_Orya',    # Odia
            'as': 'asm_Beng',    # Assamese
            'ur': 'urd_Arab',    # Urdu
            'sa': 'san_Deva',    # Sanskrit
            'ne': 'npi_Deva',    # Nepali
            'sd': 'snd_Arab',    # Sindhi
            'ks': 'kas_Arab',    # Kashmiri
        }
        
        # Initialize IndicTrans2 model
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
        # Load Indic-to-English model
        model_name = "ai4bharat/indictrans2-indic-en-1B"
        print("Loading IndicTrans2 model...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            model_name,
            trust_remote_code=True
        ).to(self.device)
        
        # Initialize IndicProcessor
        self.ip = IndicProcessor(inference=True)
        print("Model loaded successfully!")
    
    def detect_language(self, text):
        """Detect language using fast-langdetect"""
        result = detect(text, model='auto', k=1)
        iso_code = result[0]['lang']
        confidence = result[0]['score']
        
        # Map to IndicTrans2 code
        indictrans_code = self.lang_mapping.get(iso_code)
        
        return {
            'iso_code': iso_code,
            'indictrans_code': indictrans_code,
            'confidence': confidence
        }
    
    def translate_to_english(self, text, src_lang_code):
        """Translate text to English using IndicTrans2"""
        # Preprocess the input
        batch = self.ip.preprocess_batch(
            [text],
            src_lang=src_lang_code,
            tgt_lang="eng_Latn"
        )
        
        # Tokenize
        inputs = self.tokenizer(
            batch,
            truncation=True,
            padding="longest",
            return_tensors="pt",
            return_attention_mask=True,
        ).to(self.device)
        
        # Generate translation
        with torch.no_grad():
            generated_tokens = self.model.generate(
                **inputs,
                use_cache=True,
                min_length=0,
                max_length=256,
                num_beams=5,
                num_return_sequences=1,
            )
        
        # Decode the translation
        with self.tokenizer.as_target_tokenizer():
            generated_tokens = self.tokenizer.batch_decode(
                generated_tokens.detach().cpu().tolist(),
                skip_special_tokens=True,
                clean_up_tokenization_spaces=True,
            )
        
        # Postprocess
        translations = self.ip.postprocess_batch(generated_tokens, lang="eng_Latn")
        
        return translations[0]
    
    def detect_and_translate(self, text):
        """Complete pipeline: detect language and translate to English"""
        # Step 1: Detect language
        lang_info = self.detect_language(text)
        
        print(f"\n--- Language Detection ---")
        print(f"Detected Language (ISO): {lang_info['iso_code']}")
        print(f"IndicTrans2 Code: {lang_info['indictrans_code']}")
        print(f"Confidence: {lang_info['confidence']:.4f}")
        
        # Step 2: Check if language is supported
        if lang_info['indictrans_code'] is None:
            return f"Language '{lang_info['iso_code']}' is not supported by IndicTrans2"
        
        # Step 3: Translate to English
        print(f"\n--- Translation ---")
        print(f"Original Text: {text}")
        
        translation = self.translate_to_english(text, lang_info['indictrans_code'])
        print(f"English Translation: {translation}")
        
        return {
            'original_text': text,
            'detected_language': lang_info,
            'translation': translation
        }

# Example usage
if __name__ == "__main__":
    # Initialize translator
    translator = IndianLanguageTranslator()
    
    # Test with different Indian languages
    test_texts = [
        "नमस्ते, आप कैसे हैं?",  # Hindi
        "আপনি কেমন আছেন?",  # Bengali
        "நீங்கள் எப்படி இருக்கிறீர்கள்?",  # Tamil
        "మీరు ఎలా ఉన్నారు?",  # Telugu
    ]
    
    for text in test_texts:
        result = translator.detect_and_translate(text)
        print("\n" + "="*50 + "\n")
