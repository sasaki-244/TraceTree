"""
データベース接続設定
SQLAlchemy 2.0の非同期エンジンを使用
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# 非同期エンジンの作成
engine = create_async_engine(
    settings.async_database_url,  # 非同期ドライバ用のURLを使用
    echo=settings.DEBUG,  # SQLログを出力（開発時のみ）
    future=True,
)

# セッションファクトリー
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ベースクラス（モデル定義用）
Base = declarative_base()


# 依存性注入用のセッション取得関数
async def get_db():
    """
    FastAPIの依存性注入でDBセッションを取得
    
    使用例:
    @app.get("/trees/{tree_id}")
    async def get_tree(tree_id: str, db: AsyncSession = Depends(get_db)):
        ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
