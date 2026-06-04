# ── Stage 1: Builder ──────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Copy toàn bộ môi trường Python đã cài từ builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copy mã nguồn
COPY . .

# Tạo user non-root
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import os, sys, urllib.request; role=os.getenv('SERVICE_ROLE','api'); port=os.getenv('PORT','8000'); sys.exit(0) if role in ('worker','migrate') else urllib.request.urlopen('http://127.0.0.1:%s/health/live' % port, timeout=3)"
CMD ["sh", "-c", "if [ \"${SERVICE_ROLE:-api}\" = \"worker\" ]; then exec python worker.py; else exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker --workers ${WEB_CONCURRENCY:-2} --bind 0.0.0.0:${PORT:-8000}; fi"]
