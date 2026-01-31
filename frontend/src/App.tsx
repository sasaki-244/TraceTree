import { useEffect, useState } from 'react'
import type { Tree, Node } from './types/tree'

function App() {
  const [tree, setTree] = useState<Tree | null>(null)
  const [visitedNodes, setVisitedNodes] = useState<Node[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
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
        // 最初のノードを追加
        setVisitedNodes([data.nodes[data.root_node_id]])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleDecision = (nodeId: string) => {
    if (!tree) return

    const selectedOptionId = selectedOptions[nodeId]
    if (!selectedOptionId) return

    const currentNode = tree.nodes[nodeId]
    const selectedOption = currentNode.options.find(opt => opt.id === selectedOptionId)
    
    if (selectedOption?.next_node_id) {
      const nextNode = tree.nodes[selectedOption.next_node_id]
      if (nextNode && !visitedNodes.find(n => n.id === nextNode.id)) {
        setVisitedNodes([...visitedNodes, nextNode])
      }
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>
  if (!tree || visitedNodes.length === 0) return <div style={{ padding: '20px' }}>データがありません</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{tree.title}</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>{tree.description}</p>

      {visitedNodes.map((node, index) => (
        <div 
          key={node.id}
          style={{ 
            border: '2px solid #333', 
            borderRadius: '8px', 
            padding: '30px',
            backgroundColor: '#f9f9f9',
            marginBottom: '30px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ 
              backgroundColor: '#333', 
              color: 'white', 
              padding: '5px 15px', 
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              ステップ {index + 1}
            </span>
            <h2 style={{ margin: 0 }}>{node.question}</h2>
          </div>
          
          {node.command && (
            <div style={{ 
              backgroundColor: '#1e1e1e', 
              color: '#00ff00', 
              padding: '15px', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {node.command}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              value={selectedOptions[node.id] || ''}
              onChange={(e) => setSelectedOptions({ ...selectedOptions, [node.id]: e.target.value })}
              style={{ 
                padding: '10px', 
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                flex: 1,
                maxWidth: '300px'
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
              onClick={() => handleDecision(node.id)}
              disabled={!selectedOptions[node.id]}
              style={{
                padding: '10px 30px',
                fontSize: '16px',
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
      ))}
    </div>
  )
}

export default App
