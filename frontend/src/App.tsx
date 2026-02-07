import { useEffect, useState } from 'react'
import type { Tree, Node } from './types/tree'

// ノードの階層情報を持つ型
interface NodeWithLevel {
  node: Node
  level: number
  parentId: string | null
}

// タブのデータ型
interface TabData {
  id: string
  name: string
  nodeHierarchy: NodeWithLevel[]
  selectedOptions: Record<string, string>
  showHints: Record<string, boolean>
  triedNodes: Record<string, boolean>
  decidedNodes: Record<string, number>
}

function App() {
  const [tree, setTree] = useState<Tree | null>(null)
  
  // LocalStorageから初期データを読み込む、なければデフォルト値
  const getInitialTabs = (): TabData[] => {
    const savedData = localStorage.getItem('tracetree-tabs')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.tabs && parsed.tabs.length > 0) {
          return parsed.tabs
        }
      } catch (e) {
        console.error('Failed to load saved tabs:', e)
      }
    }
    // LocalStorageにデータがない場合はデフォルトのタブを作成
    const initialTabId = `tab-${Date.now()}`
    return [{
      id: initialTabId,
      name: 'Set 1',
      nodeHierarchy: [],
      selectedOptions: {},
      showHints: {},
      triedNodes: {},
      decidedNodes: {}
    }]
  }

  const getInitialActiveTabId = (): string => {
    const savedData = localStorage.getItem('tracetree-tabs')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.activeTabId) {
          return parsed.activeTabId
        }
      } catch (e) {
        console.error('Failed to load saved activeTabId:', e)
      }
    }
    return getInitialTabs()[0].id
  }

  const [tabs, setTabs] = useState<TabData[]>(getInitialTabs)
  const [activeTabId, setActiveTabId] = useState<string>(getInitialActiveTabId)
  const [showPathModal, setShowPathModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // LocalStorageのキー
  const STORAGE_KEY = 'tracetree-tabs'

  // タブデータが変更されたらLocalStorageに保存
  useEffect(() => {
    if (tabs.length > 0) {
      const dataToSave = {
        tabs,
        activeTabId
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    }
  }, [tabs, activeTabId])

  // アクティブなタブのデータを取得
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  
  // アクティブなタブのデータを更新するヘルパー関数
  const updateActiveTab = (updates: Partial<TabData>) => {
    setTabs(tabs.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ))
  }

  useEffect(() => {
    // APIからツリーデータを取得
    fetch('http://localhost:8000/api/trees/nmap-basics')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tree')
        return res.json()
      })
      .then((data: Tree) => {
        setTree(data)
        
        // LocalStorageから復元されたタブにnodeHierarchyがない場合のみ、rootノードを設定
        setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.nodeHierarchy.length === 0) {
            return {
              ...tab,
              nodeHierarchy: [{
                node: data.nodes[data.root_node_id],
                level: 0,
                parentId: null
              }]
            }
          }
          return tab
        }))
        
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // 新しいタブを追加
  const addNewTab = () => {
    if (tabs.length >= 10) return // 最大10個
    
    const newTabNumber = tabs.length + 1
    const newTab: TabData = {
      id: `tab-${Date.now()}`, // タイムスタンプでユニークなIDを生成
      name: `Set ${newTabNumber}`,
      nodeHierarchy: tree ? [{
        node: tree.nodes[tree.root_node_id],
        level: 0,
        parentId: null
      }] : [],
      selectedOptions: {},
      showHints: {},
      triedNodes: {},
      decidedNodes: {}
    }
    
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  // タブを削除
  const deleteTab = (tabId: string) => {
    if (tabs.length === 1) return // 最後の1つは削除不可
    
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    
    // タブ名を番号順に振り直す
    const renumberedTabs = newTabs.map((tab, index) => ({
      ...tab,
      name: `Set ${index + 1}`
    }))
    
    setTabs(renumberedTabs)
    
    // アクティブなタブを削除した場合、最初のタブに切り替え
    if (activeTabId === tabId) {
      setActiveTabId(renumberedTabs[0].id)
    }
  }

  const handleDecision = (nodeId: string, currentLevel: number) => {
    if (!tree || !activeTab) return

    const selectedOptionId = activeTab.selectedOptions[nodeId]
    if (!selectedOptionId) return

    const currentNode = tree.nodes[nodeId]
    const selectedOption = currentNode.options.find(opt => opt.id === selectedOptionId)
    
    if (selectedOption?.next_node_ids) {
      // このノードより下の階層を削除
      const filteredHierarchy = activeTab.nodeHierarchy.filter(n => n.level <= currentLevel)
      
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
      
      updateActiveTab({
        nodeHierarchy: [...filteredHierarchy, ...newNodes],
        decidedNodes: { ...activeTab.decidedNodes, [nodeId]: Date.now() }
      })
    }
  }

  const toggleHint = (nodeId: string) => {
    if (!activeTab) return
    updateActiveTab({
      showHints: { ...activeTab.showHints, [nodeId]: !activeTab.showHints[nodeId] }
    })
  }

  const toggleTried = (nodeId: string) => {
    if (!activeTab) return
    updateActiveTab({
      triedNodes: { ...activeTab.triedNodes, [nodeId]: !activeTab.triedNodes[nodeId] }
    })
  }

  // 選択されたパスを取得（rootからleafまで）
  const getSelectedPath = (): NodeWithLevel[] => {
    if (!activeTab) return []
    const path: NodeWithLevel[] = []
    const levelGroups = getNodesByLevel()
    
    // 各レベルで選択済みのノードを1つずつ取得
    for (let level = 0; level <= Math.max(...Object.keys(levelGroups).map(Number)); level++) {
      const nodesAtLevel = levelGroups[level]
      if (!nodesAtLevel) break
      
      // このレベルで決定済み、かつ失敗マークがついていないノードを探す
      const validNodes = nodesAtLevel.filter(n => 
        activeTab.decidedNodes[n.node.id] && !activeTab.triedNodes[n.node.id]
      )
      
      if (validNodes.length === 0) {
        // 有効なノードがない場合は終了
        break
      }
      
      // 最後に決定したノードを選択（タイムスタンプが最大のもの）
      const selectedNode = validNodes.reduce((latest, current) => {
        return activeTab.decidedNodes[current.node.id] > activeTab.decidedNodes[latest.node.id] ? current : latest
      })
      
      path.push(selectedNode)
    }
    
    return path
  }

  // レベルごとにノードをグループ化
  const getNodesByLevel = () => {
    if (!activeTab) return {}
    const levels: Record<number, NodeWithLevel[]> = {}
    activeTab.nodeHierarchy.forEach(nodeWithLevel => {
      if (!levels[nodeWithLevel.level]) {
        levels[nodeWithLevel.level] = []
      }
      levels[nodeWithLevel.level].push(nodeWithLevel)
    })
    return levels
  }

  if (loading) return <div style={{ padding: '20px' }}>読み込み中...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>
  if (!tree || !activeTab) return <div style={{ padding: '20px' }}>データがありません</div>

  const nodesByLevel = getNodesByLevel()
  const maxLevel = Math.max(...Object.keys(nodesByLevel).map(Number))

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* タブバー */}
        <div style={{ 
          display: 'flex', 
          gap: '5px', 
          marginBottom: '20px',
          borderBottom: '2px solid #ddd',
          paddingBottom: '0'
        }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: activeTabId === tab.id ? '#007bff' : '#f0f0f0',
                color: activeTabId === tab.id ? 'white' : '#333',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTabId === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTab(tab.id)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: activeTabId === tab.id ? 'white' : '#999',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 4px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          {/* 新しいタブボタン */}
          {tabs.length < 10 && (
            <button
              onClick={addNewTab}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                border: '2px dashed #ccc',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                color: '#666',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#007bff'
                e.currentTarget.style.color = '#007bff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#ccc'
                e.currentTarget.style.color = '#666'
              }}
            >
              + 新しいタブ
            </button>
          )}
        </div>

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
                    const isTried = activeTab.triedNodes[node.id]
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
                                backgroundColor: activeTab.showHints[node.id] ? '#ffc107' : 'white',
                                color: activeTab.showHints[node.id] ? 'white' : '#ffc107',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '8px'
                              }}
                            >
                              💡 {activeTab.showHints[node.id] ? 'ヒントを隠す' : 'ヒントを表示'}
                            </button>
                            
                            {activeTab.showHints[node.id] && (
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
                            value={activeTab.selectedOptions[node.id] || ''}
                            onChange={(e) => updateActiveTab({
                              selectedOptions: { ...activeTab.selectedOptions, [node.id]: e.target.value }
                            })}
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
                            disabled={!activeTab.selectedOptions[node.id] || isTried}
                            style={{
                              padding: '8px 20px',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: (activeTab.selectedOptions[node.id] && !isTried) ? '#007bff' : '#ccc',
                              color: 'white',
                              cursor: (activeTab.selectedOptions[node.id] && !isTried) ? 'pointer' : 'not-allowed',
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
                    opt => opt.id === activeTab.selectedOptions[node.id]
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
