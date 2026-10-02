#!/usr/bin/env bash
# Compila la app en Docker y la publica en el CT 211 (Guía técnica, paso 11, adaptado).
# Uso, desde la carpeta del proyecto en Git Bash o Linux:  bash despliegue/desplegar.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash en Windows: no convertir rutas como /out

SERVIDOR="${SERVIDOR:-admin@192.16.1.55}"
LLAVE="${LLAVE:-$HOME/.ssh/encuesta_pei}"
SSH=(ssh -i "$LLAVE" -o BatchMode=yes "$SERVIDOR")
REV="$(git rev-parse --short HEAD)$(git diff --quiet || echo '-modificada')"
PAQUETE="despliegue/encuesta-pei-$REV.tar.gz"

echo "== Compilando $REV en Docker (Node 24, Debian 13)"
docker build -f despliegue/Dockerfile -t encuesta-pei-build .
# El paquete se arma dentro del contenedor: así se conservan los enlaces simbólicos
# que Windows no puede crear (Turbopack enlaza los paquetes externos).
docker run --rm encuesta-pei-build sh -c "echo '$REV' > /out/VERSION && tar -czf - -C /out ." > "$PAQUETE"

echo "== Copiando al servidor"
"${SSH[@]}" "cat > /tmp/encuesta-pei.tar.gz" < "$PAQUETE"

echo "== Activando"
"${SSH[@]}" 'set -e
  sudo rm -rf /home/app/PEI-encuesta/app-nueva
  sudo mkdir -p /home/app/PEI-encuesta/app-nueva
  sudo tar -xzf /tmp/encuesta-pei.tar.gz -C /home/app/PEI-encuesta/app-nueva
  rm -f /tmp/encuesta-pei.tar.gz
  sudo /usr/local/bin/activar-version.sh'
rm -f "$PAQUETE"
