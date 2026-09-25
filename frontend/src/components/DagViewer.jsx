import React, { useEffect, useRef } from 'react';

/**
 * A lightweight SVG-based DAG visualizer.
 * Renders tasks as nodes and dependencies as directed arrows.
 */
export default function DagViewer({ tasks, dependencies, onTaskClick }) {
  const svgRef = useRef(null);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        No tasks to visualize.
      </div>
    );
  }

  // Assign layers via topological sort
  const layers = computeLayers(tasks, dependencies);
  const NODE_W = 180;
  const NODE_H = 60;
  const H_GAP = 60;
  const V_GAP = 20;
  const PADDING = 40;

  const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b);
  const maxLayer = Math.max(...layerKeys);

  // Position nodes
  const positions = {};
  layerKeys.forEach((layer) => {
    const nodes = layers[layer];
    const totalHeight = nodes.length * NODE_H + (nodes.length - 1) * V_GAP;
    nodes.forEach((id, i) => {
      positions[id] = {
        x: PADDING + layer * (NODE_W + H_GAP),
        y: PADDING + i * (NODE_H + V_GAP) - totalHeight / 2 + 200,
      };
    });
  });

  const svgWidth = PADDING * 2 + (maxLayer + 1) * (NODE_W + H_GAP);
  const allY = Object.values(positions).map((p) => p.y);
  const svgHeight = Math.max(300, Math.max(...allY) + NODE_H + PADDING);

  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));

  return (
    <div className="overflow-auto rounded-xl bg-[#0d1120] border border-white/10 p-2">
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="min-w-full"
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" opacity="0.7" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Draw edges */}
        {dependencies.map((dep) => {
          const from = positions[dep.predecessor_id];
          const to = positions[dep.successor_id];
          if (!from || !to) return null;
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          const cx = (x1 + x2) / 2;
          return (
            <g key={`${dep.predecessor_id}-${dep.successor_id}`}>
              <path
                d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                fill="none"
                stroke={dep.ai_suggested ? '#a855f7' : '#3b82f6'}
                strokeWidth="1.5"
                strokeOpacity="0.6"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}

        {/* Draw nodes */}
        {tasks.map((task) => {
          const pos = positions[task.id];
          if (!pos) return null;
          const isBlocked = task.status === 'Blocked';
          return (
            <g
              key={task.id}
              transform={`translate(${pos.x},${pos.y})`}
              onClick={() => onTaskClick(task)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`Task node: ${task.title}`}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                ry={10}
                fill={isBlocked ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'}
                stroke={isBlocked ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}
                strokeWidth="1"
              />
              {/* Status indicator */}
              <circle
                cx={14}
                cy={NODE_H / 2}
                r={5}
                fill={isBlocked ? '#ef4444' : '#22c55e'}
                opacity={0.85}
              />
              {/* Title */}
              <foreignObject x={24} y={8} width={NODE_W - 32} height={NODE_H - 16}>
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    fontSize: '11px',
                    fontFamily: 'Inter, sans-serif',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {task.title}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 px-2 pt-2 pb-1">
        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
          <span className="w-3 h-0.5 bg-blue-500 rounded" />
          Manual dependency
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
          <span className="w-3 h-0.5 bg-purple-500 rounded" />
          AI-suggested
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Ready
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Blocked
        </div>
      </div>
    </div>
  );
}

/**
 * Kahn's algorithm for topological layer assignment.
 * Returns { layerIndex: [taskId, ...] }
 */
function computeLayers(tasks, dependencies) {
  const ids = tasks.map((t) => t.id);
  const inDegree = {};
  const adj = {};

  ids.forEach((id) => { inDegree[id] = 0; adj[id] = []; });
  dependencies.forEach(({ predecessor_id, successor_id }) => {
    if (inDegree[successor_id] !== undefined) inDegree[successor_id]++;
    if (adj[predecessor_id]) adj[predecessor_id].push(successor_id);
  });

  const layers = {};
  const layerOf = {};
  let queue = ids.filter((id) => inDegree[id] === 0);
  let layer = 0;

  while (queue.length > 0) {
    layers[layer] = queue;
    queue.forEach((id) => { layerOf[id] = layer; });
    const nextQueue = [];
    queue.forEach((id) => {
      adj[id].forEach((succ) => {
        inDegree[succ]--;
        if (inDegree[succ] === 0) nextQueue.push(succ);
      });
    });
    queue = nextQueue;
    layer++;
  }

  // Fallback: include any nodes not yet placed (cycles or isolated)
  ids.forEach((id) => {
    if (layerOf[id] === undefined) {
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(id);
    }
  });

  return layers;
}
