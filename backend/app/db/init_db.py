"""
データベース初期化スクリプト
テーブルを作成する
"""
import asyncio
from app.core.database import engine, Base
from app.db.models import Tree  # モデルをインポート（テーブル定義を読み込むため）


async def init_db():
    """
    データベースに全てのテーブルを作成
    """
    async with engine.begin() as conn:
        # 既存のテーブルを削除（開発時のみ）
        # await conn.run_sync(Base.metadata.drop_all)
        
        # 全てのテーブルを作成
        await conn.run_sync(Base.metadata.create_all)
    
    print("データベースの初期化が完了しました")
    print(f"テーブル作成: {', '.join([table.name for table in Base.metadata.sorted_tables])}")


async def main():
    """メイン処理"""
    print("データベースを初期化しています...")
    await init_db()
    print("完了！")


if __name__ == "__main__":
    asyncio.run(main())
