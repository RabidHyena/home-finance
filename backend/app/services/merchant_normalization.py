import re


# Russian noise words commonly found in bank transaction descriptions
_NOISE_WORDS = [
    'пр.', 'оплата', 'покупка', 'перевод', 'payment', 'purchase',
    'списание', 'зачисление', 'возврат', 'операция', 'по карте',
    'безналичная оплата', 'мобильный банк', 'оплата товаров и услуг',
]

# Legal entity prefixes in Russian
_LEGAL_PREFIXES = re.compile(
    r'\b(ооо|ип|ао|пао|зао|нко|ук)\s+', re.IGNORECASE
)

# Trailing reference numbers: #12345, №12345, No12345
_TRAILING_REF = re.compile(r'[#№]\s*\d+$')
_TRAILING_NO = re.compile(r'\bno\s*\d+$', re.IGNORECASE)


def normalize_merchant_name(description: str) -> str:
    """Extract and normalize merchant name."""
    text = description.lower().strip()

    # Remove noise words/phrases (longest first to avoid partial matches)
    for word in sorted(_NOISE_WORDS, key=len, reverse=True):
        text = text.replace(word, '')

    # Strip legal entity prefixes: "ооо пятёрочка" → "пятёрочка"
    text = _LEGAL_PREFIXES.sub('', text)

    # Remove card numbers, amounts, dates
    text = re.sub(r'\d{4}[-\s*]\d{4}[-\s*]\d{4}[-\s*]\d{4}', '', text)
    text = re.sub(r'\d+[.,]\d+', '', text)
    text = re.sub(r'\d{2}[./-]\d{2}[./-]\d{2,4}', '', text)

    # Remove trailing reference numbers
    text = _TRAILING_REF.sub('', text)
    text = _TRAILING_NO.sub('', text)

    # Normalize punctuation between words: dots, slashes → spaces
    # "яндекс.еда" → "яндекс еда", "delivery/club" → "delivery club"
    text = re.sub(r'(?<=\w)[./\\](?=\w)', ' ', text)

    # Remove stray punctuation (quotes, asterisks, etc.) but keep hyphens between words
    text = re.sub(r'[«»""\'*]', '', text)

    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text[:500]
