"""APIの基本動作テスト（DB不要）"""
import os

import pytest
from fastapi.testclient import TestClient

# CIでDB接続しないようダミーURLを設定（ルートエンドポイントはDBを使わない）
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/test")

from app.main import app

client = TestClient(app)


def test_root():
    """ヘルスチェックエンドポイントのテスト"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "TraceTree" in data["message"]
