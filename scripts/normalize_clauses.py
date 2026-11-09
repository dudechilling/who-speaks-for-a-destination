#!/usr/bin/env python3
"""Deterministic normalization used for RDMO_about_coding.xlsx."""
from __future__ import annotations

import re
import sys
import unicodedata


def normalize_clause(text: str) -> str:
    """Apply NFKC, lowercase, punctuation/symbol replacement and whitespace collapse."""
    text = unicodedata.normalize('NFKC', text).lower()
    text = ''.join(' ' if unicodedata.category(char)[0] in {'P', 'S'} else char for char in text)
    return re.sub(r'\s+', ' ', text).strip()


if __name__ == '__main__':
    for line in sys.stdin:
        print(normalize_clause(line.rstrip('\n')))
