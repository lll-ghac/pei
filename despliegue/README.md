# Operación de la plataforma (CT 211)

Resumen práctico. La historia del servidor está en `/root/bitacora.md` del CT 211.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| App en ejecución | `/home/app/PEI-encuesta/app` (versión anterior en `app-anterior`) |
| Variables y claves | `/home/app/PEI-encuesta/.env` (dueño `app`, permisos 600). Nunca se suben al repositorio |
| Respaldos previos a un reinicio | `/home/app/PEI-encuesta/respaldos` |
| Servicio | `encuesta-pei` (systemd), escucha solo en `127.0.0.1:8080` |
| Respaldo diario de la base | `/usr/local/bin/backup-pg-pei.sh`, 01:15, en `/var/backups/postgresql` |
| Dominio | `encuesta.escuelaecuador.cl` (túnel `pei-encuesta`; `pei-test.escuelaecuador.cl` apunta a lo mismo) |

## Publicar una versión nueva

Desde la carpeta del proyecto, en Git Bash (requiere Docker Desktop y la llave `~/.ssh/encuesta_pei`):

```bash
bash despliegue/desplegar.sh
```

Compila en Docker (Node 24 + Debian 13), copia el paquete por SSH y lo activa. Las migraciones de la
base se aplican solas al arrancar. Durante el modo Oficial, publicar solo correcciones y fuera del
horario en que responden los cursos.

**Volver atrás** (en el CT):

```bash
cd /home/app/PEI-encuesta && sudo mv app app-mala && sudo mv app-anterior app && sudo systemctl restart encuesta-pei
```

## Crear o recuperar una cuenta de administrador

Desde la consola de Proxmox (`pve2`). La contraseña se muestra una sola vez en esa consola:

```bash
pct exec 211 -- runuser -u app -- bash -c 'cd /home/app/PEI-encuesta/app && node --env-file=../.env scripts/crear-admin.mjs USUARIO "Nombre Apellido" admin'
```

Si el usuario ya existe, el comando le asigna una contraseña nueva. Las cuentas de la comisión se crean
desde el panel (Sistema → Cuentas de gestión).

## Revisar el estado

```bash
systemctl status encuesta-pei
sudo journalctl -u encuesta-pei -n 50
```

La app no registra peticiones, IPs ni respuestas en los logs.
