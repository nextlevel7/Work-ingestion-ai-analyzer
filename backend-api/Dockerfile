FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Prisma generation needs a URL, but does not connect to the database.
RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
