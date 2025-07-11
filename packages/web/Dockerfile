# Build Stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Build the application
RUN pnpm build:web

# Production Stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy PWA assets that need special cache headers
RUN mkdir -p /usr/share/nginx/html/pwa
COPY --from=builder /app/packages/web/dist/manifest.webmanifest /usr/share/nginx/html/pwa/
COPY --from=builder /app/packages/web/dist/sw.js /usr/share/nginx/html/pwa/

# Add security headers and configure for PWA
RUN echo 'server_tokens off;' > /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-Content-Type-Options nosniff;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-Frame-Options DENY;' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Content-Security-Policy "default-src '\''self'\''; connect-src '\''self'\'' ws: wss: https:; img-src '\''self'\'' data: https:; style-src '\''self'\'' '\''unsafe-inline'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; font-src '\''self'\'' data:;";' >> /etc/nginx/conf.d/security.conf

# Create a custom nginx.conf that includes our security config
RUN echo 'include /etc/nginx/conf.d/security.conf;' >> /etc/nginx/conf.d/default.conf

# Add cache control for static assets
RUN echo 'location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {' >> /etc/nginx/conf.d/default.conf && \
    echo '    expires 30d;' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Cache-Control "public, no-transform";' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Special handling for service worker and manifest
RUN echo 'location /sw.js {' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Cache-Control "no-cache";' >> /etc/nginx/conf.d/default.conf && \
    echo '    expires -1;' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf && \
    echo 'location /manifest.webmanifest {' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Cache-Control "no-cache";' >> /etc/nginx/conf.d/default.conf && \
    echo '    expires -1;' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Support client-side routing
RUN echo 'location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '    try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
