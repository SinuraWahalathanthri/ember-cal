FROM node:22-alpine AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY web ./web
COPY public ./public
COPY worker ./worker
COPY scripts ./scripts
COPY data/observations ./data/observations
COPY .openai ./.openai
RUN npm run build
FROM node:22-alpine
WORKDIR /app
COPY --from=web /app/dist ./dist
COPY scripts ./scripts
ENV PORT=80 HOST=0.0.0.0
EXPOSE 80
CMD ["node", "scripts/serve-worker.mjs"]
