FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY proto/ ./proto
COPY  services/authservice/package*.json ./
RUN npm ci --omit=dev
COPY services/authservice/ ./

FROM node:22-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PROTO_DIR=/usr/src/app/proto
COPY  --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app ./
EXPOSE 50051
CMD ["node", "index.js"]
