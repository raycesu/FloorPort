-- Remove cached chart data for retired 24h and 1m ranges
delete from public.price_cache
where key like 'cg:market_chart:%:24h:%'
   or key like 'cg:market_chart:%:1m:%'
   or key like 'bn:klines:%:24h:%'
   or key like 'bn:klines:%:1m:%'
   or key like 'cb:candles:%:24h:%'
   or key like 'cb:candles:%:1m:%';
