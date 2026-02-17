import io
import json
import logging
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import get_settings
from app.schemas import ParsedTransaction
from app.services.ocr_service import (
    VALID_CATEGORIES,
    _clamp_confidence,
    _extract_json,
    _normalize_category,
    _parse_date,
    _strip_markdown_fences,
)

logger = logging.getLogger(__name__)

# Common MCC code → category mapping
_MCC_CATEGORIES = {
    # Food
    "5411": "Food", "5412": "Food", "5422": "Food", "5441": "Food",
    "5451": "Food", "5462": "Food", "5499": "Food", "5812": "Food",
    "5813": "Food", "5814": "Food",
    # Transport
    "4011": "Transport", "4111": "Transport", "4112": "Transport",
    "4121": "Transport", "4131": "Transport", "4214": "Transport",
    "4411": "Transport", "4457": "Transport", "4468": "Transport",
    "4511": "Transport", "4784": "Transport", "4789": "Transport",
    "5013": "Transport", "5172": "Transport", "5511": "Transport",
    "5521": "Transport", "5531": "Transport", "5532": "Transport",
    "5533": "Transport", "5541": "Transport", "5542": "Transport",
    "5551": "Transport", "5571": "Transport", "5592": "Transport",
    "5598": "Transport", "5599": "Transport", "7511": "Transport",
    "7512": "Transport", "7513": "Transport", "7519": "Transport",
    "7523": "Transport",
    # Entertainment
    "7832": "Entertainment", "7829": "Entertainment", "7841": "Entertainment",
    "7911": "Entertainment", "7922": "Entertainment", "7929": "Entertainment",
    "7932": "Entertainment", "7933": "Entertainment", "7941": "Entertainment",
    "7991": "Entertainment", "7993": "Entertainment", "7994": "Entertainment",
    "7995": "Entertainment", "7996": "Entertainment", "7997": "Entertainment",
    "7998": "Entertainment", "7999": "Entertainment",
    "5815": "Entertainment", "5816": "Entertainment", "5817": "Entertainment",
    "5818": "Entertainment",
    # Health
    "5912": "Health", "5975": "Health", "5976": "Health",
    "8011": "Health", "8021": "Health", "8031": "Health", "8041": "Health",
    "8042": "Health", "8043": "Health", "8049": "Health", "8050": "Health",
    "8062": "Health", "8071": "Health", "8099": "Health",
    # Bills
    "4812": "Bills", "4813": "Bills", "4814": "Bills", "4815": "Bills",
    "4816": "Bills", "4821": "Bills", "4899": "Bills",
    "4900": "Bills",
    "6300": "Bills", "6381": "Bills",
    # Shopping
    "5111": "Shopping", "5131": "Shopping", "5137": "Shopping",
    "5139": "Shopping", "5169": "Shopping", "5192": "Shopping",
    "5193": "Shopping", "5194": "Shopping", "5199": "Shopping",
    "5200": "Shopping", "5211": "Shopping", "5231": "Shopping",
    "5251": "Shopping", "5261": "Shopping", "5271": "Shopping",
    "5300": "Shopping", "5309": "Shopping", "5310": "Shopping",
    "5311": "Shopping", "5331": "Shopping", "5399": "Shopping",
    "5611": "Shopping", "5621": "Shopping", "5631": "Shopping",
    "5641": "Shopping", "5651": "Shopping", "5655": "Shopping",
    "5661": "Shopping", "5681": "Shopping", "5691": "Shopping",
    "5699": "Shopping", "5712": "Shopping", "5713": "Shopping",
    "5714": "Shopping", "5718": "Shopping", "5719": "Shopping",
    "5722": "Shopping", "5732": "Shopping", "5733": "Shopping",
    "5734": "Shopping", "5735": "Shopping", "5811": "Shopping",
    "5921": "Shopping", "5931": "Shopping", "5932": "Shopping",
    "5933": "Shopping", "5935": "Shopping", "5937": "Shopping",
    "5940": "Shopping", "5941": "Shopping", "5942": "Shopping",
    "5943": "Shopping", "5944": "Shopping", "5945": "Shopping",
    "5946": "Shopping", "5947": "Shopping", "5948": "Shopping",
    "5949": "Shopping", "5950": "Shopping", "5960": "Shopping",
    "5964": "Shopping", "5965": "Shopping", "5966": "Shopping",
    "5967": "Shopping", "5968": "Shopping", "5969": "Shopping",
    "5970": "Shopping", "5971": "Shopping", "5972": "Shopping",
    "5973": "Shopping", "5977": "Shopping", "5978": "Shopping",
    "5983": "Shopping", "5992": "Shopping", "5993": "Shopping",
    "5994": "Shopping", "5995": "Shopping", "5996": "Shopping",
    "5997": "Shopping", "5998": "Shopping", "5999": "Shopping",
}


