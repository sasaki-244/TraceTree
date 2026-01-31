import { useEffect, useState } from 'react'
import type { Tree, Node } from './types/tree'

// ノードの階層情報を持つ型
interface NodeWithLevel {
  node: Node
  level: number
  parentId: string | null
}

function App() {
  const [tree, setTree] = useState<Tree | null>(null)
  const [nodeHierarchy, setNodeHierarchy] = useState<NodeWithLevel[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [showHints, setShowHints] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // APIからツリーデータを取得
    fetch('http://localhost:8000/api/trees/nmap-basics')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tree')
        return res.json()
      })
      .then((data: Tree) => {
        setTree(data)
        // 最初のノードを追加（レベル0）
        setNodeHierarchy([{
          node: data.nodes[data.root_node_id],
          level: 0,
          parentId: null
        }])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleDecision = (nodeId: string, currentLevel: number) => {
    if (!tree) return

    const selectedOptionId = selectedOptions[nodeId]
    if (!selectedOptionId) return

    const currentNode = tree.nodes[nodeId]
    const selectedOption = currentNode.options.find(opt => opt.id === selectedOptionId)
    
    if (selectedOption?.next_node_ids) {
      // 複数の次ノードを追加
      const newNodes: NodeWithLevel[] = []
      selectedOption.next_node_ids.forEach(nextNodeId => {
        const nextNode = tree.nodes[nextNodeId]
        if (nextNode && !nodeHierarchy.find(n => n.node.id === nextNode.id)) {
          newNodes.push({
            node: nextNode,
            level: currentLevel + 1,
            parentId: nodeId
          })
        }
      })
      if (newNodes.length > 0) {
        setNodeHierarchy([...nodeHierarchy, ...newNodes])
      }
    }
  }

  const toggleHint = (nodeId: string) => {
    setShowHints({ ...showHints, [nodeId]: !showHints[nodeId] })
  }

  // レベルごとにノードをグループ化
  const getNodesByLevel = () => {
    const levels: Record<number, NodeWithLevel[]> = {}
    nodeHierarchy.forEach(nodeWithLevel => {
      if (!levels[nodeWithLevel.level]) {
        levels[nodeWithLevel.level] = []
      }
      levels[nodeWithLevel.level].push(nodeWithLevel)
    })
    return levels
  }

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>
  if (!tree || nodeHierarchy.length === 0) return <div style={{ padding: '20px' }}>データがありません</div>

  const nodesByLevel = getNodesByLevel()
  const maxLevel = Math.max(...Object.keys(nodesByLevel).map(Number))

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1>{tree.title}</h1>
        <p style={{ color: '#666', marginBottom: '40px' }}>{tree.description}</p>

        {/* レベルごとに表示 */}
        {Array.from({ length: maxLevel + 1 }, (_, level) => (
          <div key={level} style={{ marginBottom: '40px' }}>
            {nodesByLevel[level] && (
              <>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  marginBottom: '20px',
                  color: '#555'
                }}>
                  レベル {level + 1}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '20px',
                  flexWrap: 'wrap',
                  marginBottom: '30px'
                }}>
                  {nodesByLevel[level].map((nodeWithLevel) => {
                    const node = nodeWithLevel.node
                    return (
                      <div 
                        key={node.id}
                        style={{ 
                          border: '2px solid #333', 
                          borderRadius: '8px', 
                          padding: '20px',
                          backgroundColor: '#f9f9f9',
                          flex: '1 1 300px',
                          minWidth: '300px',
                          maxWidth: '400px'
                        }}
                      >
                        <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>{node.question}</h3>
                        
                        {node.hint && (
                          <div style={{ marginBottom: '15px' }}>
                            <button
                              onClick={() => toggleHint(node.id)}
                              style={{
                                padding: '6px 15px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                border: '2px solid #ffc107',
                                backgroundColor: showHints[node.id] ? '#ffc107' : 'white',
                                color: showHints[node.id] ? 'white' : '#ffc107',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '8px'
                              }}
                            >
                              💡 {showHints[node.id] ? 'ヒントを隠す' : 'ヒントを表示'}
                            </button>
                            
                            {showHints[node.id] && (
                              <div style={{ 
                                backgroundColor: node.hint_type === 'command' ? '#1e1e1e' : '#fff3cd',
                                color: node.hint_type === 'command' ? '#00ff00' : '#856404',
                                padding: '12px', 
                                borderRadius: '4px',
                                fontFamily: node.hint_type === 'command' ? 'monospace' : 'inherit',
                                fontSize: '12px',
                                border: node.hint_type === 'text' ? '1px solid #ffc107' : 'none',
                                lineHeight: '1.5',
                                wordBreak: 'break-word'
                              }}>
                                {node.hint}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <select 
                            value={selectedOptions[node.id] || ''}
                            onChange={(e) => setSelectedOptions({ ...selectedOptions, [node.id]: e.target.value })}
                            style={{ 
                              padding: '8px', 
                              fontSize: '14px',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                              width: '100%'
                            }}
                          >
                            <option value="">選択してください</option>
                            {node.options.map(option => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          
                          <button
                            onClick={() => handleDecision(node.id, nodeWithLevel.level)}
                            disabled={!selectedOptions[node.id]}
                            style={{
                              padding: '8px 20px',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: selectedOptions[node.id] ? '#007bff' : '#ccc',
                              color: 'white',
                              cursor: selectedOptions[node.id] ? 'pointer' : 'not-allowed',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            決定
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
