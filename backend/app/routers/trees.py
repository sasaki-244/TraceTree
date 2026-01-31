from fastapi import APIRouter, HTTPException
from app.models.tree import Tree
import json
from pathlib import Path

router = APIRouter(prefix="/api/trees", tags=["trees"])


@router.get("/{tree_id}")
async def get_tree(tree_id: str):
    """指定されたツリーの全データを取得"""
    file_path = Path(f"app/data/trees/{tree_id}.json")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Tree not found")
    
    with open(file_path, "r", encoding="utf-8") as f:
        tree_data = json.load(f)
    
    # Pydanticモデルでバリデーション
    tree = Tree(**tree_data)
    
    return tree
