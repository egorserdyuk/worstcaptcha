# Dokploy Deployment Guide

This document provides instructions for deploying the Worst Captcha application to Dokploy using Docker.

## Prerequisites

- Dokploy account and CLI installed
- Docker installed locally (for testing)
- Git repository pushed to your Git provider

## Docker Configuration

The project includes a production-ready Dockerfile with the following features:

### Multi-Stage Build
- **Builder stage**: Installs dependencies in a virtual environment
- **Production stage**: Minimal image with only runtime dependencies

### Security Features
- Non-root user (`appuser`) for running the application
- Minimal Alpine Linux base image
- No unnecessary packages in production

### Production Optimizations
- Gunicorn WSGI server with 2 workers
- Virtual environment for dependency isolation
- Health check endpoint for Dokploy monitoring
- Optimized caching with `.dockerignore`

## Deployment Steps

### 1. Build and Test Locally (Optional)

```bash
# Build the Docker image
docker build -t worstcaptcha .

# Run locally to test
docker run -p 5000:5000 worstcaptcha

# Access at http://localhost:5000
```

### 2. Deploy to Dokploy

#### Option A: Using Dokploy CLI

```bash
# Initialize Dokploy in your project directory
dokploy init

# Deploy to Dokploy
dokploy deploy
```

#### Option B: Using Dokploy Dashboard

1. Log in to your Dokploy dashboard
2. Click "New Project"
3. Connect your Git repository
4. Configure the following:
   - **Build Command**: `docker build -t worstcaptcha .`
   - **Port**: `5005`
   - **Health Check Path**: `/`
5. Click "Deploy"

### 3. Environment Variables

Dokploy will automatically detect the port from the Dockerfile. You can set additional environment variables in the Dokploy dashboard if needed:

- `FLASK_ENV`: Set to `production` (already set in Dockerfile)
- `SECRET_KEY`: Consider using a secure random key for production

## Configuration Details

### Gunicorn Settings

The Dockerfile uses Gunicorn with the following configuration:

- **Workers**: 2 (adjust based on your needs)
- **Bind**: `0.0.0.0:5005`
- **Timeout**: 120 seconds
- **Access Log**: stdout (visible in Dokploy logs)

To adjust Gunicorn settings, modify the `CMD` in the Dockerfile:

```dockerfile
CMD ["gunicorn", \
     "--workers", "4", \          # Increase for more traffic
     "--bind", "0.0.0.0:5005", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:app"]
```

### Health Checks

The Dockerfile includes a health check that Dokploy uses to monitor application status:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5005/ || exit 1
```

Dokploy will automatically:
- Check application health every 30 seconds
- Restart the container if health checks fail 3 times
- Wait 5 seconds before first health check after startup

### Resource Limits

For Dokploy, you can configure resource limits in the dashboard:

- **CPU**: Start with 0.5 CPU, increase if needed
- **Memory**: Start with 512MB, increase if needed

## Troubleshooting

### Application Not Starting

Check Dokploy logs:

```bash
dokploy logs
```

Common issues:
- Port already in use (check if another service is using port 5005)
- Missing dependencies (ensure requirements.txt is up to date)
- Permission errors (Dockerfile handles this with non-root user)

### Health Check Failing

If health checks are failing:
1. Verify the application is running: `curl http://localhost:5005/`
2. Check application logs in Dokploy dashboard
3. Ensure the health check endpoint is accessible

### Performance Issues

If experiencing performance issues:
1. Increase Gunicorn workers (e.g., from 2 to 4)
2. Increase memory limits in Dokploy
3. Monitor resource usage in Dokploy dashboard

## Production Considerations

### Security

1. **Secret Key**: Change the default secret key in `app.py`:
   ```python
   app.secret_key = os.environ.get('SECRET_KEY', 'your-secure-key-here')
   ```

2. **HTTPS**: Dokploy provides HTTPS by default, but verify it's enabled

3. **Database**: The current implementation uses in-memory storage. For production, consider:
   - PostgreSQL
   - Redis
   - MongoDB

### Scaling

For high-traffic scenarios:
1. Increase Gunicorn workers to 4-8
2. Add more Dokploy instances
3. Use a load balancer (Dokploy handles this automatically)

### Monitoring

Dokploy provides:
- Real-time logs
- Resource usage metrics
- Health check status
- Automatic restarts on failure

## Files Overview

- `Dockerfile`: Production Docker configuration
- `.dockerignore`: Excludes unnecessary files from Docker context
- `requirements.txt`: Python dependencies including Gunicorn
- `app.py`: Flask application entry point
- `templates/`: HTML templates
- `static/`: CSS, JavaScript, and image files

## Support

For Dokploy-specific issues, refer to the [Dokploy documentation](https://docs.dokploy.com).

For application issues, check the application logs in the Dokploy dashboard.
