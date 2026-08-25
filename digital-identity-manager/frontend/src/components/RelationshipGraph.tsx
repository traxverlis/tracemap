import { useEffect, useMemo, useRef, useState } from 'react'

import type { GraphEdge, GraphNode } from '../api/types'

interface PositionedNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

interface RelationshipGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  height?: number
}

const VIEW_WIDTH = 1000

function nodeColor(type: string): string {
  switch (type) {
    case 'identity':
      return 'var(--color-primary)'
    case 'account':
    case 'profile':
      return 'var(--color-info)'
    case 'finding':
      return 'var(--color-warning)'
    case 'data_broker':
      return 'var(--color-danger)'
    default:
      return 'var(--color-success)'
  }
}

function edgeColor(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'var(--color-success)'
    case 'REJECTED':
      return 'var(--color-danger)'
    case 'SUGGESTED':
      return 'var(--color-warning)'
    default:
      return 'var(--color-text-muted)'
  }
}

function createInitialNodes(nodes: GraphNode[], height: number): PositionedNode[] {
  const cx = VIEW_WIDTH / 2
  const cy = height / 2
  const radius = Math.max(130, Math.min(280, Math.min(VIEW_WIDTH, height) / 2.6))

  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2
    return {
      ...node,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    }
  })
}

export function RelationshipGraph({ nodes, edges, height = 520 }: RelationshipGraphProps): JSX.Element {
  const [simulation, setSimulation] = useState<PositionedNode[]>(() => createInitialNodes(nodes, height))
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })

  useEffect(() => {
    setSimulation(createInitialNodes(nodes, height))
  }, [height, nodes])

  useEffect(() => {
    if (nodes.length === 0) return undefined
    let frame = 0
    const animate = () => {
      setSimulation((current) => {
        const next = current.map((node) => ({ ...node }))
        const byId = new Map(next.map((node) => [node.id, node] as const))
        const centerX = VIEW_WIDTH / 2
        const centerY = height / 2

        for (let index = 0; index < next.length; index += 1) {
          for (let j = index + 1; j < next.length; j += 1) {
            const left = next[index]
            const right = next[j]
            const dx = left.x - right.x
            const dy = left.y - right.y
            const distance = Math.max(18, Math.hypot(dx, dy))
            const force = 2400 / (distance * distance)
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force
            left.vx += fx
            left.vy += fy
            right.vx -= fx
            right.vy -= fy
          }
        }

        for (const edge of edges) {
          const source = byId.get(edge.source)
          const target = byId.get(edge.target)
          if (!source || !target) continue
          const dx = target.x - source.x
          const dy = target.y - source.y
          const distance = Math.max(1, Math.hypot(dx, dy))
          const spring = (distance - 150) * 0.0025
          const fx = (dx / distance) * spring
          const fy = (dy / distance) * spring
          source.vx += fx
          source.vy += fy
          target.vx -= fx
          target.vy -= fy
        }

        for (const node of next) {
          node.vx += (centerX - node.x) * 0.0008
          node.vy += (centerY - node.y) * 0.0008
          node.vx *= 0.92
          node.vy *= 0.92
          node.x = Math.max(40, Math.min(VIEW_WIDTH - 40, node.x + node.vx))
          node.y = Math.max(40, Math.min(height - 40, node.y + node.vy))
        }

        return next
      })
      frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [edges, height, nodes.length])

  const selectedNode = useMemo(
    () => simulation.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, simulation],
  )

  return (
    <div className="graph-shell">
      <svg
        className="graph-frame"
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        onMouseMove={(event) => {
          if (!dragState.current.active) return
          const dx = event.clientX - dragState.current.x
          const dy = event.clientY - dragState.current.y
          dragState.current.x = event.clientX
          dragState.current.y = event.clientY
          setPan((current) => ({ x: current.x + dx, y: current.y + dy }))
        }}
        onMouseUp={() => {
          dragState.current.active = false
        }}
        onMouseLeave={() => {
          dragState.current.active = false
        }}
      >
        <rect
          width={VIEW_WIDTH}
          height={height}
          fill="transparent"
          onMouseDown={(event) => {
            dragState.current = { active: true, x: event.clientX, y: event.clientY }
          }}
        />
        <g transform={`translate(${pan.x}, ${pan.y})`}>
          {edges.map((edge) => {
            const source = simulation.find((node) => node.id === edge.source)
            const target = simulation.find((node) => node.id === edge.target)
            if (!source || !target) return null
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={edgeColor(edge.status)}
                strokeOpacity={0.65}
                strokeWidth={Math.max(1.5, edge.confidence / 30)}
              />
            )
          })}
          {simulation.map((node) => {
            const active = node.id === selectedNodeId
            return (
              <g key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelectedNodeId(node.id)} style={{ cursor: 'pointer' }}>
                <circle r={active ? 19 : 15} fill={nodeColor(node.type)} stroke={active ? 'white' : 'transparent'} strokeWidth={2} />
                <text y={-22} textAnchor="middle" fill="var(--color-text)" style={{ fontWeight: 600, fontSize: '13px' }}>
                  {node.label}
                </text>
                {node.sublabel ? (
                  <text y={30} textAnchor="middle" fill="var(--color-text-muted)" style={{ fontSize: '11px' }}>
                    {node.sublabel}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      </svg>
      <div className="graph-legend">
        <span>Click nodes to inspect. Drag the canvas to pan.</span>
        {selectedNode ? <span>Selected: {selectedNode.label} ({selectedNode.type})</span> : null}
      </div>
    </div>
  )
}
