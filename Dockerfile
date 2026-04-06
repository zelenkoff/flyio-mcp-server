FROM node:22-slim

RUN apt-get update && apt-get install -y curl && \
    curl -L https://fly.io/install.sh | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV FLYCTL_INSTALL="/root/.fly"
ENV PATH="$FLYCTL_INSTALL/bin:$PATH"

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js", "--http"]
