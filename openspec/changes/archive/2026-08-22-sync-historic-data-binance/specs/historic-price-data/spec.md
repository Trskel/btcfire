# Historic Price Data — Delta Spec (CoinGecko → Binance)

## MODIFIED Requirements

### Requirement: Price history API client
The system SHALL fetch daily BTC/USD prices from Binance's public klines API (`/api/v3/klines`, symbol `BTCUSDT`, interval `1d`) via a client in `web/src/lib/api/`, batched in requests of up to 1000 candles, paginated from the genesis timestamp (2009-01-03) forward until a batch returns fewer than 1000 candles or the start time passes the current date. The Vite dev server SHALL proxy `/api/binance/*` requests to Binance. Candles with a zero or non-positive close price SHALL be filtered out.

#### Scenario: Successful fetch
- **WHEN** the API client fetches historic prices
- **THEN** it returns daily BTC/USD data points spanning from Binance's earliest available BTCUSDT daily candle (2017-08-17) to present, with no duplicate timestamps

#### Scenario: Batch pagination
- **WHEN** the requested history exceeds 1000 candles
- **THEN** the client makes successive requests starting at the last candle's close time plus 1ms until a batch returns fewer than 1000 candles

#### Scenario: Zero-price filtering
- **WHEN** a returned candle has a zero or non-positive close price
- **THEN** it is excluded from the returned data

#### Scenario: API failure with cached data
- **WHEN** the API is unavailable and a cached price history exists
- **THEN** the app serves the stale cache and continues to work

### Requirement: LocalStorage cache with TTL
The system SHALL cache the full price history in localStorage with a 24-hour TTL, refreshing from the API only when the cache is older than the TTL. When the cache is expired, the app SHALL serve the stale cache immediately and replace it when fresh data arrives. A manual refresh control SHALL allow the user to force a fresh fetch.

#### Scenario: Fresh cache
- **WHEN** a cached price history younger than 24 hours exists
- **THEN** the app uses the cache without calling the API

#### Scenario: Expired cache
- **WHEN** the cache is older than 24 hours
- **THEN** the app fetches fresh data from the API and updates the cache

#### Scenario: Stale cache served during refresh
- **WHEN** the cache is expired and a refresh is in progress
- **THEN** the app serves the stale cached data and swaps in the fresh data when the fetch completes

#### Scenario: Manual refresh
- **WHEN** the user activates the manual refresh control
- **THEN** the app fetches fresh data from the API and updates the cache regardless of TTL
