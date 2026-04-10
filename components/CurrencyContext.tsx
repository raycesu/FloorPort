'use client'

import type { DisplayCurrency } from '@/types'
import { createContext, useContext } from 'react'

type CurrencyContextValue = {
  currency: DisplayCurrency
  usdToCad: number
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  usdToCad: 1.35,
})

export function CurrencyProvider({
  currency,
  usdToCad,
  children,
}: {
  currency: DisplayCurrency
  usdToCad: number
  children: React.ReactNode
}) {
  return (
    <CurrencyContext.Provider value={{ currency, usdToCad }}>{children}</CurrencyContext.Provider>
  )
}

export function useDisplayCurrency() {
  return useContext(CurrencyContext)
}
