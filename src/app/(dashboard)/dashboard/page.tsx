import { auth } from "@/auth"
import { getDashboardData } from "@/lib/dashboard"
import { prisma } from "@/lib/prisma"
import { DashboardCanvas, type WidgetEntry } from "@/components/dashboard/DashboardCanvas"
import { StatsRow } from "@/components/dashboard/StatsRow"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { DataTypeBreakdown } from "@/components/dashboard/DataTypeBreakdown"
import { BreachSourcesList } from "@/components/dashboard/BreachSourcesList"
import { TopRiskyEmployees } from "@/components/dashboard/TopRiskyEmployees"
import { DepartmentRisk } from "@/components/dashboard/DepartmentRisk"
import { AlertsFeed } from "@/components/dashboard/AlertsFeed"
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
    // Row 1 — KPIs full width
    {
      instanceId: "stats-row",
      type: "stats-row",
      defaultTitle: "Key Metrics",
      defaultSize: { w: 12, h: 4 },
      defaultPosition: { x: 0, y: 0 },
      minSize: { w: 6, h: 3 },
      centerContent: true,
      content: <StatsRow {...data} />,
    },
    // Row 2 — Timeline (large) + Severity donut + Breach sources
    {
      instanceId: "trend-chart",
      type: "trend-chart",
      defaultTitle: "Incident Timeline",
      defaultSize: { w: 5, h: 6 },
      defaultPosition: { x: 0, y: 4 },
      minSize: { w: 4, h: 5 },
      content: <TrendChart data={data.trendData} />,
    },
    {
      instanceId: "top-risky-employees",
      type: "top-risky-employees",
      defaultTitle: "Top Employees at Risk",
      defaultSize: { w: 4, h: 6 },
      defaultPosition: { x: 5, y: 4 },
      minSize: { w: 3, h: 4 },
      content: <TopRiskyEmployees data={data.topRiskyEmployees} />,
    },
    {
      instanceId: "breach-sources",
      type: "breach-sources",
      defaultTitle: "Breach Sources",
      defaultSize: { w: 4, h: 6 },
      defaultPosition: { x: 9, y: 4 },
      minSize: { w: 3, h: 4 },
      content: <BreachSourcesList data={data.breachSources} />,
    },
    // Row 3 — Department + Data types + Alerts feed
    {
      instanceId: "department-risk",
      type: "department-risk",
      defaultTitle: "Department Exposure",
      defaultSize: { w: 4, h: 6 },
      defaultPosition: { x: 0, y: 10 },
      minSize: { w: 3, h: 4 },
      content: <DepartmentRisk data={data.departmentRisk} />,
    },
    {
      instanceId: "data-type-breakdown",
      type: "data-type-breakdown",
      defaultTitle: "Exposed Data Types",
      defaultSize: { w: 4, h: 6 },
      defaultPosition: { x: 4, y: 10 },
      minSize: { w: 3, h: 4 },
      content: <DataTypeBreakdown data={data.dataTypes} />,
    },
    {
      instanceId: "alerts-feed",
      type: "alerts-feed",
      defaultTitle: "Recent Alerts",
      defaultSize: { w: 4, h: 6 },
      defaultPosition: { x: 8, y: 10 },
      minSize: { w: 3, h: 4 },
      content: <AlertsFeed data={data.recentAlerts} />,
    },
  ]

  return <DashboardCanvas widgets={widgets} initialConfig={initialConfig} />
}
