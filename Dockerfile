# Stage 1: Install development dependencies
FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Install production dependencies
FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 3: Build application
FROM node:20-alpine AS build-env
WORKDIR /app
COPY . ./
COPY --from=development-dependencies-env /app/node_modules ./node_modules
RUN npm run build

# Stage 4: Production image
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy production dependencies
COPY --from=production-dependencies-env /app/node_modules ./node_modules

# Copy built application
COPY --from=build-env /app/build ./build

# Expose port (React Router typically uses 3000)
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "run", "start"]