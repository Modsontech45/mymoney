# ============= Base image =============
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml package.json ./
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# ============= Dependencies =============
FROM base AS deps
RUN pnpm install --frozen-lockfile;

# ============= Build stage =============
FROM deps AS build
COPY . .
RUN if [ "$NODE_ENV" = "production" ]; then \
    pnpm run build; \
    fi

# ============= Production image =============
FROM node:22-alpine AS prod
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set environment
ENV NODE_ENV=production

# Copy only compiled JS and package files
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Optional: uploads folder for persistent files
RUN mkdir -p uploads

# Install only production deps
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Expose app port
EXPOSE 3000

# Start compiled JS
CMD ["node", "dist/server.js"]


# # ============= Development image =============
# FROM node:22-alpine AS dev
# WORKDIR /app
# RUN corepack enable && corepack prepare pnpm@latest --activate
# ENV NODE_ENV=development
# COPY pnpm-lock.yaml package.json ./
# RUN pnpm install --frozen-lockfile
# RUN pnpm add -g nodemon
# COPY . .
# EXPOSE 3000
# CMD ["pnpm", "dev"]
