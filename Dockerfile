# Gunakan Node.js LTS sebagai base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy seluruh source code
COPY . .

# Set environment variable untuk production
ENV NODE_ENV=production

# Expose port (Cloud Run akan menggunakan PORT environment variable)
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
