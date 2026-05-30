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
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 6, h: 2 },
  },
  {
    type: "trend-chart",
    defaultTitle: "Incident Timeline",
    description: "Area chart showing breach detections over time",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 4 },
  },
  {
    type: "data-type-breakdown",
    defaultTitle: "Exposed Data Types",
    description: "Distribution of compromised data categories",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
  },
]

export function getWidgetDef(type: string): WidgetDef | undefined {
  return WIDGETS.find((w) => w.type === type)
}

export { WIDGETS }
