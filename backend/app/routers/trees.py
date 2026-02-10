from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tree import Tree as TreeSchema
from app.db.models import Tree as TreeModel
from app.core.database import get_db

router = APIRouter(prefix="/api/trees", tags=["trees"])


@router.get("/{tree_id}", response_model=TreeSchema)
async def get_tree(tree_id: str, db: AsyncSession = Depends(get_db)):
    """
    指定されたツリーの全データを取得
    
    Args:
        tree_id: ツリーID（例: "nmap-basics-linux"）
        db: データベースセッション（依存性注入）
    
    Returns:
        Tree: ツリーデータ（Pydanticモデル）
    
    Raises:
        HTTPException: ツリーが見つからない場合（404）
    """
    # データベースからツリーを取得
    result = await db.execute(
        select(TreeModel).where(TreeModel.id == tree_id)
    )
    tree_model = result.scalar_one_or_none()
    
    if not tree_model:
        raise HTTPException(status_code=404, detail=f"Tree not found: {tree_id}")
    
    # SQLAlchemyモデル → Pydanticモデルに変換
    tree_dict = tree_model.to_dict()
    tree_schema = TreeSchema(**tree_dict)
    
    return tree_schema
