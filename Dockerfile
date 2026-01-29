# Gunakan Node.js LTS sebagai base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files untuk caching dependencies
COPY package*.json ./

# Install production dependencies only
# Gunakan npm ci untuk instalasi yang lebih cepat dan deterministik
RUN npm install

# Copy seluruh source code
# File sensitif seperti .env, secrets/, dll sudah di-exclude via .dockerignore
COPY . .

# Set environment variable untuk production
ENV NODE_ENV=production

# Expose port (Cloud Run/VM akan menggunakan PORT environment variable)
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
