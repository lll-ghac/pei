#!/usr/bin/env bash
# /usr/local/bin/activar-version.sh (en el CT 211, se ejecuta con sudo).
# Activa la versión nueva que quedó en app-nueva y guarda la anterior para volver atrás.
set -euo pipefail
cd /home/app/PEI-encuesta
[ -d app-nueva ] || { echo "No existe app-nueva"; exit 1; }
rm -rf app-anterior
[ -d app ] && mv app app-anterior
mv app-nueva app
chown -R app:app app
systemctl restart encuesta-pei
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1:8080/; then
    echo "OK: versión $(cat app/VERSION 2>/dev/null) activa"
    exit 0
  fi
  sleep 1
done
echo "ERROR: la app no responde. Para volver atrás:"
echo "  cd /home/app/PEI-encuesta && mv app app-mala && mv app-anterior app && systemctl restart encuesta-pei"
exit 1
