# Docker Setup for CardlessID

This guide covers containerizing and running the CardlessID application using Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- A `.env.local` or `.env` file with required environment variables

## Quick Start

### Production Mode

Build and run the production container:

```bash
# Build the image
docker build -t cardlessid:latest .

# Run with environment file
docker run -p 3000:3000 --env-file .env.local cardlessid:latest

# OR using docker-compose
docker-compose up app
```

Visit http://localhost:3000

### Development Mode

Run with hot-reload for development:

```bash
# Using docker-compose
docker-compose --profile development up dev
```

Visit http://localhost:5173

## Docker Files Overview

### Dockerfile (Production)

Multi-stage build optimized for production:
- **Stage 1**: Install development dependencies
- **Stage 2**: Install production dependencies only
- **Stage 3**: Build the application
- **Stage 4**: Create minimal runtime image with built app

Features:
- Alpine Linux base (small image size)
- Health checks for container orchestration
- Production-optimized dependencies

### Dockerfile.dev (Development)

Single-stage build for development:
- Includes all dev dependencies
- Hot-reload support
- Volume mounting for live code changes

### docker-compose.yml

Orchestrates services with proper environment configuration:
- **app**: Production service (default)
- **dev**: Development service (requires `--profile development`)

## Environment Variables

The application requires several environment variables. Create a `.env` or `.env.local` file in the project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_WORLDCOIN_APP_ID=your_worldcoin_id

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Algorand Configuration
VITE_APP_WALLET_ADDRESS=your_wallet_address
VITE_ALGORAND_NETWORK=testnet
ISSUER_PRIVATE_KEY=your_private_key
ISSUER_REGISTRY_APP_ID=your_app_id
ADMIN_MNEMONIC="your mnemonic phrase"
ADMIN_ADDRESS="your_address"

# Google Document AI
ID_FRAUD_ENDPOINT=your_endpoint
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# Face Comparison
FACE_COMPARISON_PROVIDER=aws-rekognition

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REKOGNITION_THRESHOLD=85
AWS_TEXTRACT_CONFIDENCE_THRESHOLD=80

# Security
HMAC_SECRET=your_hmac_secret
MOBILE_API_KEY=your_api_key
SESSION_SECRET=your_session_secret
```

**IMPORTANT**: Never commit `.env.local` or `.env` to version control. These files are excluded in `.dockerignore`.

## Common Commands

### Building

```bash
# Build production image
docker build -t cardlessid:latest .

# Build with specific tag
docker build -t cardlessid:v1.0.0 .

# Build development image
docker build -f Dockerfile.dev -t cardlessid:dev .

# Build without cache
docker build --no-cache -t cardlessid:latest .
```

### Running

```bash
# Run production container
docker run -p 3000:3000 --env-file .env.local cardlessid:latest

# Run with custom port
docker run -p 8080:3000 --env-file .env.local cardlessid:latest

# Run in detached mode
docker run -d -p 3000:3000 --env-file .env.local --name cardlessid cardlessid:latest

# Run development container with volume mount
docker run -p 5173:5173 -v $(pwd):/app -v /app/node_modules --env-file .env.local cardlessid:dev
```

### Docker Compose

```bash
# Start production service
docker-compose up

# Start in detached mode
docker-compose up -d

# Start development service
docker-compose --profile development up dev

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start
docker-compose up --build
```

### Maintenance

```bash
# View running containers
docker ps

# View logs
docker logs cardlessid
docker logs -f cardlessid  # Follow logs

# Execute commands in container
docker exec -it cardlessid sh

# Stop container
docker stop cardlessid

# Remove container
docker rm cardlessid

# Remove image
docker rmi cardlessid:latest

# Clean up unused resources
docker system prune -a
```

## Health Checks

The production container includes a health check that:
- Runs every 30 seconds
- Times out after 10 seconds
- Allows 40 seconds startup time
- Retries 3 times before marking unhealthy

Check container health:

```bash
docker ps  # Shows health status
docker inspect cardlessid | grep -A 10 Health
```

## Deployment

### Docker Registry

Push to a container registry (Docker Hub, AWS ECR, etc.):

```bash
# Tag for registry
docker tag cardlessid:latest your-registry/cardlessid:latest

# Login to registry
docker login your-registry

# Push image
docker push your-registry/cardlessid:latest
```

### Production Considerations

1. **Secrets Management**: Use Docker secrets or environment variable injection from your orchestration platform
2. **Google Credentials**: Mount `google-credentials.json` as a volume or pass as environment variable
3. **Logging**: Configure logging driver for centralized logs
4. **Resource Limits**: Set memory and CPU limits
5. **Networking**: Use Docker networks for service communication
6. **Persistent Storage**: If needed, mount volumes for data persistence

Example with resource limits:

```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env.local \
  --memory="512m" \
  --cpus="1.0" \
  --restart=unless-stopped \
  --name cardlessid \
  cardlessid:latest
```

### Kubernetes Deployment

Create a deployment.yaml:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cardlessid
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cardlessid
  template:
    metadata:
      labels:
        app: cardlessid
    spec:
      containers:
      - name: cardlessid
        image: your-registry/cardlessid:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: cardlessid-secrets
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 30
        resources:
          limits:
            memory: "512Mi"
            cpu: "1000m"
          requests:
            memory: "256Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: cardlessid
spec:
  selector:
    app: cardlessid
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Troubleshooting

### Container won't start

1. Check logs: `docker logs cardlessid`
2. Verify environment variables are set
3. Ensure required files exist (google-credentials.json)
4. Check port availability: `lsof -i :3000`

### Build fails

1. Clear Docker cache: `docker builder prune`
2. Check network connectivity for npm install
3. Verify package.json and package-lock.json are present

### Application errors

1. Exec into container: `docker exec -it cardlessid sh`
2. Check environment: `env | grep VITE`
3. Verify file permissions
4. Check application logs inside container

### Development hot-reload not working

1. Ensure volume is mounted correctly
2. Check file permissions on host
3. Verify `node_modules` volume is anonymous

## Security Notes

- `.dockerignore` excludes sensitive files from the image
- Environment variables should be injected at runtime, not baked into the image
- Use multi-stage builds to minimize final image size and attack surface
- Regularly update base image: `docker pull node:20-alpine`
- Scan images for vulnerabilities: `docker scan cardlessid:latest`

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Router Deployment](https://reactrouter.com/en/main/start/deployment)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
