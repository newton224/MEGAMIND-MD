FROM node:20-slim

# Install system dependencies needed for sharp and baileys
RUN apt-get update && apt-get install -y \
    libvips-dev \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json ./

RUN npm install --omit=dev

# Copy source code
COPY . .

# Create required directories
RUN mkdir -p session database media temp public plugins

EXPOSE 3000

CMD ["node", "index.js"]
