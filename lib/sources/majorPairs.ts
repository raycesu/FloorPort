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
  uniswap: { binance: 'UNIUSDT', coinbase: 'UNI-USD' },
  cosmos: { binance: 'ATOMUSDT', coinbase: 'ATOM-USD' },
  aave: { binance: 'AAVEUSDT', coinbase: 'AAVE-USD' },
  'shiba-inu': { binance: 'SHIBUSDT', coinbase: 'SHIB-USD' },
  stellar: { binance: 'XLMUSDT', coinbase: 'XLM-USD' },
  'ethereum-classic': { binance: 'ETCUSDT', coinbase: 'ETC-USD' },
  filecoin: { binance: 'FILUSDT', coinbase: 'FIL-USD' },
  arbitrum: { binance: 'ARBUSDT', coinbase: 'ARB-USD' },
  optimism: { binance: 'OPUSDT', coinbase: 'OP-USD' },
  'injective-protocol': { binance: 'INJUSDT', coinbase: 'INJ-USD' },
  sui: { binance: 'SUIUSDT', coinbase: 'SUI-USD' },
  'usd-coin': { binance: 'USDCUSDT', coinbase: 'USDC-USD' },
}

export const isMajorCoingeckoId = (id: string): boolean => Boolean(MAJOR_COINGECKO_PAIRS[id])
