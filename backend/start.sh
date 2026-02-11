#!/bin/bash
set -e

echo "Starting TraceTree Backend..."

# データベースの初期化とマイグレーション
echo "Initializing database..."
python -m app.db.init_db

echo "Migrating JSON data..."
python -m app.db.migrate_json

# アプリケーションの起動
echo "Starting Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
