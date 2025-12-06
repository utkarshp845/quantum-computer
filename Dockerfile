# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code (excluding .env.local for security)
COPY . .

# Build arguments for environment variables (with defaults)
ARG VITE_OPENROUTER_API_KEY=""
ARG VITE_AI_MODEL="meta-llama/llama-3.2-3b-instruct:free"
ARG OPENROUTER_API_KEY=""
ARG AI_MODEL="meta-llama/llama-3.2-3b-instruct:free"

# Set environment variables for build
# Vite will use these during build time via loadEnv
ENV VITE_OPENROUTER_API_KEY=${VITE_OPENROUTER_API_KEY:-${OPENROUTER_API_KEY}}
ENV VITE_AI_MODEL=${VITE_AI_MODEL:-${AI_MODEL:-meta-llama/llama-3.2-3b-instruct:free}}
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-${VITE_OPENROUTER_API_KEY}}
ENV AI_MODEL=${AI_MODEL:-${VITE_AI_MODEL:-meta-llama/llama-3.2-3b-instruct:free}}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

