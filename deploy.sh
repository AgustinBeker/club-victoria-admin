#!/bin/bash

echo "🚀 Build frontend..."

npm run build

echo "🧹 Limpiando producción..."

rm -rf /var/www/admin-clubes/*

echo "📁 Copiando archivos..."

cp -r dist/* /var/www/admin-clubes/

echo "🔒 Corrigiendo permisos..."

chown -R www-data:www-data /var/www/admin-clubes

echo "✅ Deploy terminado"
