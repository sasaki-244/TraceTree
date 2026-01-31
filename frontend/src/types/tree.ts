// バックエンドのPydanticモデルに対応する型定義

export interface Option {
  id: string;
  label: string;
  next_node_id?: string;
}

export interface Node {
  id: string;
  question: string;
  command?: string;
  type: string;  // 'select', 'multiselect', 'text'
  options: Option[];
  description?: string;
  hint?: string;
}

export interface Tree {
  id: string;
  title: string;
  description: string;
  root_node_id: string;
  nodes: Record<string, Node>;
}
