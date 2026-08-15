FROM node:22-alpine AS deps
WORKDIR /usr/src/app
COPY frontend/package.json frontend/package-*.json ./
RUN npm ci

FROM node:22-alpine AS  build
RUN apk add --no-cache libc6-compat
WORKDIR  /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules/
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV  PROTO_DIR=/usr/src/app/proto
COPY --from=build /usr/src/app/.next/standalone ./
COPY  --from=build /usr/src/app/.next/static ./.next/static
COPY --from=build /usr/src/app/next.config.js ./
COPY  proto/ ./proto
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node","server.js"]
