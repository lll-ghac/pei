# Compila la app en Linux (Debian 13 + Node 24, igual que el CT 211) y deja en /out
# la carpeta lista para copiar al servidor. No se usa para ejecutar la app.
FROM node:24-trixie-slim AS compilacion
WORKDIR /src
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Se copia el contenido de cada carpeta (/.) para fusionarlo con lo que ya trae standalone.
RUN npm run build \
 && mkdir -p /out/.next/static /out/public /out/drizzle /out/scripts \
 && cp -r .next/standalone/. /out/ \
 && cp -r .next/static/. /out/.next/static/ \
 && cp -r public/. /out/public/ \
 && cp -r drizzle/. /out/drizzle/ \
 && cp -r scripts/. /out/scripts/
