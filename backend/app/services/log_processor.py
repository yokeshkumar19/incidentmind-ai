import re
from typing import Dict, List, Optional, Tuple

# Regex patterns for detecting and redacting secrets & credentials
SECRET_PATTERNS = [
    # JWT tokens: Bearer or standalone eyJ...
    (re.compile(r"Bearer\s+([A-Za-z0-9_\-\.]{20,})", re.IGNORECASE), "Bearer [REDACTED_JWT]"),
    (re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}", re.IGNORECASE), "[REDACTED_JWT]"),
    
    # Generic API Keys and tokens
    (re.compile(r"(api[_\-\s]?key|access[_\-\s]?token|auth[_\-\s]?token|secret[_\-\s]?key|private[_\-\s]?key|token)[\s:=]+(['\"])?([A-Za-z0-9_\-\.]{16,})(['\"])?", re.IGNORECASE), r"\1=[REDACTED_SECRET]"),
    
    # AWS access keys
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_AWS_KEY]"),
    
    # Passwords in URLs or strings
    (re.compile(r"(password|passwd|pwd)[\s:=]+(['\"])?([^\s,;'\"]{4,})(['\"])?", re.IGNORECASE), r"\1=[REDACTED_PASSWORD]"),
    (re.compile(r"://([^:]+):([^@]+)@"), r"://\1:[REDACTED_CREDENTIALS]@"),
    
    # Generic hashes/private keys
    (re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END \1PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
]

# Patterns for exception identification
EXCEPTION_PATTERNS = [
    re.compile(r"\b([A-Za-z0-9_]+(?:Exception|Error|Failure|Timeout|Contention|Overflow|Crash))\b"),
    re.compile(r"status\s*code\s*[:=]\s*(5\d\d|4\d\d)", re.IGNORECASE),
    re.compile(r"HTTP\s*(5\d\d|4\d\d)", re.IGNORECASE),
    re.compile(r"FATAL:\s*([^\n]+)", re.IGNORECASE),
    re.compile(r"PANIC:\s*([^\n]+)", re.IGNORECASE),
]

# Timestamp patterns
TIMESTAMP_PATTERNS = [
    re.compile(r"\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b"),
    re.compile(r"\b\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b"),
]

MAX_LOG_CHARS = 50_000  # Cap at ~50KB to prevent context exhaustion


class LogProcessor:
    @staticmethod
    def sanitize(raw_logs: Optional[str]) -> str:
        """
        Redacts credentials, tokens, API keys, and passwords from logs.
        Enforces maximum length while preserving top and bottom context.
        """
        if not raw_logs or not raw_logs.strip():
            return ""

        text = raw_logs
        # Limit size safely if oversized
        if len(text) > MAX_LOG_CHARS:
            half = MAX_LOG_CHARS // 2
            text = (
                text[:half]
                + "\n\n... [TRUNCATED DUE TO SIZE: MIDDLE LOG LINES REMOVED] ...\n\n"
                + text[-half:]
            )

        # Apply redactions
        for pattern, replacement in SECRET_PATTERNS:
            text = pattern.sub(replacement, text)

        return text

    @staticmethod
    def analyze_logs(logs: Optional[str]) -> Dict[str, any]:
        """
        Extracts structured diagnostic signals from raw logs:
        - Identified exception types
        - Timestamps found
        - Critical lines with line numbers
        """
        if not logs:
            return {
                "exceptions": [],
                "timestamps": [],
                "highlighted_lines": [],
                "line_count": 0,
            }

        sanitized = LogProcessor.sanitize(logs)
        lines = sanitized.splitlines()
        
        exceptions = set()
        timestamps = []
        highlighted_lines = []

        for idx, line in enumerate(lines, start=1):
            line_str = line.strip()
            if not line_str:
                continue

            # Detect exceptions
            for p in EXCEPTION_PATTERNS:
                matches = p.findall(line_str)
                for m in matches:
                    if isinstance(m, str) and len(m) > 3:
                        exceptions.add(m)

            # Detect timestamps
            for tp in TIMESTAMP_PATTERNS:
                t_matches = tp.findall(line_str)
                for tm in t_matches:
                    if tm not in timestamps and len(timestamps) < 5:
                        timestamps.append(tm)

            # Highlight lines containing error or fatal indicators
            if any(k in line_str.lower() for k in ["error", "fatal", "fail", "panic", "critical", "timed out", "contention", "500", "502", "503"]):
                if len(highlighted_lines) < 10:
                    highlighted_lines.append({
                        "line_number": idx,
                        "content": line_str[:200]
                    })

        return {
            "exceptions": sorted(list(exceptions))[:10],
            "timestamps": timestamps,
            "highlighted_lines": highlighted_lines,
            "line_count": len(lines),
            "sanitized_logs": sanitized,
        }

