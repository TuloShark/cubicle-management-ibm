FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN apk add --no-cache curl
CMD ["node","index.js"]
