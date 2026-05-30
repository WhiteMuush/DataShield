import { prisma } from "@/lib/prisma"
import { calculateRiskScore, getRiskLevel } from "@/lib/risk"

export { calculateRiskScore, getRiskLevel }

export async function getDashboardData(companyId: string) {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalEmployees,
    compromisedEmployees,
    openAlerts,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    recentBreaches,
    trendRecords,
    allBreachRecords,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId } }),
    prisma.employee.count({ where: { companyId, breachRecords: { some: {} } } }),
    prisma.alert.count({ where: { companyId, status: "OPEN" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "CRITICAL" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "HIGH" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "MEDIUM" } }),
    prisma.breachRecord.count({
      where: { employee: { companyId }, detectedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.breachRecord.findMany({
      where: { employee: { companyId }, detectedAt: { gte: twelveMonthsAgo } },
      select: { detectedAt: true },
    }),
    prisma.breachRecord.findMany({
      where: { employee: { companyId } },
      select: { exposedData: true },
    }),
  ])

  const riskScore = calculateRiskScore({
    totalEmployees,
    compromisedEmployees,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    recentBreaches,
  })

  return {
    totalEmployees,
    compromisedEmployees,
    openAlerts,
    recentBreaches,
    riskScore,
    trendData: buildTrendData(trendRecords),
    dataTypes: buildDataTypes(allBreachRecords),
  }
}

function buildTrendData(records: { detectedAt: Date }[]) {
  const months: Record<string, number> = {}

  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" })
    months[key] = 0
  }

  records.forEach(({ detectedAt }) => {
    const key = new Date(detectedAt).toLocaleString("en-US", { month: "short", year: "2-digit" })
    if (key in months) months[key]++
  })

  return Object.entries(months).map(([month, count]) => ({ month, count }))
}

function buildDataTypes(records: { exposedData: string[] }[]) {
  const counts: Record<string, number> = {}
  const total = records.reduce((sum, r) => sum + r.exposedData.length, 0)

  records.forEach(({ exposedData }) => {
    exposedData.forEach((type) => {
      counts[type] = (counts[type] || 0) + 1
    })
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
}
