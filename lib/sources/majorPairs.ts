import type { MajorPairConfig } from '@/lib/sources/types'

/** CoinGecko coin id -> venue symbols (USDT / USD products). */
export const MAJOR_COINGECKO_PAIRS: Record<string, MajorPairConfig> = {
  bitcoin: { binance: 'BTCUSDT', coinbase: 'BTC-USD' },
  ethereum: { binance: 'ETHUSDT', coinbase: 'ETH-USD' },
  solana: { binance: 'SOLUSDT', coinbase: 'SOL-USD' },
  bnb: { binance: 'BNBUSDT', coinbase: 'BNB-USD' },
  ripple: { binance: 'XRPUSDT', coinbase: 'XRP-USD' },
  'matic-network': { binance: 'MATICUSDT', coinbase: 'MATIC-USD' },
  cardano: { binance: 'ADAUSDT', coinbase: 'ADA-USD' },
  dogecoin: { binance: 'DOGEUSDT', coinbase: 'DOGE-USD' },
  chainlink: { binance: 'LINKUSDT', coinbase: 'LINK-USD' },
  polkadot: { binance: 'DOTUSDT', coinbase: 'DOT-USD' },
  'avalanche-2': { binance: 'AVAXUSDT', coinbase: 'AVAX-USD' },
  litecoin: { binance: 'LTCUSDT', coinbase: 'LTC-USD' },
  'bitcoin-cash': { binance: 'BCHUSDT', coinbase: 'BCH-USD' },
  tron: { binance: 'TRXUSDT', coinbase: 'TRX-USD' },
  near: { binance: 'NEARUSDT', coinbase: 'NEAR-USD' },
}

export const isMajorCoingeckoId = (id: string): boolean => Boolean(MAJOR_COINGECKO_PAIRS[id])
