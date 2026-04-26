"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssertionsView } from "./assertions-view";
import { CompiledSqlView } from "./compiled-sql-view";
import { DagView } from "./dag-view";
import { ListView } from "./list-view";
import type { InvocationActionMini } from "@/lib/dataform/types";
import type { SkipReason } from "@/lib/dataform/skip-tracer";

export interface InvocationTabsProps {
  actions: InvocationActionMini[];
  targetKey: string;
  invocationId: string;
  /** Pre-computed skip explanations, keyed by target.full. */
  skipReasons?: Record<string, SkipReason>;
  /** target.full → list of Dataform tags for that action. */
  tagsByTarget?: Record<string, string[]>;
}

export function InvocationTabs({
  actions,
  targetKey,
  invocationId,
  skipReasons,
  tagsByTarget,
}: InvocationTabsProps) {
  return (
    <Tabs defaultValue="dag" className="space-y-4">
      <TabsList>
        <TabsTrigger value="dag">DAG view</TabsTrigger>
        <TabsTrigger value="list">List view</TabsTrigger>
        <TabsTrigger value="assertions">Assertions</TabsTrigger>
        <TabsTrigger value="sql">Compiled SQL</TabsTrigger>
      </TabsList>
      <TabsContent value="dag">
        <DagView
          actions={actions}
          targetKey={targetKey}
          invocationId={invocationId}
          tagsByTarget={tagsByTarget}
        />
      </TabsContent>
      <TabsContent value="list">
        <ListView
          actions={actions}
          skipReasons={skipReasons}
          tagsByTarget={tagsByTarget}
        />
      </TabsContent>
      <TabsContent value="assertions">
        <AssertionsView actions={actions} targetKey={targetKey} />
      </TabsContent>
      <TabsContent value="sql">
        <CompiledSqlView actions={actions} />
      </TabsContent>
    </Tabs>
  );
}