def _extract_merchant_and_mcc(description: str) -> tuple[str, str | None]:
    """Extract merchant name and MCC code from Sber-style verbose descriptions.

    Sber format: "Операция по карте: ..., место совершения операции: RU/City/MERCHANT.NAME, MCC: 1234"
    Also handles: "Оплата услуг: MERCHANT" and plain descriptions.

    Returns (clean_description, mcc_code_or_None).
    """
    mcc = None
    # Extract MCC code
    mcc_match = re.search(r'MCC:\s*(\d{4})', description)
    if mcc_match:
        mcc = mcc_match.group(1)

    # Try to extract merchant from "место совершения операции:" pattern
    merchant_match = re.search(
        r'место совершения операции:\s*(?:[A-Z]{2}/[^/]+/)?(.+?)(?:,\s*MCC:|$)',
        description,
        re.IGNORECASE,
    )
    if merchant_match:
        merchant = merchant_match.group(1).strip()
        # Clean up: replace dots/underscores with spaces, strip trailing junk
        merchant = re.sub(r'[._]+', ' ', merchant).strip()
        if merchant:
            return merchant, mcc

    # Try "Оплата услуг:" pattern
    service_match = re.search(r'(?:Оплата услуг|Перевод|Платёж|Платеж):\s*(.+?)(?:,|$)', description)
    if service_match:
        return service_match.group(1).strip(), mcc

    # For short/clean descriptions, return as-is (truncated)
    clean = description.strip()
    if len(clean) > 80:
        clean = clean[:80]
    return clean, mcc

# Substring patterns for heuristic column detection (Russian + English)
# Each list is checked via substring match against the normalized header
_DATE_PATTERNS = ["дата", "date"]
_AMOUNT_PATTERNS = ["сумма", "amount", "стоимость", "расход", "приход"]
_DESC_PATTERNS = [
    "описание", "description", "назначение", "наименование",
    "получатель", "merchant", "контрагент", "название",
    "комментарий", "детали", "информация", "memo", "details",
    "категория операции",
]
# Negative patterns — columns that look like description but aren't
_DESC_NEGATIVE = ["валюта", "статус", "номер", "баланс", "остаток", "счёт", "счет", "mcc"]


def _normalize_header(value: str) -> str:
    """Lowercase and strip a header cell value for matching."""
    return str(value).strip().lower()


def _header_matches(header: str, patterns: list[str]) -> bool:
    """Check if header contains any of the patterns (substring match)."""
    for p in patterns:
        if p in header:
            return True
    return False


