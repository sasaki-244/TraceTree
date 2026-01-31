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
  const [triedNodes, setTriedNodes] = useState<Record<string, boolean>>({}) // 試行済みノード
  const [decidedNodes, setDecidedNodes] = useState<Record<string, number>>({}) // 決定済みノード（決定時刻をタイムスタンプで保存）
  const [showPathModal, setShowPathModal] = useState(false) // モーダル表示状態
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
      // このノードより下の階層を削除
      const filteredHierarchy = nodeHierarchy.filter(n => n.level <= currentLevel)
      
      // 複数の次ノードを追加
      const newNodes: NodeWithLevel[] = []
      selectedOption.next_node_ids.forEach(nextNodeId => {
        const nextNode = tree.nodes[nextNodeId]
        if (nextNode) {
          newNodes.push({
            node: nextNode,
            level: currentLevel + 1,
            parentId: nodeId
          })
        }
      })
      
      setNodeHierarchy([...filteredHierarchy, ...newNodes])
      
      // 決定済みノードとして記録（タイムスタンプを保存）
      setDecidedNodes({ ...decidedNodes, [nodeId]: Date.now() })
    }
  }

  const toggleHint = (nodeId: string) => {
    setShowHints({ ...showHints, [nodeId]: !showHints[nodeId] })
  }

  const toggleTried = (nodeId: string) => {
    setTriedNodes({ ...triedNodes, [nodeId]: !triedNodes[nodeId] })
  }

  // 選択されたパスを取得（rootからleafまで）
  const getSelectedPath = (): NodeWithLevel[] => {
    const path: NodeWithLevel[] = []
    const levelGroups = getNodesByLevel()
    
    // 各レベルで選択済みのノードを1つずつ取得
    for (let level = 0; level <= Math.max(...Object.keys(levelGroups).map(Number)); level++) {
      const nodesAtLevel = levelGroups[level]
      if (!nodesAtLevel) break
      
      // このレベルで決定済み、かつ失敗マークがついていないノードを探す
      const validNodes = nodesAtLevel.filter(n => 
        decidedNodes[n.node.id] && !triedNodes[n.node.id]
      )
      
      if (validNodes.length === 0) {
        // 有効なノードがない場合は終了
        break
      }
      
      // 最後に決定したノードを選択（タイムスタンプが最大のもの）
      const selectedNode = validNodes.reduce((latest, current) => {
        return decidedNodes[current.node.id] > decidedNodes[latest.node.id] ? current : latest
      })
      
      path.push(selectedNode)
    }
    
    return path
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>{tree.title}</h1>
            <p style={{ color: '#666', marginBottom: '40px' }}>{tree.description}</p>
          </div>
          
          {/* Flag獲得ボタン */}
          <button
            onClick={() => setShowPathModal(true)}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#218838'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            🚩 Flag獲得
          </button>
        </div>

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
                    const isTried = triedNodes[node.id]
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
                          maxWidth: '400px',
                          opacity: isTried ? 0.5 : 1,
                          filter: isTried ? 'grayscale(80%)' : 'none',
                          transition: 'opacity 0.3s, filter 0.3s',
                          position: 'relative'
                        }}
                      >
                        {/* 試行済みボタン */}
                        <button
                          onClick={() => toggleTried(node.id)}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '4px',
                            border: isTried ? '2px solid #dc3545' : '2px solid #6c757d',
                            backgroundColor: isTried ? '#dc3545' : 'white',
                            color: isTried ? 'white' : '#6c757d',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isTried ? '✗ 試行済み' : '✗ 失敗'}
                        </button>

                        <h3 style={{ 
                          marginBottom: '15px', 
                          fontSize: '16px',
                          marginRight: '80px'
                        }}>
                          {node.question}
                        </h3>
                        
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

      {/* モーダル */}
      {showPathModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s'
          }}
          onClick={() => setShowPathModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '40px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              onClick={() => setShowPathModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
                padding: '5px 10px'
              }}
            >
              ×
            </button>

            <h2 style={{ marginBottom: '30px', color: '#28a745', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🚩 攻略パス
            </h2>

            {getSelectedPath().length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
                まだノードが選択されていません
              </p>
            ) : (
              <div>
                {getSelectedPath().map((nodeWithLevel, index) => {
                  const node = nodeWithLevel.node
                  const selectedOption = node.options.find(
                    opt => opt.id === selectedOptions[node.id]
                  )
                  
                  return (
                    <div key={node.id}>
                      <div
                        style={{
                          border: '2px solid #28a745',
                          borderRadius: '8px',
                          padding: '20px',
                          backgroundColor: '#f8f9fa',
                          marginBottom: '15px'
                        }}
                      >
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#28a745', 
                          fontWeight: 'bold',
                          marginBottom: '8px'
                        }}>
                          STEP {index + 1}
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold',
                          marginBottom: '10px'
                        }}>
                          {node.question}
                        </div>
                        {selectedOption && (
                          <div style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '8px 15px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            ✓ {selectedOption.label}
                          </div>
                        )}
                      </div>

                      {/* 矢印 */}
                      {index < getSelectedPath().length - 1 && (
                        <div style={{ 
                          textAlign: 'center', 
                          fontSize: '24px',
                          color: '#28a745',
                          margin: '10px 0'
                        }}>
                          ↓
                        </div>
                      )}
                    </div>
                  )
                })}

                <div style={{ 
                  marginTop: '30px', 
                  padding: '15px',
                  backgroundColor: '#d4edda',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#155724',
                  fontWeight: 'bold'
                }}>
                  🎉 合計 {getSelectedPath().length} ステップ
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
