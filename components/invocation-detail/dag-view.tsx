"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dagre from "dagre";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { InvocationActionMini } from "@/lib/dataform/types";
import { ActionSidePanel } from "./action-side-panel";
import { DagNode, NODE_WIDTH, NODE_HEIGHT } from "./dag-node";

export interface DagViewProps {
  actions: InvocationActionMini[];
  targetKey: string;
  invocationId: string;
  tagsByTarget?: Record<string, string[]>;
}

const nodeTypes = { sentinel: DagNode };

export function DagView(props: DagViewProps) {
  return (
    <ReactFlowProvider>
      <DagViewInner {...props} />
    </ReactFlowProvider>
  );
}

function DagViewInner({ actions, tagsByTarget }: DagViewProps) {
  const [selected, setSelected] = useState<InvocationActionMini | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(actions, tagsByTarget),
    [actions, tagsByTarget],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    const action = node.data?.action as InvocationActionMini | undefined;
    if (action) setSelected(action);
  }, []);

  const summary = useMemo(() => summarize(actions), [actions]);

  return (
    <div className="relative h-[540px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] shadow-sm">
        <Legend color="var(--status-succeeded)" label={`${summary.SUCCEEDED} succeeded`} />
        <Legend color="var(--status-failed)" label={`${summary.FAILED} failed`} />
        <Legend color="var(--status-running)" label={`${summary.RUNNING} running`} />
        <Legend color="var(--status-skipped)" label={`${summary.SKIPPED} skipped`} />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        minZoom={0.4}
        maxZoom={1.2}
      >
        <Background gap={16} color="var(--border)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => (n.data as { color?: string } | undefined)?.color ?? "var(--muted)"}
          pannable
          zoomable
        />
      </ReactFlow>

      <ActionSidePanel action={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function summarize(actions: InvocationActionMini[]) {
  const out = { SUCCEEDED: 0, FAILED: 0, RUNNING: 0, SKIPPED: 0 };
  for (const a of actions) {
    if (a.state === "SUCCEEDED") out.SUCCEEDED++;
    else if (a.state === "FAILED") out.FAILED++;
    else if (a.state === "RUNNING") out.RUNNING++;
    else if (a.state === "SKIPPED") out.SKIPPED++;
  }
  return out;
}

function buildGraph(
  actions: InvocationActionMini[],
  tagsByTarget?: Record<string, string[]>,
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 32, ranksep: 72 });

  const byTarget = new Map<string, InvocationActionMini>();
  for (const a of actions) {
    if (a.type === "ASSERTION") continue;
    byTarget.set(a.target.full, a);
    g.setNode(a.target.full, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const a of actions) {
    if (a.type === "ASSERTION") continue;
    for (const dep of a.dependencyTargets ?? []) {
      if (byTarget.has(dep)) g.setEdge(dep, a.target.full);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = [];
  for (const [id, action] of byTarget.entries()) {
    const pos = g.node(id);
    if (!pos) continue;
    nodes.push({
      id,
      type: "sentinel",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { action, tags: tagsByTarget?.[id] ?? [] },
    });
  }
  const edges: Edge[] = [];
  for (const e of g.edges()) {
    edges.push({ id: `${e.v}->${e.w}`, source: e.v, target: e.w, type: "smoothstep" });
  }
  return { nodes, edges };
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
