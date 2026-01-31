import { useEffect, useState } from 'react'
import type { Tree, Node } from './types/tree'

function App() {
  const [tree, setTree] = useState<Tree | null>(null)
  const [currentNode, setCurrentNode] = useState<Node | null>(null)
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
        // 最初のノードを表示
        setCurrentNode(data.nodes[data.root_node_id])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>
  if (!tree || !currentNode) return <div style={{ padding: '20px' }}>データがありません</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{tree.title}</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>{tree.description}</p>

      <div style={{ 
        border: '2px solid #333', 
        borderRadius: '8px', 
        padding: '30px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ marginBottom: '20px' }}>{currentNode.question}</h2>
        
        {currentNode.command && (
          <div style={{ 
            backgroundColor: '#1e1e1e', 
            color: '#00ff00', 
            padding: '15px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {currentNode.command}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            ポート選択：
          </label>
          <select style={{ 
            padding: '10px', 
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '200px'
          }}>
            <option value="">選択してください</option>
            {currentNode.options.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default App
