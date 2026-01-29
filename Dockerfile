# Gunakan Node.js LTS sebagai base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files untuk caching dependencies
COPY package*.json ./

# Install production dependencies only
# Gunakan npm ci untuk instalasi yang lebih cepat dan deterministik
RUN npm ci --only=production && npm cache clean --force

# Copy seluruh source code
# File sensitif seperti .env, secrets/, dll sudah di-exclude via .dockerignore
COPY . .

# Set environment variable untuk production
ENV NODE_ENV=production

# Create non-root user untuk security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app

# Switch ke non-root user
USER nodejs

# Expose port (Cloud Run/VM akan menggunakan PORT environment variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
