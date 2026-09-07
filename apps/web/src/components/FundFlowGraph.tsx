import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Target,
  ShieldCheck,
  Building2,
  AlertOctagon,
  ArrowRight,
  Filter,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type {
  TraceResult,
  TraceHop,
  GraphCanvasNode,
  GraphCanvasEdge,
  CanvasNodeRole,
  EntityType,
} from '@chaintrace/types';

interface FundFlowGraphProps {
  traceResult: TraceResult | null;
  seedWallet: string;
  chain: string;
  onSelectNode?: (node: GraphCanvasNode) => void;
  onSelectEdge?: (edge: GraphCanvasEdge) => void;
  highlightedTxHash?: string | null;
}

export const FundFlowGraph: React.FC<FundFlowGraphProps> = ({
  traceResult,
  seedWallet,
  chain,
  onSelectNode,
  onSelectEdge,
  highlightedTxHash,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 160 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [hoveredNode, setHoveredNode] = useState<GraphCanvasNode | null>(null);

  // Compute Graph Nodes and Directed Edges from TraceResult
  const { nodes, edges } = useMemo(() => {
    if (!traceResult || !traceResult.paths || traceResult.paths.length === 0) {
      const seedNode: GraphCanvasNode = {
        id: seedWallet,
        address: seedWallet,
        chain: chain,
        label: `${seedWallet.slice(0, 6)}...${seedWallet.slice(-4)}`,
        role: 'SUSPECT',
        hopLevel: 0,
        txCount: 0,
        x: 100,
        y: 180,
      };
      return { nodes: [seedNode], edges: [] };
    }

    const nodeMap = new Map<string, GraphCanvasNode>();
    const edgeList: GraphCanvasEdge[] = [];
    const hopLevels = new Map<string, number>();

    hopLevels.set(seedWallet.toLowerCase(), 0);

    traceResult.paths.forEach((path) => {
      path.hops.forEach((hop: TraceHop) => {
        const fromAddr = hop.from_wallet || (hop as any).fromWallet;
        const toAddr = hop.to_wallet || (hop as any).toWallet;
        const hopNum = hop.hop_number ?? (hop as any).hopNumber ?? 1;
        const txHash = hop.tx_hash || (hop as any).txHash;

        if (fromAddr && !hopLevels.has(fromAddr.toLowerCase())) {
          hopLevels.set(fromAddr.toLowerCase(), hopNum - 1);
        }
        if (toAddr) {
          const prev = hopLevels.get(toAddr.toLowerCase());
          if (prev === undefined || hopNum > prev) {
            hopLevels.set(toAddr.toLowerCase(), hopNum);
          }
        }

        const edgeId = `${fromAddr}->${toAddr}:${txHash}`;
        if (!edgeList.some((e) => e.id === edgeId)) {
          edgeList.push({
            id: edgeId,
            source: fromAddr,
            target: toAddr,
            txHash: txHash,
            chain: hop.chain,
            asset: hop.asset,
            amount: hop.amount,
            timestamp: hop.timestamp,
            hopNumber: hopNum,
            isDemo: txHash.includes('demo'),
            highlighted: highlightedTxHash === txHash,
          });
        }
      });
    });

    // Classify Node Roles
    hopLevels.forEach((level, addrLower) => {
      let role: CanvasNodeRole = 'UNKNOWN';
      let entityName: string | null = null;
      let entityType: EntityType | null = null;

      const isSeed = addrLower === seedWallet.toLowerCase();
      const isVictim = addrLower.includes('victim') || addrLower.startsWith('ta4wt1');
      const isConsolidator = addrLower.includes('consolidation') || addrLower.startsWith('tconsolidation');
      const isSanctioned = addrLower.includes('sanctioned') || addrLower.includes('mixer') || addrLower.startsWith('tillicit');
      const isVasp = addrLower.includes('vasp') || addrLower.includes('binance') || addrLower.includes('wazirx') || addrLower.startsWith('tvasp');

      if (isSeed) role = 'SUSPECT';
      else if (isVictim) role = 'VICTIM';
      else if (isSanctioned) { role = 'SANCTIONED'; entityName = 'Sanctioned Mixer Service'; }
      else if (isVasp) { role = 'VASP'; entityName = 'Regulated Exchange Hot Wallet'; }
      else if (isConsolidator) role = 'CONSOLIDATOR';
      else if (level === 1) role = 'MULE';
      else role = 'UNKNOWN';

      let displayAddr = addrLower;
      for (const e of edgeList) {
        if (e.source.toLowerCase() === addrLower) { displayAddr = e.source; break; }
        if (e.target.toLowerCase() === addrLower) { displayAddr = e.target; break; }
      }

      nodeMap.set(displayAddr, {
        id: displayAddr,
        address: displayAddr,
        chain: chain,
        label: `${displayAddr.slice(0, 6)}...${displayAddr.slice(-4)}`,
        role,
        hopLevel: level,
        entityName,
        entityType,
        isDemo: displayAddr.includes('demo') || displayAddr.length > 34,
        txCount: edgeList.filter((e) => e.source === displayAddr || e.target === displayAddr).length,
      });
    });

    // Hierarchical layout
    const columns: Map<number, GraphCanvasNode[]> = new Map();
    nodeMap.forEach((node) => {
      const col = columns.get(node.hopLevel) || [];
      col.push(node);
      columns.set(node.hopLevel, col);
    });

    const COL_WIDTH = 260;
    const ROW_HEIGHT = 110;
    const START_X = 60;
    const START_Y = 60;

    const layoutNodes: GraphCanvasNode[] = [];
    const sortedLevels = Array.from(columns.keys()).sort((a, b) => a - b);

    sortedLevels.forEach((lvl, colIdx) => {
      const colNodes = columns.get(lvl) || [];
      const totalColHeight = colNodes.length * ROW_HEIGHT;
      const offsetY = START_Y + Math.max(0, (400 - totalColHeight) / 2);

      colNodes.forEach((node, rowIdx) => {
        layoutNodes.push({
          ...node,
          x: START_X + colIdx * COL_WIDTH,
          y: offsetY + rowIdx * ROW_HEIGHT,
        });
      });
    });

    return { nodes: layoutNodes, edges: edgeList };
  }, [traceResult, seedWallet, chain, highlightedTxHash]);

  // Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 2.5));
  };

  const fitToScreen = useCallback(() => {
    if (nodes.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map((n) => n.x || 0));
    const maxX = Math.max(...nodes.map((n) => (n.x || 0) + 180));
    const minY = Math.min(...nodes.map((n) => n.y || 0));
    const maxY = Math.max(...nodes.map((n) => (n.y || 0) + 80));

    const graphWidth = Math.max(maxX - minX, 200);
    const graphHeight = Math.max(maxY - minY, 200);

    const scaleX = (rect.width - 120) / graphWidth;
    const scaleY = (rect.height - 120) / graphHeight;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.2);

    setZoom(newZoom);
    setPan({
      x: (rect.width - graphWidth * newZoom) / 2 - minX * newZoom,
      y: (rect.height - graphHeight * newZoom) / 2 - minY * newZoom,
    });
  }, [nodes]);

  useEffect(() => { fitToScreen(); }, [traceResult]);

  const getRoleColor = (role: CanvasNodeRole): string => {
    const map: Record<CanvasNodeRole, string> = {
      SUSPECT: 'var(--ct-node-suspect)',
      VICTIM: 'var(--ct-node-victim)',
      VASP: 'var(--ct-node-vasp)',
      SANCTIONED: 'var(--ct-node-sanctioned)',
      MULE: 'var(--ct-node-mule)',
      CONSOLIDATOR: 'var(--ct-node-consolidator)',
      MIXER: 'var(--ct-node-mule)',
      SCAM: 'var(--ct-node-suspect)',
      UNKNOWN: 'var(--ct-node-unknown)',
    };
    return map[role] || map.UNKNOWN;
  };

  const getRoleLabel = (role: CanvasNodeRole): string => {
    const map: Record<CanvasNodeRole, string> = {
      SUSPECT: 'Suspect',
      VICTIM: 'Victim',
      VASP: 'Exchange',
      SANCTIONED: 'Sanctioned',
      MULE: 'Intermediary',
      CONSOLIDATOR: 'Consolidator',
      MIXER: 'Mixer',
      SCAM: 'Scam',
      UNKNOWN: 'Unknown',
    };
    return map[role] || 'Unknown';
  };

  const getRoleIcon = (role: CanvasNodeRole) => {
    switch (role) {
      case 'SUSPECT': return <Target className="w-3 h-3" />;
      case 'VICTIM': return <ShieldCheck className="w-3 h-3" />;
      case 'VASP': return <Building2 className="w-3 h-3" />;
      case 'SANCTIONED': return <AlertOctagon className="w-3 h-3" />;
      case 'CONSOLIDATOR': return <Layers className="w-3 h-3" />;
      case 'MULE': return <ArrowRight className="w-3 h-3" />;
      default: return <HelpCircle className="w-3 h-3" />;
    }
  };

  const filteredNodes = nodes.filter((n) => filterRole === 'ALL' || n.role === filterRole);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[440px] rounded-ct-lg overflow-hidden select-none flex flex-col"
      style={{
        background: 'var(--ct-graph-bg)',
        border: '1px solid var(--ct-border)',
      }}
    >
      {/* Filter bar */}
      <div
        className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-ct-md max-w-[50%]"
        style={{
          background: 'var(--ct-surface-overlay)',
          border: '1px solid var(--ct-border)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--ct-shadow-md)',
        }}
      >
        <span className="text-[11px] sm:text-xs font-medium hidden xs:inline" style={{ color: 'var(--ct-accent-text)' }}>
          Filter
        </span>
        <div className="hidden xs:block" style={{ width: '1px', height: '14px', background: 'var(--ct-border)' }} />
        <Filter className="w-3 h-3 hidden sm:block" style={{ color: 'var(--ct-text-tertiary)' }} />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="ct-select"
          style={{ padding: '2px 20px 2px 4px', fontSize: '11px' }}
        >
          <option value="ALL">All ({nodes.length})</option>
          <option value="SUSPECT">Suspect</option>
          <option value="VICTIM">Victim</option>
          <option value="MULE">Intermediary</option>
          <option value="CONSOLIDATOR">Consolidator</option>
          <option value="VASP">Exchange</option>
          <option value="SANCTIONED">Sanctioned</option>
        </select>
      </div>

      {/* Zoom toolbar */}
      <div
        className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 p-0.5 sm:p-1 rounded-ct-md"
        style={{
          background: 'var(--ct-surface-overlay)',
          border: '1px solid var(--ct-border)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--ct-shadow-md)',
        }}
      >
        {[
          { icon: ZoomIn, action: () => setZoom((z) => Math.min(z * 1.2, 2.5)), title: 'Zoom In' },
          { icon: ZoomOut, action: () => setZoom((z) => Math.max(z * 0.8, 0.3)), title: 'Zoom Out' },
          { icon: Maximize2, action: fitToScreen, title: 'Fit to Screen' },
          { icon: RotateCcw, action: () => { setZoom(1); setPan({ x: 80, y: 160 }); }, title: 'Reset' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            className="ct-btn-icon"
            style={{ padding: '5px' }}
            title={title}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        ))}
        <span className="text-[11px] sm:text-xs font-mono px-1 sm:px-2 hidden sm:inline" style={{ color: 'var(--ct-text-tertiary)' }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* SVG Canvas */}
      <svg
        className={`w-full h-full flex-1 touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="ct-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ct-graph-grid)" strokeWidth="0.75" />
          </pattern>
          <marker id="ct-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--ct-graph-edge)" />
          </marker>
          <marker id="ct-arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--ct-graph-edge-highlight)" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#ct-grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge) => {
            const srcNode = nodes.find((n) => n.id === edge.source);
            const dstNode = nodes.find((n) => n.id === edge.target);
            if (!srcNode || !dstNode) return null;

            const x1 = (srcNode.x || 0) + 180;
            const y1 = (srcNode.y || 0) + 32;
            const x2 = dstNode.x || 0;
            const y2 = (dstNode.y || 0) + 32;

            const dx = x2 - x1;
            const cx1 = x1 + dx * 0.45;
            const cx2 = x1 + dx * 0.55;
            const pathD = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const isSelected = selectedEdgeId === edge.id;
            const isHighlight = edge.highlighted || isSelected;

            return (
              <g
                key={edge.id}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  onSelectEdge?.(edge);
                }}
              >
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="18" />
                <path
                  d={pathD}
                  fill="none"
                  stroke={isHighlight ? 'var(--ct-graph-edge-highlight)' : 'var(--ct-graph-edge)'}
                  strokeWidth={isHighlight ? 2.5 : 1.5}
                  strokeDasharray={edge.isDemo ? '5,3' : undefined}
                  markerEnd={isHighlight ? 'url(#ct-arrow-hl)' : 'url(#ct-arrow)'}
                />
                {/* Amount label */}
                <g transform={`translate(${midX}, ${midY - 10})`}>
                  <rect x="-42" y="-9" width="84" height="18" rx="9" fill="var(--ct-graph-node-bg)" stroke={isHighlight ? 'var(--ct-graph-edge-highlight)' : 'var(--ct-graph-node-border)'} strokeWidth="1" />
                  <text x="0" y="3" textAnchor="middle" fill={isHighlight ? 'var(--ct-graph-edge-highlight)' : 'var(--ct-accent-text)'} fontSize="9.5" fontFamily="var(--ct-font-mono)" fontWeight="600">
                    {edge.amount} {edge.asset}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const roleColor = getRoleColor(node.role);
            const isSelected = selectedNodeId === node.id;
            const nx = node.x || 0;
            const ny = node.y || 0;

            return (
              <g
                key={node.id}
                transform={`translate(${nx}, ${ny})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  onSelectNode?.(node);
                }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <rect
                  width="180" height="64" rx="8"
                  fill="var(--ct-graph-node-bg)"
                  stroke={isSelected ? 'var(--ct-accent)' : 'var(--ct-graph-node-border)'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {/* Role stripe */}
                <rect width="4" height="64" rx="2" fill={roleColor} />
                {/* Content */}
                <foreignObject x="10" y="8" width="162" height="48">
                  <div className="flex flex-col justify-between h-full select-none" style={{ fontFamily: 'var(--ct-font-sans)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5" style={{ color: roleColor }}>
                        {getRoleIcon(node.role)}
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ct-text-secondary)' }}>
                          {node.entityName || getRoleLabel(node.role)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--ct-text)' }}>
                        {node.label}
                      </span>
                      <span
                        className="text-[9px] px-1 py-0.5 rounded"
                        style={{
                          background: 'var(--ct-bg-subtle)',
                          color: 'var(--ct-text-tertiary)',
                          border: '1px solid var(--ct-border-subtle)',
                        }}
                      >
                        Hop {node.hopLevel}
                      </span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-2 rounded-ct-md text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 pointer-events-none"
          style={{
            background: 'var(--ct-surface-overlay)',
            border: '1px solid var(--ct-border)',
            backdropFilter: 'blur(8px)',
            boxShadow: 'var(--ct-shadow-md)',
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium" style={{ color: 'var(--ct-accent-text)' }}>{getRoleLabel(hoveredNode.role)}:</span>
            <span className="font-mono truncate max-w-[200px] sm:max-w-none" style={{ color: 'var(--ct-text)' }}>{hoveredNode.address}</span>
            {hoveredNode.entityName && (
              <span className="hidden xs:inline" style={{ color: 'var(--ct-text-secondary)' }}>({hoveredNode.entityName})</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] sm:text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
            <span>Hop: <strong style={{ color: 'var(--ct-text)' }}>{hoveredNode.hopLevel}</strong></span>
            <span>Connections: <strong style={{ color: 'var(--ct-text)' }}>{hoveredNode.txCount}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
