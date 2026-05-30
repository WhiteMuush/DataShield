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
    lowAlerts,
    recentBreaches,
    trendRecords,
    allBreachRecords,
    breachSources,
    departmentEmployees,
    recentAlerts,
    topRiskyEmployees,
  ] = await Promise.all([
    prisma.employee.count({ where: { companyId } }),
    prisma.employee.count({ where: { companyId, breachRecords: { some: {} } } }),
    prisma.alert.count({ where: { companyId, status: "OPEN" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "CRITICAL" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "HIGH" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "MEDIUM" } }),
    prisma.alert.count({ where: { companyId, status: "OPEN", severity: "LOW" } }),
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
    prisma.breach.findMany({
      where: { records: { some: { employee: { companyId } } } },
      select: {
        id: true, name: true, source: true, breachDate: true, dataTypes: true,
        records: { where: { employee: { companyId } }, select: { employeeId: true } },
      },
      orderBy: { breachDate: "desc" },
    }),
    prisma.employee.findMany({
      where: { companyId },
      select: { department: true, breachRecords: { select: { id: true } } },
    }),
    prisma.alert.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, severity: true, status: true, message: true, createdAt: true,
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.employee.findMany({
      where: { companyId, breachRecords: { some: {} } },
      select: {
        id: true, firstName: true, lastName: true, department: true,
        breachRecords: { select: { detectedAt: true, exposedData: true } },
        alerts: { where: { status: "OPEN" }, select: { severity: true } },
      },
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
    alertSeverity: { critical: criticalAlerts, high: highAlerts, medium: mediumAlerts, low: lowAlerts },
    breachSources: breachSources.map((b) => ({
      id: b.id,
      name: b.name,
      source: b.source,
      breachDate: b.breachDate.toISOString(),
      dataTypes: b.dataTypes,
      affectedEmployees: new Set(b.records.map((r) => r.employeeId)).size,
    })),
    departmentRisk: buildDepartmentRisk(departmentEmployees),
    topRiskyEmployees: buildTopRiskyEmployees(topRiskyEmployees, thirtyDaysAgo),
    recentAlerts: recentAlerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      employeeName: a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : null,
    })),
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

type EmployeeRaw = {
  id: string
  firstName: string
  lastName: string
  department: string | null
  breachRecords: { detectedAt: Date; exposedData: string[] }[]
  alerts: { severity: string }[]
}

function buildTopRiskyEmployees(employees: EmployeeRaw[], thirtyDaysAgo: Date) {
  return employees
    .map((e) => {
      const recentBreaches = e.breachRecords.filter((r) => r.detectedAt >= thirtyDaysAgo).length
      const score = calculateRiskScore({
        totalEmployees: 1,
        compromisedEmployees: 1,
        criticalAlerts: e.alerts.filter((a) => a.severity === "CRITICAL").length,
        highAlerts: e.alerts.filter((a) => a.severity === "HIGH").length,
        mediumAlerts: e.alerts.filter((a) => a.severity === "MEDIUM").length,
        recentBreaches,
      })
      return {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        department: e.department,
        breachCount: e.breachRecords.length,
        openAlerts: e.alerts.length,
        riskScore: score,
        riskLevel: getRiskLevel(score).label,
        riskVariant: getRiskLevel(score).variant,
      }
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8)
}

function buildDepartmentRisk(employees: { department: string | null; breachRecords: { id: string }[] }[]) {
  const depts: Record<string, { total: number; compromised: number }> = {}

  employees.forEach(({ department, breachRecords }) => {
    const dept = department ?? "Unknown"
    if (!depts[dept]) depts[dept] = { total: 0, compromised: 0 }
    depts[dept].total++
    if (breachRecords.length > 0) depts[dept].compromised++
  })

  return Object.entries(depts)
    .map(([dept, { total, compromised }]) => ({
      department: dept,
      total,
      compromised,
      percentage: total > 0 ? Math.round((compromised / total) * 100) : 0,
    }))
    .sort((a, b) => b.compromised - a.compromised)
    .slice(0, 8)
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
