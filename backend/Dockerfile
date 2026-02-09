FROM python:3.12-slim

WORKDIR /app

# Install system dependencies, build extensions, then remove gcc
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Remove gcc after pip install (no longer needed)
RUN apt-get purge -y gcc && apt-get autoremove -y

# Copy application code
COPY app/ ./app/

# Copy alembic files
COPY alembic/ ./alembic/
COPY alembic.ini .


# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Create upload directory with correct permissions
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app

EXPOSE 8000

# Create entrypoint script
RUN echo '#!/bin/sh\n\
echo "Running database migrations..."\n\
alembic upgrade head\n\
echo "Starting application..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8000' > /entrypoint.sh && \
    chmod +x /entrypoint.sh && \
    chown appuser:appuser /entrypoint.sh

# Switch to non-root user
USER appuser

CMD ["/entrypoint.sh"]
