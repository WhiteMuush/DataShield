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
import { SeverityDonut } from "@/components/dashboard/SeverityDonut"
import type { DashboardPreset } from "@/types/dashboard"

export default async function DashboardPage() {
  const session = await auth()
  const [data, presets, user] = await Promise.all([
    getDashboardData(session!.user.companyId),
    prisma.dashboardPreset.findMany({
      where: {
        OR: [
          { userId: session!.user.id, scope: "PERSONAL" },
          { companyId: session!.user.companyId, scope: "COMPANY" },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { activePresetId: true, role: true },
    }),
  ])

  const typedPresets: DashboardPreset[] = presets.map((p) => ({
    id: p.id,
    name: p.name,
    scope: p.scope as DashboardPreset["scope"],
    layout: p.layout as DashboardPreset["layout"],
    widgets: p.widgets as DashboardPreset["widgets"],
    userId: p.userId,
    companyId: p.companyId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

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
    // Row 2 — Main chart + Breach sources (7+5 = 12)
    {
      instanceId: "trend-chart",
      type: "trend-chart",
      defaultTitle: "Incident Timeline",
      defaultSize: { w: 7, h: 8 },
      defaultPosition: { x: 0, y: 4 },
      minSize: { w: 4, h: 5 },
      content: <TrendChart data={data.trendData} />,
    },
    {
      instanceId: "breach-sources",
      type: "breach-sources",
      defaultTitle: "Breach Sources",
      defaultSize: { w: 5, h: 8 },
      defaultPosition: { x: 7, y: 4 },
      minSize: { w: 3, h: 4 },
      content: <BreachSourcesList data={data.breachSources} />,
    },
    // Row 3 — Top risky + Department + Severity (4+5+3 = 12)
    {
      instanceId: "top-risky-employees",
      type: "top-risky-employees",
      defaultTitle: "Top Employees at Risk",
      defaultSize: { w: 4, h: 7 },
      defaultPosition: { x: 0, y: 12 },
      minSize: { w: 3, h: 4 },
      content: <TopRiskyEmployees data={data.topRiskyEmployees} />,
    },
    {
      instanceId: "department-risk",
      type: "department-risk",
      defaultTitle: "Department Exposure",
      defaultSize: { w: 5, h: 7 },
      defaultPosition: { x: 4, y: 12 },
      minSize: { w: 3, h: 4 },
      content: <DepartmentRisk data={data.departmentRisk} />,
    },
    {
      instanceId: "severity-donut",
      type: "severity-donut",
      defaultTitle: "Alert Severity",
      defaultSize: { w: 3, h: 7 },
      defaultPosition: { x: 9, y: 12 },
      minSize: { w: 2, h: 4 },
      content: <SeverityDonut data={data.alertSeverity} />,
    },
    // Row 4 — Data types + Alerts feed (6+6 = 12)
    {
      instanceId: "data-type-breakdown",
      type: "data-type-breakdown",
      defaultTitle: "Exposed Data Types",
      defaultSize: { w: 6, h: 6 },
      defaultPosition: { x: 0, y: 19 },
      minSize: { w: 3, h: 4 },
      content: <DataTypeBreakdown data={data.dataTypes} />,
    },
    {
      instanceId: "alerts-feed",
      type: "alerts-feed",
      defaultTitle: "Recent Alerts",
      defaultSize: { w: 6, h: 6 },
      defaultPosition: { x: 6, y: 19 },
      minSize: { w: 3, h: 4 },
      content: <AlertsFeed data={data.recentAlerts} />,
    },
  ]

  return (
    <DashboardCanvas
      widgets={widgets}
      presets={typedPresets}
      activePresetId={user?.activePresetId ?? null}
      userRole={user?.role ?? "VIEWER"}
    />
  )
}
