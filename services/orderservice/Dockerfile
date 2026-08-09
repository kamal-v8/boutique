FROM node:22-alpine AS Builder
WORKDIR /usr/src/app
COPY proto/ ./proto
COPY /services/orderservice/package*.json ./
RUN npm ci --omit=dev
COPY /services/orderservice/ ./

FROM node:22-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=productio
ENV PROTO_DIR=/usr/src/app/proto
COPY --from=Builder /usr/src/app/node_modules ./node_modules
COPY --from=Builder /usr/src/app ./
EXPOSE 50055
CMD ["node", "index.js"]

