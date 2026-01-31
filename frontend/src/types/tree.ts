// バックエンドのPydanticモデルに対応する型定義

export interface Option {
  id: string;
  label: string;
  next_node_ids?: string[];  // 複数の次ノードID
}

export interface Node {
  id: string;
  question: string;
  hint?: string;
  hint_type?: 'command' | 'text';
  type: string;  // 'select', 'multiselect', 'text'
  options: Option[];
  description?: string;
}

export interface Tree {
  id: string;
  title: string;
  description: string;
  root_node_id: string;
  nodes: Record<string, Node>;
}
