'use client'

import { PerformanceBars } from '@/components/PerformanceBars'

export function PortfolioPerformanceChart({
  title,
  description,
  apiQuery,
  lazyUntilVisible = true,
}: {
  title?: string
  description?: string
  apiQuery?: Record<string, string | undefined>
  /** Wait until the chart enters the viewport before fetching (recommended on dashboard/holdings). */
  lazyUntilVisible?: boolean
}) {
  return (
    <PerformanceBars
      series={[]}
      initialRange="7D"
      title={title}
      description={description}
      apiQuery={apiQuery}
      deferInitialFetch
      lazyUntilVisible={lazyUntilVisible}
    />
  )
}
