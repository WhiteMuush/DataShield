export type WidgetDef = {
  type: string
  defaultTitle: string
  description: string
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
}

const WIDGETS: WidgetDef[] = [
  {
    type: "stats-row",
    defaultTitle: "Key Metrics",
    description: "KPI cards with key security metrics",
    defaultSize: { w: 12, h: 4 },
    minSize: { w: 6, h: 3 },
  },
  {
    type: "trend-chart",
    defaultTitle: "Incident Timeline",
    description: "Area chart showing breach detections over time",
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 4, h: 5 },
  },
  {
    type: "data-type-breakdown",
    defaultTitle: "Exposed Data Types",
    description: "Distribution of compromised data categories",
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
  },
  {
    type: "breach-sources",
    defaultTitle: "Breach Sources",
    description: "Sites that exposed company employee data",
    defaultSize: { w: 5, h: 7 },
    minSize: { w: 3, h: 4 },
  },
  {
    type: "severity-donut",
    defaultTitle: "Alert Severity",
    description: "Alert distribution by severity level",
    defaultSize: { w: 3, h: 6 },
    minSize: { w: 2, h: 4 },
  },
  {
    type: "department-risk",
    defaultTitle: "Department Exposure",
    description: "Compromised employees by department",
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
  },
  {
    type: "alerts-feed",
    defaultTitle: "Recent Alerts",
    description: "Latest security alerts feed",
    defaultSize: { w: 4, h: 7 },
    minSize: { w: 3, h: 4 },
  },
]

export function getWidgetDef(type: string): WidgetDef | undefined {
  return WIDGETS.find((w) => w.type === type)
}

export { WIDGETS }
