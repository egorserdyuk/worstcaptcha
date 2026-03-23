# Production image - Python 3.14 Alpine
FROM python:3.14-alpine

# Set environment variables
ENV LANG=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
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

# Install system dependencies required for building Python packages
RUN apk add --no-cache \
    gcc \
    musl-dev \
    curl \
    && rm -rf /var/cache/apk/*

# Copy requirements files
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --upgrade pip && \
    pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt && \
    pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ gunicorn

# Remove build dependencies to reduce image size
RUN apk del gcc musl-dev

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

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
