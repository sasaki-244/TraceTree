from pydantic import BaseModel
from typing import Optional, Dict, List


class Option(BaseModel):
    """選択肢"""
    id: str
    label: str
    next_node_ids: Optional[List[str]] = None  # 複数の次ノードID


class Hint(BaseModel):
    """ヒント"""
    text: str
    type: str  # 'command' or 'text'


class Node(BaseModel):
    """ツリーのノード"""
    id: str
    question: str
    hint: Optional[str] = None  # 後方互換性のため残す
    hint_type: Optional[str] = None  # 後方互換性のため残す
    hints: Optional[List[Hint]] = None  # 新しいヒント形式
    type: str  # 'select', 'multiselect', 'text'
    options: List[Option]
    description: Optional[str] = None


class Tree(BaseModel):
    """ツリー全体"""
    id: str
    title: str
    description: str
    root_node_id: str
    nodes: Dict[str, Node]
