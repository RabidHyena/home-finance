import re


def normalize_merchant_name(description: str) -> str:
    """Extract and normalize merchant name."""
    text = description.lower().strip()

    # Remove noise words
    noise = ['пр.', 'оплата', 'покупка', 'перевод', 'payment', 'purchase']
    for word in noise:
        text = text.replace(word, '')

    # Remove card numbers, amounts, dates
    text = re.sub(r'\d{4}[-\s*]\d{4}[-\s*]\d{4}[-\s*]\d{4}', '', text)
    text = re.sub(r'\d+[.,]\d+', '', text)
    text = re.sub(r'\d{2}[./-]\d{2}[./-]\d{2,4}', '', text)

    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text[:500]
