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
  // 両方のOSのツリーデータを保持
  const [trees, setTrees] = useState<{
    linux: Tree | null,
    windows: Tree | null
  }>({ linux: null, windows: null })
  
  // 現在表示中のツリー
  const [currentTree, setCurrentTree] = useState<Tree | null>(null)
  
  // LocalStorageから初期データを読み込む、なければデフォルト値
  const getInitialTabs = (os: 'windows' | 'linux'): TabData[] => {
    const savedData = localStorage.getItem(`tracetree-tabs-${os}`)
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

  const getInitialActiveTabId = (os: 'windows' | 'linux'): string => {
    const savedData = localStorage.getItem(`tracetree-tabs-${os}`)
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
    return getInitialTabs(os)[0].id
  }

  // 初期OSモードをLocalStorageから読み込む
  const getInitialOsMode = (): 'windows' | 'linux' => {
    const savedMode = localStorage.getItem('tracetree-os-mode')
    if (savedMode === 'linux') return 'linux'
    return 'windows'
  }

  const initialOsMode = getInitialOsMode()
  
  const [osMode, setOsMode] = useState<'windows' | 'linux'>(initialOsMode)
  const [tabs, setTabs] = useState<TabData[]>(() => getInitialTabs(initialOsMode))
  const [activeTabId, setActiveTabId] = useState<string>(() => getInitialActiveTabId(initialOsMode))
  const [showPathModal, setShowPathModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初期化後にosModeをセット
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSwitchingOs, setIsSwitchingOs] = useState(false) // OS切り替え中フラグ
  
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // LocalStorageのキー
  const STORAGE_KEY = `tracetree-tabs-${osMode}`

  // タブデータが変更されたらLocalStorageに保存
  useEffect(() => {
    if (tabs.length > 0 && !loading && !isSwitchingOs) {
      const dataToSave = {
        tabs,
        activeTabId
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    }
  }, [tabs, activeTabId, loading, isSwitchingOs])  // STORAGE_KEYを依存から削除

  // OSモードが変更されたら、メモリ内のツリーデータを切り替える
  useEffect(() => {
    // 初回マウント時またはツリーデータ未取得時はスキップ
    if (!isInitialized || !trees.linux || !trees.windows) return
    
    setIsSwitchingOs(true)
    localStorage.setItem('tracetree-os-mode', osMode)
    
    // メモリ内のツリーデータを切り替え
    const newTree = osMode === 'linux' ? trees.linux : trees.windows
    setCurrentTree(newTree)
    
    // LocalStorageから該当OSのタブデータを読み込む
    const newTabs = getInitialTabs(osMode)
    const newActiveTabId = getInitialActiveTabId(osMode)
    
    // タブデータを復元
    setTabs(newTabs.map(tab => {
      // nodeHierarchyが空の場合のみrootノードを設定
      if (tab.nodeHierarchy.length === 0) {
        return {
          ...tab,
          nodeHierarchy: [{
            node: newTree.nodes[newTree.root_node_id],
            level: 0,
            parentId: null
          }]
        }
      }
      return tab // 既存のタブデータを保持
    }))
    
    setActiveTabId(newActiveTabId)
    
    setTimeout(() => setIsSwitchingOs(false), 100)
  }, [osMode, isInitialized, trees])

  // アクティブなタブのデータを取得
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  
  // アクティブなタブのデータを更新するヘルパー関数
  const updateActiveTab = (updates: Partial<TabData>) => {
    setTabs(tabs.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ))
  }

  // 現在のOSのデータを初期化
  const clearCurrentOs = () => {
    const confirmed = window.confirm(
      `${osMode === 'windows' ? 'Windows' : 'Linux'}側のデータを初期化しますか？\nすべてのタブと選択内容がリセットされます。`
    )
    
    if (!confirmed) return
    
    // Set 1だけ残して初期化
    const initialTabId = `tab-${Date.now()}`
    const resetTabs: TabData[] = [{
      id: initialTabId,
      name: 'Set 1',
      nodeHierarchy: currentTree ? [{
        node: currentTree.nodes[currentTree.root_node_id],
        level: 0,
        parentId: null
      }] : [],
      selectedOptions: {},
      showHints: {},
      triedNodes: {},
      decidedNodes: {}
    }]
    
    setTabs(resetTabs)
    setActiveTabId(initialTabId)
  }

  // 初回マウント時に両方のツリーデータを取得
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('http://localhost:8000/api/trees/nmap-basics-linux').then(res => {
        if (!res.ok) throw new Error('Failed to fetch linux tree')
        return res.json()
      }),
      fetch('http://localhost:8000/api/trees/nmap-basics-windows').then(res => {
        if (!res.ok) throw new Error('Failed to fetch windows tree')
        return res.json()
      })
    ])
      .then(([linuxData, windowsData]) => {
        setTrees({ linux: linuxData, windows: windowsData })
        
        // 初期OSモードに応じたツリーを設定
        const initialTree = initialOsMode === 'linux' ? linuxData : windowsData
        setCurrentTree(initialTree)
        
        // nodeHierarchyが空のタブのみrootノードを設定
        setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.nodeHierarchy.length === 0) {
            return {
              ...tab,
              nodeHierarchy: [{
                node: initialTree.nodes[initialTree.root_node_id],
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
  }, []) // 空の依存配列 = 初回のみ実行

  // 新しいタブを追加
  const addNewTab = () => {
    if (tabs.length >= 10) return // 最大10個
    
    const newTabNumber = tabs.length + 1
    const newTab: TabData = {
      id: `tab-${Date.now()}`, // タイムスタンプでユニークなIDを生成
      name: `Set ${newTabNumber}`,
      nodeHierarchy: currentTree ? [{
        node: currentTree.nodes[currentTree.root_node_id],
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
    if (!currentTree || !activeTab) return

    const selectedOptionId = activeTab.selectedOptions[nodeId]
    if (!selectedOptionId) return

    const currentNode = currentTree.nodes[nodeId]
    const selectedOption = currentNode.options.find(opt => opt.id === selectedOptionId)
    
    if (selectedOption?.next_node_ids) {
      // 「flag獲得！」が選択された場合、自動的にモーダルを表示
      if (selectedOption.label === 'flag獲得！') {
        // decidedNodesを更新してからモーダルを表示
        updateActiveTab({
          decidedNodes: { ...activeTab.decidedNodes, [nodeId]: Date.now() }
        })
        // 少し遅延させてステート更新を確実にする
        setTimeout(() => setShowPathModal(true), 100)
        return
      }
      
      // このノードより下の階層を削除
      const filteredHierarchy = activeTab.nodeHierarchy.filter(n => n.level <= currentLevel)
      
      // 複数の次ノードを追加
      const newNodes: NodeWithLevel[] = []
      selectedOption.next_node_ids.forEach(nextNodeId => {
        const nextNode = currentTree.nodes[nextNodeId]
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

  if (loading) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
      color: 'white',
      fontSize: '18px',
      fontWeight: '500'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ animation: 'pulse 1.5s ease-in-out infinite', marginBottom: '20px', fontSize: '48px' }}>
          🌲
        </div>
        <div>読み込み中...</div>
      </div>
    </div>
  )
  if (error) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '40px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <div style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>エラーが発生しました</div>
        <div style={{ color: '#666' }}>{error}</div>
      </div>
    </div>
  )
  if (!currentTree || !activeTab) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      <div style={{ color: '#666', fontSize: '18px' }}>データがありません</div>
    </div>
  )

  const nodesByLevel = getNodesByLevel()
  const maxLevel = Math.max(...Object.keys(nodesByLevel).map(Number))

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* モダンなグラデーションヘッダー */}
      <header style={{
        background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
        padding: '24px 40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 左側: ロゴとタイトル */}
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '32px', 
              fontWeight: '700',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>
              TraceTree
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '400'
            }}>
              CTF Attack Path Mapper - HTB Machine Exploitation Visualizer
            </p>
          </div>

          {/* 右側: ボタン群 */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* OS切り替えトグル */}
            <div style={{
              display: 'inline-flex',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '10px',
              padding: '4px',
              backdropFilter: 'blur(10px)'
            }}>
              <button
                onClick={() => setOsMode('windows')}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: osMode === 'windows' ? 'white' : 'transparent',
                  color: osMode === 'windows' ? '#667eea' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: osMode === 'windows' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                🪟 Windows
              </button>
              <button
                onClick={() => setOsMode('linux')}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: osMode === 'linux' ? 'white' : 'transparent',
                  color: osMode === 'linux' ? '#243b55' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: osMode === 'linux' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                🐧 Linux
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div style={{ padding: '40px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Clearボタン & Flag獲得ボタン */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '24px',
          justifyContent: 'flex-end'
        }}>
          {/* Clearボタン */}
          <button
            onClick={clearCurrentOs}
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'white',
              color: '#e53e3e',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(229,62,62,0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e53e3e'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.color = '#e53e3e'
            }}
          >
            🗑️ Clear
          </button>

          {/* Flag獲得ボタン */}
          <button
            onClick={() => setShowPathModal(true)}
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(72,187,120,0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
            }}
          >
            🚩 Flag獲得
          </button>
        </div>

        {/* タブバー */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '32px',
          alignItems: 'flex-end'
        }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                backgroundColor: activeTabId === tab.id ? 'white' : '#e2e8f0',
                color: activeTabId === tab.id ? '#667eea' : '#64748b',
                borderRadius: '10px 10px 0 0',
                cursor: 'pointer',
                fontWeight: activeTabId === tab.id ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                boxShadow: activeTabId === tab.id ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
                border: activeTabId === tab.id ? 'none' : '1px solid #cbd5e1',
                borderBottom: 'none'
              }}
              onClick={() => setActiveTabId(tab.id)}
              onMouseEnter={(e) => {
                if (activeTabId !== tab.id) {
                  e.currentTarget.style.backgroundColor = '#cbd5e1'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTabId !== tab.id) {
                  e.currentTarget.style.backgroundColor = '#e2e8f0'
                }
              }}
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
                    color: activeTabId === tab.id ? '#64748b' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 4px',
                    lineHeight: '1',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#e53e3e'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeTabId === tab.id ? '#64748b' : '#94a3b8'
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
                padding: '12px 24px',
                backgroundColor: 'white',
                border: '2px dashed #cbd5e1',
                borderBottom: 'none',
                borderRadius: '10px 10px 0 0',
                cursor: 'pointer',
                color: '#94a3b8',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#243b55'
                e.currentTarget.style.color = '#243b55'
                e.currentTarget.style.backgroundColor = '#f8f9fa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1'
                e.currentTarget.style.color = '#94a3b8'
                e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              + 新しいタブ
            </button>
          )}
        </div>

        {/* ツリーコンテンツ */}
        {Array.from({ length: maxLevel + 1 }, (_, level) => (
          <div key={level} style={{ marginBottom: '48px' }}>
            {nodesByLevel[level] && (
              <>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  marginBottom: '20px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {level + 1}
                  </div>
                  <span>Level {level + 1}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '24px',
                  flexWrap: 'wrap',
                  marginBottom: '32px'
                }}>
                  {nodesByLevel[level].map((nodeWithLevel) => {
                    const node = nodeWithLevel.node
                    const isTried = activeTab.triedNodes[node.id]
                    const isDecided = activeTab.decidedNodes[node.id]
                    return (
                      <div 
                        key={node.id}
                        style={{ 
                          border: isDecided ? '2px solid #667eea' : '1px solid #e2e8f0',
                          borderRadius: '16px', 
                          padding: '24px',
                          backgroundColor: 'white',
                          flex: '1 1 320px',
                          minWidth: '320px',
                          maxWidth: '420px',
                          opacity: isTried ? 0.6 : 1,
                          filter: isTried ? 'grayscale(70%)' : 'none',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          boxShadow: isDecided 
                            ? '0 4px 20px rgba(36,59,85,0.3)' 
                            : '0 2px 8px rgba(0,0,0,0.05)',
                          animation: 'slideUp 0.4s ease-out'
                        }}
                      >
                        {/* 試行済みボタン */}
                        <button
                          onClick={() => toggleTried(node.id)}
                          style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isTried ? '#feb2b2' : '#e2e8f0',
                            color: isTried ? '#742a2a' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isTried ? '#fc8181' : '#cbd5e1'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isTried ? '#feb2b2' : '#e2e8f0'
                          }}
                        >
                          {isTried ? '✗ 試行済み' : '✗ 失敗'}
                        </button>

                        <h3 style={{ 
                          marginBottom: '16px',
                          fontSize: '18px',
                          fontWeight: '600',
                          marginRight: '90px',
                          color: '#1a202c',
                          lineHeight: '1.4'
                        }}>
                          {node.question}
                        </h3>
                        
                        {(node.hint || node.hints) && (
                          <div style={{ marginBottom: '20px' }}>
                            <button
                              onClick={() => toggleHint(node.id)}
                              style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab.showHints[node.id] 
                                  ? 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)'
                                  : '#fef5e7',
                                color: activeTab.showHints[node.id] ? 'white' : '#c05621',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: activeTab.showHints[node.id]
                                  ? '0 2px 8px rgba(237,137,54,0.3)'
                                  : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!activeTab.showHints[node.id]) {
                                  e.currentTarget.style.backgroundColor = '#feebc8'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!activeTab.showHints[node.id]) {
                                  e.currentTarget.style.backgroundColor = '#fef5e7'
                                }
                              }}
                            >
                              💡 {activeTab.showHints[node.id] ? 'ヒントを隠す' : 'ヒントを表示'}
                            </button>
                            
                            {activeTab.showHints[node.id] && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* 新しいhints形式 */}
                                {node.hints && node.hints.map((hint, index) => (
                                  <div 
                                    key={index}
                                    style={{ 
                                      backgroundColor: hint.type === 'command' ? '#1a202c' : '#fef5e7',
                                      color: hint.type === 'command' ? '#68d391' : '#744210',
                                      padding: hint.type === 'command' ? '16px' : '12px',
                                      borderRadius: '8px',
                                      fontFamily: hint.type === 'command' ? "'Monaco', 'Menlo', 'Consolas', monospace" : 'inherit',
                                      fontSize: hint.type === 'command' ? '13px' : '13px',
                                      border: hint.type === 'text' ? '1px solid #fbd38d' : 'none',
                                      wordBreak: 'break-word',
                                      whiteSpace: 'pre-wrap',
                                      textAlign: hint.text.trim() === 'or' ? 'center' : 'left',
                                      boxShadow: hint.type === 'command' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                                      position: 'relative',
                                      lineHeight: '1.6'
                                    }}
                                  >
                                    {hint.type === 'command' && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        fontSize: '10px',
                                        color: '#718096',
                                        fontWeight: '600',
                                        letterSpacing: '0.5px'
                                      }}>
                                        TERMINAL
                                      </div>
                                    )}
                                    {hint.text}
                                  </div>
                                ))}
                                
                                {/* 旧形式（後方互換性） */}
                                {!node.hints && node.hint && node.hint.split('\n').map((hintLine, index) => {
                                  const isTextLine = node.hint_type === 'command' && (
                                    hintLine.trim().startsWith('設定値') ||
                                    hintLine.trim().startsWith('※') ||
                                    hintLine.trim().startsWith('・') ||
                                    hintLine.trim() === 'or'
                                  )
                                  
                                  const useCommandStyle = node.hint_type === 'command' && !isTextLine
                                  
                                  return (
                                    <div 
                                      key={index}
                                      style={{ 
                                        backgroundColor: useCommandStyle ? '#1a202c' : '#fef5e7',
                                        color: useCommandStyle ? '#68d391' : '#744210',
                                        padding: useCommandStyle ? '16px' : '12px',
                                        borderRadius: '8px',
                                        fontFamily: useCommandStyle ? "'Monaco', 'Menlo', 'Consolas', monospace" : 'inherit',
                                        fontSize: useCommandStyle ? '13px' : '13px',
                                        border: !useCommandStyle ? '1px solid #fbd38d' : 'none',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        textAlign: hintLine.trim() === 'or' ? 'center' : 'left',
                                        boxShadow: useCommandStyle ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                                        position: 'relative',
                                        lineHeight: '1.6'
                                      }}
                                    >
                                      {useCommandStyle && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '8px',
                                          right: '8px',
                                          fontSize: '10px',
                                          color: '#718096',
                                          fontWeight: '600',
                                          letterSpacing: '0.5px'
                                        }}>
                                          TERMINAL
                                        </div>
                                      )}
                                      {hintLine}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <select 
                            value={activeTab.selectedOptions[node.id] || ''}
                            onChange={(e) => updateActiveTab({
                              selectedOptions: { ...activeTab.selectedOptions, [node.id]: e.target.value }
                            })}
                            style={{ 
                              padding: '12px 16px', 
                              fontSize: '14px',
                              borderRadius: '8px',
                              border: '2px solid #e2e8f0',
                              width: '100%',
                              backgroundColor: 'white',
                              color: '#1a202c',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#243b55'
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(36,59,85,0.15)'
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#e2e8f0'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <option value="">選択してください...</option>
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
                              padding: '12px 24px',
                              fontSize: '14px',
                              fontWeight: '600',
                              borderRadius: '8px',
                              border: 'none',
                              background: (activeTab.selectedOptions[node.id] && !isTried) 
                                ? 'linear-gradient(135deg, #141e30 0%, #243b55 100%)'
                                : '#cbd5e1',
                              color: 'white',
                              cursor: (activeTab.selectedOptions[node.id] && !isTried) ? 'pointer' : 'not-allowed',
                              transition: 'all 0.3s ease',
                              boxShadow: (activeTab.selectedOptions[node.id] && !isTried)
                                ? '0 2px 8px rgba(36,59,85,0.4)'
                                : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (activeTab.selectedOptions[node.id] && !isTried) {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #0f1620 0%, #1a2d44 100%)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeTab.selectedOptions[node.id] && !isTried) {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #141e30 0%, #243b55 100%)'
                              }
                            }}
                          >
                            ✓ 決定
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

    {/* モーダル */}
    {showPathModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
              animation: 'slideUp 0.4s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              onClick={() => setShowPathModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0'
                e.currentTarget.style.color = '#1e293b'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              ×
            </button>

            <h2 style={{ 
              marginBottom: '32px', 
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '28px',
              fontWeight: '700'
            }}>
              🚩 攻略パス
            </h2>

            {getSelectedPath().length === 0 ? (
              <div style={{ 
                color: '#94a3b8', 
                textAlign: 'center', 
                padding: '60px 20px',
                fontSize: '16px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>📝</div>
                <div>まだノードが選択されていません</div>
              </div>
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
                          border: '2px solid #48bb78',
                          borderRadius: '12px',
                          padding: '24px',
                          backgroundColor: '#f0fdf4',
                          marginBottom: '16px',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* 背景装飾 */}
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '-10px',
                          width: '80px',
                          height: '80px',
                          background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                          opacity: '0.05',
                          borderRadius: '50%'
                        }} />
                        
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#38a169', 
                          fontWeight: '700',
                          marginBottom: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          STEP {index + 1}
                        </div>
                        <div style={{ 
                          fontSize: '17px', 
                          fontWeight: '600',
                          marginBottom: '12px',
                          color: '#1a202c',
                          lineHeight: '1.5'
                        }}>
                          {node.question}
                        </div>
                        {selectedOption && (
                          <div style={{
                            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                            color: 'white',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            display: 'inline-block',
                            fontSize: '14px',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(72,187,120,0.3)'
                          }}>
                            ✓ {selectedOption.label}
                          </div>
                        )}
                      </div>

                      {/* 矢印 */}
                      {index < getSelectedPath().length - 1 && (
                        <div style={{ 
                          textAlign: 'center', 
                          fontSize: '28px',
                          color: '#48bb78',
                          margin: '8px 0',
                          fontWeight: 'bold'
                        }}>
                          ↓
                        </div>
                      )}
                    </div>
                  )
                })}

                <div style={{ 
                  marginTop: '32px', 
                  padding: '20px',
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(72,187,120,0.3)'
                }}>
                  🎉 合計 {getSelectedPath().length} ステップで攻略成功！
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
