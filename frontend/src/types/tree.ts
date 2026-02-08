// バックエンドのPydanticモデルに対応する型定義

export interface Option {
  id: string;
  label: string;
  next_node_ids?: string[];  // 複数の次ノードID
}

export interface Hint {
  text: string;
  type: 'command' | 'text';
}

export interface Node {
  id: string;
  question: string;
  hint?: string;  // 後方互換性のため残す
  hint_type?: 'command' | 'text';  // 後方互換性のため残す
  hints?: Hint[];  // 新しいヒント形式
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
