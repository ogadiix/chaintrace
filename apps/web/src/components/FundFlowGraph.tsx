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
  Sparkles,
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

  // 1. Compute Graph Nodes and Directed Edges from TraceResult with Auto-Layout
  const { nodes, edges } = useMemo(() => {
    if (!traceResult || !traceResult.paths || traceResult.paths.length === 0) {
      // Default single seed node if no trace run yet
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

    // Seed wallet is hop 0
    hopLevels.set(seedWallet.toLowerCase(), 0);

    // Extract all hops across all discovered paths
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

      if (isSeed) {
        role = 'SUSPECT';
      } else if (isVictim) {
        role = 'VICTIM';
      } else if (isSanctioned) {
        role = 'SANCTIONED';
        entityName = 'Sanctioned Mixer Service';
      } else if (isVasp) {
        role = 'VASP';
        entityName = 'Regulated Exchange Hot Wallet';
      } else if (isConsolidator) {
        role = 'CONSOLIDATOR';
      } else if (level === 1) {
        role = 'MULE';
      } else {
        role = 'UNKNOWN';
      }

      // Find original casing from edges
      let displayAddr = addrLower;
      for (const e of edgeList) {
        if (e.source.toLowerCase() === addrLower) {
          displayAddr = e.source;
          break;
        }
        if (e.target.toLowerCase() === addrLower) {
          displayAddr = e.target;
          break;
        }
      }

      nodeMap.set(displayAddr, {
        id: displayAddr,
        address: displayAddr,
        chain: chain,
        label: `${displayAddr.slice(0, 6)}...${displayAddr.slice(-4)}`,
        role: role,
        hopLevel: level,
        entityName: entityName,
        entityType: entityType,
        isDemo: displayAddr.includes('demo') || displayAddr.length > 34,
        txCount: edgeList.filter((e) => e.source === displayAddr || e.target === displayAddr).length,
      });
    });

    // 2. Hierarchical Layering Layout
    // Group nodes by hop level to generate columns
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

  // Handle Zoom & Pan interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  useEffect(() => {
    fitToScreen();
  }, [traceResult]);

  const getNodeVisuals = (role: CanvasNodeRole) => {
    switch (role) {
      case 'SUSPECT':
        return {
          border: 'stroke-rose-500',
          bg: 'fill-navy-900',
          badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          icon: <Target className="w-3.5 h-3.5 text-rose-400" />,
          title: 'PRIMARY SUSPECT',
        };
      case 'VICTIM':
        return {
          border: 'stroke-emerald-500',
          bg: 'fill-navy-900',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          title: 'REPORTED VICTIM',
        };
      case 'VASP':
        return {
          border: 'stroke-cyan-400',
          bg: 'fill-navy-900',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: <Building2 className="w-3.5 h-3.5 text-cyan-400" />,
          title: 'KNOWN VASP / EXCHANGE',
        };
      case 'SANCTIONED':
        return {
          border: 'stroke-red-500 stroke-2',
          bg: 'fill-navy-950',
          badgeBg: 'bg-red-500/30 text-red-300 border-red-500 animate-pulse',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-red-400" />,
          title: 'SANCTIONED ENTITY / MIXER',
        };
      case 'CONSOLIDATOR':
        return {
          border: 'stroke-amber-400',
          bg: 'fill-navy-900',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <Layers className="w-3.5 h-3.5 text-amber-400" />,
          title: 'CONSOLIDATION POINT',
        };
      case 'MULE':
        return {
          border: 'stroke-blue-400',
          bg: 'fill-navy-900',
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: <ArrowRight className="w-3.5 h-3.5 text-blue-400" />,
          title: 'INTERMEDIARY MULE',
        };
      default:
        return {
          border: 'stroke-slate-600 stroke-dasharray-[4,4]',
          bg: 'fill-navy-900',
          badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
          title: 'UNCLASSIFIED WALLET',
        };
    }
  };

  const filteredNodes = nodes.filter((n) => {
    if (filterRole === 'ALL') return true;
    return n.role === filterRole;
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[440px] bg-[#050810] border border-navy-800 rounded-lg overflow-hidden select-none flex flex-col"
    >
      {/* Top Controls & Filter Bar */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 sm:gap-2 bg-navy-900/90 border border-navy-700 backdrop-blur px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg max-w-[calc(100%-7.5rem)] sm:max-w-none">
        <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-bold flex items-center gap-1 truncate">
          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="hidden xs:inline sm:inline">HOP-FLOW</span> CANVAS
        </span>
        <div className="h-3 w-[1px] bg-navy-700 mx-0.5 sm:mx-1" />
        <div className="flex items-center gap-1 text-xs text-slate-300 font-mono">
          <Filter className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-navy-950 border border-navy-700 text-slate-200 rounded px-1 py-0.5 text-[10px] sm:text-[11px] focus:outline-none"
          >
            <option value="ALL">All Nodes ({nodes.length})</option>
            <option value="SUSPECT">Suspect</option>
            <option value="VICTIM">Victim</option>
            <option value="MULE">Mules</option>
            <option value="CONSOLIDATOR">Consolidator</option>
            <option value="VASP">VASPs</option>
            <option value="SANCTIONED">Sanctioned</option>
          </select>
        </div>
      </div>

      {/* Zoom / Pan Toolbar */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 sm:gap-1 bg-navy-900/90 border border-navy-700 backdrop-blur p-0.5 sm:p-1 rounded-lg shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.2, 2.5))}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.3))}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 80, y: 160 });
          }}
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-navy-800 rounded transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="text-[10px] font-mono px-2 text-slate-400">{Math.round(zoom * 100)}%</div>
      </div>

      {/* SVG Canvas */}
      <svg
        className={`w-full h-full cursor-grab active:cursor-grabbing flex-1 ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#101827" strokeWidth="0.75" />
          </pattern>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
          </marker>
          <marker
            id="arrowhead-highlight"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

        {/* Graph Transform Group */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Directed Edges */}
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
            const cy1 = y1;
            const cx2 = x1 + dx * 0.55;
            const cy2 = y2;
            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const isSelected = selectedEdgeId === edge.id;
            const isHighlight = edge.highlighted || isSelected;

            return (
              <g
                key={edge.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  onSelectEdge?.(edge);
                }}
              >
                {/* Hit test wider stroke */}
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="18" />
                {/* Visual Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isHighlight ? '#f59e0b' : '#0e7490'}
                  strokeWidth={isHighlight ? 2.5 : 1.75}
                  strokeDasharray={edge.isDemo ? '5,3' : undefined}
                  markerEnd={isHighlight ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
                  className="transition-all duration-200 group-hover:stroke-cyan-300"
                />
                {/* Amount Label Box */}
                <g transform={`translate(${midX}, ${midY - 10})`}>
                  <rect
                    x="-42"
                    y="-9"
                    width="84"
                    height="18"
                    rx="9"
                    fill="#080d1a"
                    stroke={isHighlight ? '#f59e0b' : '#1e293b'}
                    strokeWidth="1"
                    className="shadow"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isHighlight ? '#fbbf24' : '#38bdf8'}
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {edge.amount} {edge.asset}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Graph Nodes */}
          {filteredNodes.map((node) => {
            const visual = getNodeVisuals(node.role);
            const isSelected = selectedNodeId === node.id;
            const nx = node.x || 0;
            const ny = node.y || 0;

            return (
              <g
                key={node.id}
                transform={`translate(${nx}, ${ny})`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  onSelectNode?.(node);
                }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Node Box */}
                <rect
                  width="180"
                  height="64"
                  rx="8"
                  fill="#0b1120"
                  stroke={isSelected ? '#38bdf8' : visual.border.includes('rose') ? '#f43f5e' : visual.border.includes('emerald') ? '#10b981' : visual.border.includes('cyan') ? '#06b6d4' : visual.border.includes('red') ? '#ef4444' : '#334155'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-all duration-150 group-hover:stroke-cyan-400 filter drop-shadow-md"
                />

                {/* Left Role Color Stripe */}
                <rect
                  width="5"
                  height="64"
                  rx="2"
                  fill={node.role === 'SUSPECT' ? '#f43f5e' : node.role === 'VICTIM' ? '#10b981' : node.role === 'VASP' ? '#06b6d4' : node.role === 'SANCTIONED' ? '#ef4444' : '#64748b'}
                />

                {/* Icon & Title */}
                <foreignObject x="10" y="8" width="162" height="48">
                  <div className="flex flex-col justify-between h-full font-mono select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {visual.icon}
                        <span className="text-[10px] font-bold tracking-tight uppercase truncate max-w-[100px] text-slate-200">
                          {node.entityName || visual.title}
                        </span>
                      </div>
                      {node.isDemo && (
                        <span className="text-[8.5px] px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          DEMO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-slate-300 font-semibold truncate">
                        {node.label}
                      </span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-navy-950 text-slate-400 border border-navy-800">
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

      {/* Hover Info Tooltip Bar */}
      {hoveredNode && (
        <div className="absolute bottom-2 left-3 right-3 bg-navy-900/95 border border-navy-700 backdrop-blur px-3 py-1.5 rounded text-xs font-mono flex items-center justify-between text-slate-300 pointer-events-none shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">{hoveredNode.role}:</span>
            <span className="text-slate-100 font-medium">{hoveredNode.address}</span>
            {hoveredNode.entityName && (
              <span className="text-cyan-300">({hoveredNode.entityName})</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Hop: <strong className="text-slate-200">{hoveredNode.hopLevel}</strong></span>
            <span>Connections: <strong className="text-slate-200">{hoveredNode.txCount}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
