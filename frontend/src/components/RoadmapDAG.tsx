'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import type { FlowNode, FlowEdge } from '@/lib/api';
import DifficultyBadge from './DifficultyBadge';

// ── Custom SkillNode component ────────────────────────────────────────

interface SkillNodeProps {
  data: FlowNode['data'];
  selected?: boolean;
}

function SkillNode({ data, selected }: SkillNodeProps) {
  const statusColors: Record<string, string> = {
    todo:        'var(--border-subtle)',
    in_progress: 'var(--accent-warning)',
    done:        'var(--accent-success)',
  };
  const borderColor = selected ? 'var(--accent-primary)' : statusColors[data.status] || statusColors.todo;

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       `2px solid ${borderColor}`,
      borderRadius: 14,
      padding:      '14px 16px',
      width:        220,
      backdropFilter: 'blur(12px)',
      boxShadow:    selected
        ? '0 0 20px rgba(99,102,241,0.4), 0 8px 32px rgba(0,0,0,0.4)'
        : '0 4px 16px rgba(0,0,0,0.3)',
      cursor:       'pointer',
      transition:   'all 0.2s ease',
      position:     'relative',
    }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'var(--accent-primary)', width: 8, height: 8, border: 'none' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1, marginRight: 8 }}>
          {data.label}
        </p>
        <DifficultyBadge difficulty={data.difficulty} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          ⏱ {data.duration_days}d
        </span>
        {data.citations && data.citations.length > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)' }}>
            📡 {data.citations.length} sources
          </span>
        )}
      </div>

      {data.status !== 'todo' && (
        <div style={{
          marginTop: 6,
          height: 3,
          borderRadius: 99,
          background: data.status === 'done' ? 'var(--accent-success)' : 'var(--accent-warning)',
        }} />
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'var(--accent-primary)', width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { skillNode: SkillNode as any };

// ── RoadmapDAG ───────────────────────────────────────────────────────

interface Props {
  nodes:   FlowNode[];
  edges:   FlowEdge[];
  onNodeClick: (node: FlowNode) => void;
}

export default function RoadmapDAG({ nodes, edges, onNodeClick }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rfNodes: Node[] = nodes.map(n => ({
    id:       n.id,
    type:     n.type,
    position: n.position,
    data:     n.data as unknown as Record<string, unknown>,
    selected: n.id === selectedId,
  }));

  const rfEdges: Edge[] = edges.map(e => ({
    id:       e.id,
    source:   e.source,
    target:   e.target,
    animated: e.animated,
    type:     e.type,
    style:    { stroke: 'var(--accent-primary)', strokeWidth: 2, opacity: 0.6 },
  }));

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id);
    const original = nodes.find(n => n.id === node.id);
    if (original) onNodeClick(original);
  }, [nodes, onNodeClick]);

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(99,102,241,0.08)" gap={24} size={1.5} />
        <Controls style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} />
        <MiniMap
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
          nodeColor={() => 'rgba(99,102,241,0.5)'}
          maskColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>
    </div>
  );
}
