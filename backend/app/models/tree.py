from pydantic import BaseModel
from typing import Optional, Dict, List


class Option(BaseModel):
    """選択肢"""
    id: str
    label: str
    next_node_id: Optional[str] = None


class Node(BaseModel):
    """ツリーのノード"""
    id: str
    question: str
    command: Optional[str] = None
    type: str  # 'select', 'multiselect', 'text'
    options: List[Option]
    description: Optional[str] = None
    hint: Optional[str] = None


class Tree(BaseModel):
    """ツリー全体"""
    id: str
    title: str
    description: str
    root_node_id: str
    nodes: Dict[str, Node]