def _parse_russian_number(value) -> Decimal | None:
    """Parse Russian-format number like '1 234,56' or '-1234.56' into Decimal.
    Preserves sign: negative = expense, positive = income.
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    # Remove currency symbols and spaces used as thousand separators
    s = re.sub(r'[₽$€£\s\u00a0]', '', s)
    # Replace comma decimal separator with dot
    s = s.replace(',', '.')
    # Handle plus sign
    s = s.lstrip('+')
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _detect_columns(headers: list[str]) -> dict[str, int] | None:
    """Detect date, amount, description columns from header row.
    Uses substring matching against known patterns.
    Returns dict with keys 'date', 'amount', 'description' -> column index, or None.
    """
    mapping = {}
    normalized = [_normalize_header(h) for h in headers]
    is_date_col = [_header_matches(h, _DATE_PATTERNS) for h in normalized]

    for idx, header in enumerate(normalized):
        if not header:
            continue
        if 'date' not in mapping and is_date_col[idx]:
            mapping['date'] = idx
        elif 'amount' not in mapping and _header_matches(header, _AMOUNT_PATTERNS) and not is_date_col[idx]:
            mapping['amount'] = idx
        elif 'description' not in mapping and _header_matches(header, _DESC_PATTERNS):
            if not _header_matches(header, _DESC_NEGATIVE) and not is_date_col[idx]:
                mapping['description'] = idx

    # If description not found by keywords, try picking the first remaining text column
    if 'date' in mapping and 'amount' in mapping and 'description' not in mapping:
        used = {mapping['date'], mapping['amount']}
        for idx, header in enumerate(normalized):
            if idx not in used and header and not is_date_col[idx] and not _header_matches(header, _DESC_NEGATIVE):
                mapping['description'] = idx
                break

    if 'date' in mapping and 'amount' in mapping and 'description' in mapping:
        return mapping
    return None


_BANK_CATEGORY_MAP = {
    # Sber categories → our categories
    "супермаркеты": "Food", "фастфуд": "Food", "рестораны": "Food",
    "продукты": "Food", "кафе": "Food", "еда": "Food",
    "доставка еды": "Food", "кулинария": "Food",
    "транспорт": "Transport", "такси": "Transport", "автоуслуги": "Transport",
    "топливо": "Transport", "авиабилеты": "Transport", "жд билеты": "Transport",
    "общественный транспорт": "Transport", "каршеринг": "Transport",
    "парковки": "Transport", "автомобиль": "Transport",
    "развлечения": "Entertainment", "кино": "Entertainment",
    "музыка": "Entertainment", "игры": "Entertainment",
    "подписки": "Entertainment", "стриминг": "Entertainment",
    "книги": "Entertainment",
    "здоровье": "Health", "аптеки": "Health", "медицина": "Health",
    "красота": "Health", "спорт": "Health", "фитнес": "Health",
    "жкх": "Bills", "связь": "Bills", "интернет": "Bills",
    "коммунальные": "Bills", "мобильная связь": "Bills",
    "образование": "Bills", "страхование": "Bills",
    "одежда": "Shopping", "обувь": "Shopping", "электроника": "Shopping",
    "товары для дома": "Shopping", "маркетплейсы": "Shopping",
    "цветы": "Shopping", "животные": "Shopping",
}


def _map_bank_categories(transactions: list[dict]) -> dict[str, str]:
    """Map bank's own category names to our categories."""
    result = {}
    for tx in transactions:
        bank_cat = tx.get('bank_category', '').lower().strip()
        if bank_cat and bank_cat in _BANK_CATEGORY_MAP:
            result[tx['description']] = _BANK_CATEGORY_MAP[bank_cat]
    return result


VALID_INCOME_CATEGORIES = {"Salary", "Transfer", "Cashback", "Investment", "OtherIncome"}


