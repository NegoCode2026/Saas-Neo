#!/usr/bin/env bash
# Respaldo de la base local a backups/stocklocal-AAAAMMDD-HHMMSS.sql.gz
#
# Uso:        ./scripts/backup-db.sh
# Restaurar:  gunzip -c backups/<archivo> | docker exec -i stocklocal-db psql -U stocklocal -d stocklocal
# Nota: en producción (Render Postgres) los backups los gestiona el proveedor:
#       activalos en el dashboard de la base de datos.
set -euo pipefail
mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
FILE="backups/stocklocal-${TS}.sql.gz"
docker exec stocklocal-db pg_dump -U stocklocal -d stocklocal | gzip > "$FILE"
echo "Respaldo: $FILE"
# Mantener solo los últimos 7 respaldos
ls -t backups/stocklocal-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --
echo "Listo."
