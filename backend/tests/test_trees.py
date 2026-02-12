"""Tree API endpoints test (DB access is mocked)."""
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/test")

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app


class FakeResult:
    def __init__(self, tree_model):
        self._tree_model = tree_model

    def scalar_one_or_none(self):
        return self._tree_model


class FakeTreeModel:
    def __init__(self, data):
        self._data = data

    def to_dict(self):
        return self._data


class FakeSession:
    def __init__(self, tree_model):
        self._tree_model = tree_model

    async def execute(self, _query):
        return FakeResult(self._tree_model)


TREE_FIXTURE = {
    "id": "nmap-basics-linux",
    "title": "Linux Machine Exploitation",
    "description": "Linux環境でのマシン攻略手順",
    "root_node_id": "linux-root",
    "nodes": {
        "linux-root": {
            "id": "linux-root",
            "question": "Nmapスキャンを行う",
            "type": "select",
            "options": [{"id": "opt-1", "label": "dummy", "next_node_ids": []}],
        }
    },
}


def test_get_tree_success():
    async def override_get_db():
        yield FakeSession(FakeTreeModel(TREE_FIXTURE))

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        response = client.get("/api/trees/nmap-basics-linux")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == TREE_FIXTURE["id"]
        assert body["root_node_id"] == TREE_FIXTURE["root_node_id"]
        assert "linux-root" in body["nodes"]
    finally:
        app.dependency_overrides.clear()


def test_get_tree_not_found():
    async def override_get_db():
        yield FakeSession(None)

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        response = client.get("/api/trees/unknown-tree")

        assert response.status_code == 404
        assert response.json()["detail"] == "Tree not found: unknown-tree"
    finally:
        app.dependency_overrides.clear()
