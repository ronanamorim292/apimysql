# Stage 1: Build Image
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Image
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy only the necessary files from builder
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Change to non-root user securely
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Start script running migrations safely before executing the built code
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
