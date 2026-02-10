"""
SQLAlchemyモデル定義
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class Tree(Base):
    """
    ツリーデータモデル
    
    JSONファイルの構造をそのままJSONB列に保存
    """
    __tablename__ = "trees"
    
    # プライマリーキー
    id = Column(String, primary_key=True, index=True)
    
    # ツリーのメタデータ
    title = Column(String, nullable=False)
    description = Column(Text)
    root_node_id = Column(String, nullable=False)
    
    # ノードデータ（JSON構造をそのまま保存）
    nodes = Column(JSONB, nullable=False)
    
    # タイムスタンプ
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Tree(id={self.id}, title={self.title})>"
    
    def to_dict(self):
        """
        Pydanticモデルと互換性のある辞書に変換
        """
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "root_node_id": self.root_node_id,
            "nodes": self.nodes,
        }
