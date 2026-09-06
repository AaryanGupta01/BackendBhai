FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY apps/devtools-core/package.json ./

# Install production deps + typescript (needed for build)
RUN npm install --omit=dev && npm install --save-dev typescript

# Copy source and migrations
COPY apps/devtools-core/src ./src
COPY apps/devtools-core/tsconfig.json ./

# Build TypeScript
RUN ./node_modules/.bin/tsc

# Copy migration SQL files to dist (tsc doesn't copy .sql files)
RUN mkdir -p dist/db/migrations && cp src/db/migrations/*.sql dist/db/migrations/

# Copy proto files for protobuf decoding
COPY apps/devtools-core/proto /app/proto

# Remove devDependencies after build (smaller image)
RUN npm prune --omit=dev

# Copy UI dist to where devtools-core expects it
COPY apps/devtools-ui/dist /devtools-ui/dist

EXPOSE 4001
CMD ["node", "dist/index.js"]
