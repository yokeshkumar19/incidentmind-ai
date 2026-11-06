from backend.app.services.log_processor import LogProcessor


def test_redact_jwt_and_bearer():
    raw = "User requested with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis"
    sanitized = LogProcessor.sanitize(raw)
    assert "doNotLeakThis" not in sanitized
    assert "[REDACTED_JWT]" in sanitized


def test_redact_aws_and_passwords():
    raw = "Failed connection to postgresql://admin:SuperSecretPassword123@db.prod:5432/app with key AKIAIOSFODNN7EXAMPLE"
    sanitized = LogProcessor.sanitize(raw)
    assert "SuperSecretPassword123" not in sanitized
    assert "AKIAIOSFODNN7EXAMPLE" not in sanitized
    assert "[REDACTED_CREDENTIALS]" in sanitized or "[REDACTED_PASSWORD]" in sanitized
    assert "[REDACTED_AWS_KEY]" in sanitized


def test_extract_exceptions_and_timestamps():
    logs = """
    2026-11-06T12:00:00Z INFO: Starting process
    2026-11-06T12:00:05Z ERROR: ConnectionTimeoutError occurred when calling payment gateway
    2026-11-06T12:00:06Z FATAL: LockTimeout in database table orders
    """
    signals = LogProcessor.analyze_logs(logs)
    assert len(signals["timestamps"]) >= 2
    assert "ConnectionTimeoutError" in signals["exceptions"]
    assert "LockTimeout" in signals["exceptions"]
    assert len(signals["highlighted_lines"]) >= 2

