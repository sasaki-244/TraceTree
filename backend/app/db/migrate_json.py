"""
JSONファイルからデータベースへのマイグレーションスクリプト
"""
import asyncio
import json
from pathlib import Path
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.db.models import Tree as TreeModel


async def migrate_json_to_db():
    """
    JSONファイルからデータベースにツリーデータをインポート
    """
    # JSONファイルのパス
    json_dir = Path("app/data/trees")
    json_files = list(json_dir.glob("*.json"))
    
    if not json_files:
        print("JSONファイルが見つかりません")
        return
    
    print(f"{len(json_files)}個のJSONファイルを発見しました")
    
    async with AsyncSessionLocal() as session:
        for json_file in json_files:
            print(f"\n処理中: {json_file.name}")
            
            # JSONファイルを読み込み
            with open(json_file, "r", encoding="utf-8") as f:
                tree_data = json.load(f)
            
            # 既存のレコードを確認
            result = await session.execute(
                select(TreeModel).where(TreeModel.id == tree_data["id"])
            )
            existing_tree = result.scalar_one_or_none()
            
            if existing_tree:
                print(f"  既に存在します: {tree_data['id']}")
                print(f"  更新します...")
                existing_tree.title = tree_data["title"]
                existing_tree.description = tree_data["description"]
                existing_tree.root_node_id = tree_data["root_node_id"]
                existing_tree.nodes = tree_data["nodes"]
            else:
                # 新規作成
                new_tree = TreeModel(
                    id=tree_data["id"],
                    title=tree_data["title"],
                    description=tree_data["description"],
                    root_node_id=tree_data["root_node_id"],
                    nodes=tree_data["nodes"]
                )
                session.add(new_tree)
                print(f"  新規作成: {tree_data['id']}")
            
            # コミット
            await session.commit()
            print(f"  保存完了: {tree_data['title']}")
    
    print("\n全てのJSONファイルのマイグレーションが完了しました！")


async def main():
    """メイン処理"""
    print("=" * 60)
    print("JSONファイル → データベース マイグレーション")
    print("=" * 60)
    await migrate_json_to_db()


if __name__ == "__main__":
    asyncio.run(main())