class ExcelParsingService:
    """Service for parsing bank statement Excel files (.xlsx/.xls)."""

    CATEGORIZE_PROMPT = """You are a financial categorization assistant.
Given numbered transaction descriptions from a Russian bank statement, assign each a category.

Categories (use EXACTLY these values): Food, Transport, Entertainment, Shopping, Bills, Health, Other

Respond with a JSON object mapping each NUMBER to its category:
{"1": "Food", "2": "Transport", "3": "Shopping"}
"""

    CATEGORIZE_INCOME_PROMPT = """You are a financial categorization assistant.
Given numbered income transaction descriptions from a Russian bank statement, assign each a category.

Categories (use EXACTLY these values): Salary, Transfer, Cashback, Investment, OtherIncome

Respond with a JSON object mapping each NUMBER to its category:
{"1": "Salary", "2": "Transfer", "3": "Cashback"}
"""

    COLUMN_DETECT_PROMPT = """You are a data extraction assistant.
Given the first rows of a bank statement spreadsheet, identify which columns contain:
- date: transaction date
- amount: transaction amount
- description: merchant name or payment description

Respond with JSON:
{"date": <column_index>, "amount": <column_index>, "description": <column_index>}

Column indices are 0-based. Here are the rows:
"""

    API_TIMEOUT = 30.0

    def __init__(self, db: Optional[Session] = None, user_id: int | None = None):
        settings = get_settings()
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            timeout=self.API_TIMEOUT,
        )
        self.model = settings.openrouter_model
        self.db = db
        self.user_id = user_id

    def _apply_learned_category(self, description: str, category: str, confidence: float) -> tuple[str, float]:
        """Override category with learned mapping if available and more confident."""
        from app.services.learning_service import apply_learned_category
        return apply_learned_category(self.db, self.user_id, description, category, confidence)

    def _call_ai(self, prompt: str) -> str:
        """Call AI API with a text prompt (no vision)."""
        logger.info("Calling AI for Excel categorization, model=%s", self.model)
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=8192,
            messages=[
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI returned empty response")
        return content

    def _detect_columns_with_ai(self, sample_rows: list[list[str]]) -> dict[str, int] | None:
        """Use AI to detect column mapping from sample rows."""
        rows_text = "\n".join(
            f"Row {i}: {row}" for i, row in enumerate(sample_rows)
        )
        prompt = self.COLUMN_DETECT_PROMPT + rows_text
        try:
            response_text = self._call_ai(prompt)
            logger.info("AI column detection response: %s", response_text[:500])
            data = _extract_json(response_text)
            if isinstance(data, dict) and all(
                k in data and data[k] is not None for k in ('date', 'amount', 'description')
            ):
                return {
                    'date': int(data['date']),
                    'amount': int(data['amount']),
                    'description': int(data['description']),
                }
            logger.warning("AI column detection returned incomplete mapping: %s", data)
        except Exception:
            logger.warning("AI column detection failed", exc_info=True)
        return None

    def _categorize_descriptions(self, descriptions: list[str], is_income: bool = False) -> dict[str, str]:
        """Batch-categorize transaction descriptions via AI, with MCC pre-categorization."""
        if not descriptions:
            return {}

        default_cat = "OtherIncome" if is_income else "Other"
        prompt_template = self.CATEGORIZE_INCOME_PROMPT if is_income else self.CATEGORIZE_PROMPT

        def normalize(cat: str) -> str:
            if is_income:
                return cat if cat in VALID_INCOME_CATEGORIES else default_cat
            return _normalize_category(cat)

        result = {}
        needs_ai = []  # (original_desc, clean_merchant)

        # Step 1: Extract merchant names and MCC codes, pre-categorize by MCC (expenses only)
        unique = list(set(descriptions))
        for desc in unique:
            merchant, mcc = _extract_merchant_and_mcc(desc)
            if not is_income and mcc and mcc in _MCC_CATEGORIES:
                result[desc] = _MCC_CATEGORIES[mcc]
            else:
                needs_ai.append((desc, merchant))

        logger.info("MCC pre-categorized %d, sending %d to AI", len(result), len(needs_ai))

        # Step 2: Send remaining to AI in batches using numbered indices
        batch_size = 40
        for i in range(0, len(needs_ai), batch_size):
            batch = needs_ai[i:i + batch_size]
            # Build numbered list — AI returns {"1": "Food", "2": "Transport"}
            numbered = "\n".join(f"{j+1}. {merchant}" for j, (_, merchant) in enumerate(batch))
            prompt = prompt_template + "\n" + numbered
            try:
                response_text = self._call_ai(prompt)
                data = _extract_json(response_text)
                if isinstance(data, dict):
                    for j, (orig_desc, _) in enumerate(batch):
                        cat = data.get(str(j + 1)) or data.get(j + 1)
                        if cat:
                            result[orig_desc] = normalize(str(cat))
                        else:
                            result[orig_desc] = default_cat
                else:
                    for orig_desc, _ in batch:
                        result[orig_desc] = default_cat
            except Exception:
                logger.warning("AI categorization batch failed, defaulting to %s", default_cat, exc_info=True)
                for orig_desc, _ in batch:
                    result[orig_desc] = default_cat

        return result

    def _load_rows_xlsx(self, content: bytes) -> list[list]:
        """Load all rows from an .xlsx file."""
        import openpyxl
        # Don't use read_only mode — it can miss data in merged cells and complex layouts
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([cell if cell is not None else "" for cell in row])
        wb.close()
        return rows

    def _load_rows_xls(self, content: bytes) -> list[list]:
        """Load all rows from an .xls file."""
        import xlrd
        wb = xlrd.open_workbook(file_contents=content)
        ws = wb.sheet_by_index(0)
        rows = []
        for row_idx in range(ws.nrows):
            rows.append([ws.cell_value(row_idx, col) for col in range(ws.ncols)])
        return rows

    def _find_header_row(self, rows: list[list]) -> int:
        """Find the row index that contains column headers.
        Searches all rows for date/amount/description keywords via substring match.
        """
        for i, row in enumerate(rows):
            normalized = [_normalize_header(str(cell)) for cell in row]
            has_date = any(_header_matches(h, _DATE_PATTERNS) for h in normalized)
            has_amount = any(_header_matches(h, _AMOUNT_PATTERNS) for h in normalized)
            if has_date and has_amount:
                logger.info("Found header row at index %d: %s", i, [str(c)[:40] for c in row if str(c).strip()])
                return i
        logger.warning("No header row detected, falling back to row 0")
        return 0  # fallback to first row

    def parse_excel_bytes(self, content: bytes, filename: str) -> dict:
        """Parse an Excel bank statement and extract transactions.

        Returns dict matching ParsedTransactions shape.
        """
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        # Load rows based on format
        if ext == 'xls':
            rows = self._load_rows_xls(content)
        else:
            rows = self._load_rows_xlsx(content)

        # Filter out completely empty rows
        rows = [row for row in rows if any(str(cell).strip() for cell in row)]

        logger.info("Loaded %d non-empty rows from %s (ext=%s)", len(rows), filename, ext)

        if len(rows) < 2:
            raise ValueError("Excel file has no data rows")

        # Find header row
        header_idx = self._find_header_row(rows)
        headers = [str(cell) for cell in rows[header_idx]]
        data_rows = rows[header_idx + 1:]

        # Detect columns
        logger.info("Excel headers (row %d): %s", header_idx, headers)
        col_mapping = _detect_columns(headers)
        if col_mapping is None:
            logger.info("Heuristic detection failed, trying AI-based detection")
            # Try AI-based detection with first 5 rows
            sample = [headers] + [[str(c) for c in r] for r in data_rows[:5]]
            col_mapping = self._detect_columns_with_ai(sample)
        else:
            logger.info("Heuristic column mapping: %s", col_mapping)

        if col_mapping is None:
            raise ValueError(
                "Could not detect date/amount/description columns in the Excel file. "
                "Please ensure headers include date, amount, and description columns."
            )

        date_col = col_mapping['date']
        amount_col = col_mapping['amount']
        desc_col = col_mapping['description']

        # Optionally detect bank's own category column
        bank_cat_col = None
        for idx, h in enumerate(headers):
            h_lower = _normalize_header(h)
            if h_lower == "категория" or h_lower == "category":
                bank_cat_col = idx
                break

        # Extract raw transactions
        raw_transactions = []
        for row in data_rows:
            if len(row) <= max(date_col, amount_col, desc_col):
                continue

            date_val = str(row[date_col]).strip()
            amount_val = str(row[amount_col]).strip()
            desc_val = str(row[desc_col]).strip()

            if not amount_val or not desc_val:
                continue

            amount = _parse_russian_number(amount_val)
            if amount is None or amount == 0:
                continue

            # Determine transaction type from sign: negative = expense, positive = income
            tx_type = 'income' if amount > 0 else 'expense'
            amount = abs(amount)

            # Parse date — handle datetime objects from openpyxl
            if isinstance(row[date_col], datetime):
                parsed_date = row[date_col]
            else:
                parsed_date = _parse_date(date_val)

            bank_category = ""
            if bank_cat_col is not None and bank_cat_col < len(row):
                bank_category = str(row[bank_cat_col]).strip()

            raw_transactions.append({
                'amount': amount,
                'date': parsed_date,
                'description': desc_val,
                'bank_category': bank_category,
                'type': tx_type,
            })

        if not raw_transactions:
            raise ValueError("No valid transactions found in Excel file")

        logger.info("Extracted %d raw transactions from Excel", len(raw_transactions))

        # Extract clean merchant names and MCC codes
        for tx in raw_transactions:
            merchant, mcc = _extract_merchant_and_mcc(tx['description'])
            tx['merchant'] = merchant
            tx['mcc'] = mcc

        # Try to map bank's own categories to ours (expenses only)
        expense_txs = [tx for tx in raw_transactions if tx['type'] == 'expense']
        income_txs = [tx for tx in raw_transactions if tx['type'] == 'income']

        bank_cat_map = _map_bank_categories(expense_txs)

        # Batch categorize via AI — separate for expenses and income
        expense_descs = [tx['description'] for tx in expense_txs]
        income_descs = [tx['description'] for tx in income_txs]
        expense_cat_map = self._categorize_descriptions(expense_descs)
        income_cat_map = self._categorize_descriptions(income_descs, is_income=True)

        # Build ParsedTransaction objects
        parsed_transactions = []
        for tx in raw_transactions:
            desc = tx['description']
            tx_type = tx['type']
            is_income = tx_type == 'income'
            default_cat = "OtherIncome" if is_income else "Other"
            cat_map = income_cat_map if is_income else expense_cat_map

            # Priority: AI/MCC category > bank's own category > default
            category = cat_map.get(desc, default_cat)
            if not is_income and category == "Other" and desc in bank_cat_map:
                category = bank_cat_map[desc]
            confidence = 0.7 if category not in ("Other", "OtherIncome") else 0.3

            # Apply learned categories (use merchant name for matching)
            merchant = tx['merchant']
            category, confidence = self._apply_learned_category(merchant, category, confidence)

            parsed_transactions.append(ParsedTransaction(
                amount=tx['amount'],
                description=merchant,
                date=tx['date'],
                category=category,
                type=tx_type,
                confidence=confidence,
                raw_text=f"Excel: {filename}",
            ))

        total_amount = sum(tx.amount for tx in parsed_transactions)

        return {
            "transactions": parsed_transactions,
            "total_amount": total_amount,
            "chart": None,
            "raw_text": f"Excel: {filename}, {len(parsed_transactions)} rows",
        }
