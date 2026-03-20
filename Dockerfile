# syntax=docker/dockerfile:1

# Stage 1: Builder - Install dependencies
FROM python:3.14-alpine AS builder

# Set environment variables
ENV LANG=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# ==================== Yandex Alpine Mirror ====================
RUN ALPINE_VER=$(cut -d'.' -f1,2 /etc/alpine-release) && \
    echo "https://mirror.yandex.ru/mirrors/alpine/v${ALPINE_VER}/main" > /etc/apk/repositories && \
    echo "https://mirror.yandex.ru/mirrors/alpine/v${ALPINE_VER}/community" >> /etc/apk/repositories
# ===========================================================================

# Install system dependencies required for building Python packages
RUN apk add --no-cache \
    gcc \
    musl-dev \
    && rm -rf /var/cache/apk/*

# Copy requirements files
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --upgrade pip && \
    pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt && \
    pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ gunicorn

# Stage 2: Production - Final image
FROM python:3.14-alpine

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Set work directory
WORKDIR /app

# ==================== Yandex Alpine Mirror ====================
RUN ALPINE_VER=$(cut -d'.' -f1,2 /etc/alpine-release) && \
    echo "https://mirror.yandex.ru/mirrors/alpine/v${ALPINE_VER}/main" > /etc/apk/repositories && \
    echo "https://mirror.yandex.ru/mirrors/alpine/v${ALPINE_VER}/community" >> /etc/apk/repositories
# ===========================================================================

# Install runtime system dependencies only
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy installed packages from builder stage
COPY --from=builder /usr/lib/python3.14/site-packages /usr/lib/python3.14/site-packages
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages

# Copy application code
COPY app.py ./
COPY templates/ ./templates/
COPY static/ ./static/

# Change ownership of app directory to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (Dokploy will use this)
EXPOSE 5005

# Health check for Dokploy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5005/ || exit 1

# Run application with Gunicorn for production
# - Workers: 2-4 recommended for small-medium apps
# - Bind: 0.0.0.0:5005 to accept all connections
# - Timeout: 120s for long-running requests
# - Access log: - for logging
CMD ["gunicorn", \
     "--workers", "2", \
     "--bind", "0.0.0.0:5005", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:app"]
