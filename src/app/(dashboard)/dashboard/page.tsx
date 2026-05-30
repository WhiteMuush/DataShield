import { auth } from "@/auth"
import { getDashboardData } from "@/lib/dashboard"
import { prisma } from "@/lib/prisma"
import { DashboardCanvas, type WidgetEntry } from "@/components/dashboard/DashboardCanvas"
import { StatsRow } from "@/components/dashboard/StatsRow"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { DataTypeBreakdown } from "@/components/dashboard/DataTypeBreakdown"
import type { SavedDashboardConfig } from "@/types/dashboard"

export default async function DashboardPage() {
  const session = await auth()
  const [data, savedConfig] = await Promise.all([
    getDashboardData(session!.user.companyId),
    prisma.dashboardConfig.findUnique({ where: { userId: session!.user.id } }),
  ])

  const initialConfig: SavedDashboardConfig | null = savedConfig
    ? { layout: savedConfig.layout as any, widgets: savedConfig.widgets as any }
    : null

  const widgets: WidgetEntry[] = [
    {
      instanceId: "stats-row",
      type: "stats-row",
      defaultTitle: "Key Metrics",
      defaultSize: { w: 12, h: 3 },
      defaultPosition: { x: 0, y: 0 },
      minSize: { w: 6, h: 3 },
      content: <StatsRow {...data} />,
    },
    {
      instanceId: "trend-chart",
      type: "trend-chart",
      defaultTitle: "Incident Timeline",
      defaultSize: { w: 8, h: 6 },
      defaultPosition: { x: 0, y: 3 },
      minSize: { w: 4, h: 5 },
      content: <TrendChart data={data.trendData} />,
    },
    {
      instanceId: "data-type-breakdown",
      type: "data-type-breakdown",
      defaultTitle: "Exposed Data Types",
      defaultSize: { w: 4, h: 6 },
      defaultPosition: { x: 8, y: 3 },
      minSize: { w: 3, h: 4 },
      content: <DataTypeBreakdown data={data.dataTypes} />,
    },
  ]

  return <DashboardCanvas widgets={widgets} initialConfig={initialConfig} />
}
