# Historic Price Data — Delta Spec (static history + live tail)

## ADDED Requirements

### Requirement: Static bundled price history
The system SHALL ship a static daily BTCUSD price-history data file under `web/src/data/` containing points from the earliest available Bitstamp daily candle (2011-08/09 era; SHALL start no later than 2011-09-01) through the snapshot's generation date. The file SHALL include a metadata header recording the data source, the generation timestamp, and the point count, and SHALL be imported at build time rather than fetched at runtime.

#### Scenario: Static file ships with the bundle
- **WHEN** the app bundle is built
- **THEN** the static price data is included in the bundle and requires no network request to load

#### Scenario: Coverage floor
- **WHEN** the static file is inspected
- **THEN** its first point's timestamp is no later than 2011-09-01 and its last point's timestamp is at most a few days older than the generation timestamp

#### Scenario: Provenance metadata
- **WHEN** the static file is inspected
- **THEN** it contains source, generation timestamp, and point count metadata

### Requirement: Static/live merge
The system SHALL merge the static series with the live tail at runtime by timestamp, resolving overlapping points in favor of the live values, and SHALL produce a strictly increasing series with no duplicate timestamps.

#### Scenario: Overlap resolution
- **WHEN** static and live series contain points with the same timestamp
- **THEN** the merged series keeps the live value for that timestamp

#### Scenario: Live fetch unavailable
- **WHEN** the live tail cannot be fetched and no cache exists
- **THEN** the app serves the static-only series and continues to work

#### Scenario: Monotonic output
- **WHEN** the merged series is produced
- **THEN** timestamps are strictly increasing with no duplicates

### Requirement: History snapshot script
The system SHALL provide `scripts/snapshot-history.mjs` at the repo root that fetches Bitstamp's public OHLC endpoint (`/api/v2/ohlc/btcusd/`, step 86400) in paginated batches back to the earliest available candle and writes the static price file with its metadata header. The script SHALL be runnable via `npm run snapshot:history` from `web/`.

#### Scenario: Fresh snapshot
- **WHEN** the snapshot script runs
- **THEN** it writes a valid static price file whose metadata records the generation time and source

#### Scenario: Idempotent refresh
- **WHEN** the snapshot script runs twice
- **THEN** the second run overwrites the file with a newer generation timestamp without duplicating points

## MODIFIED Requirements

### Requirement: Price history API client
The system SHALL fetch daily BTC prices from Binance's public klines API (`/api/v3/klines`, symbol `BTCUSDT`, interval `1d`) via a client in `web/src/lib/api/`, covering only the period after the static history's last timestamp. The client SHALL request from the static end time plus 1ms, batched in requests of up to 1000 candles, paginating until a batch returns fewer than 1000 candles or the start time passes the current date. Candles with a zero or non-positive close price SHALL be filtered out.

#### Scenario: Tail-only fetch
- **WHEN** the API client fetches fresh prices
- **THEN** it requests candles only from the static history's last timestamp plus 1ms onward

#### Scenario: Batch pagination
- **WHEN** the requested tail exceeds 1000 candles
- **THEN** the client makes successive requests starting at the last candle's close time plus 1ms until a batch returns fewer than 1000 candles

#### Scenario: Zero-price filtering
- **WHEN** a returned candle has a zero or non-positive close price
- **THEN** it is excluded from the returned data

#### Scenario: API failure with cached data
- **WHEN** the API is unavailable and a cached price history exists
- **THEN** the app serves the stale cache and continues to work

### Requirement: LocalStorage cache with TTL
The system SHALL cache the merged price history in localStorage with a 24-hour TTL, refreshing from the API only when the cache is older than the TTL. The cached entry SHALL record the static file's generation timestamp, and a cache whose recorded generation is older than the bundled static file's generation SHALL be treated as expired. When the cache is expired, the app SHALL serve the stale cache immediately and replace it when fresh data arrives. A manual refresh control SHALL allow the user to force a fresh fetch.

#### Scenario: Fresh cache
- **WHEN** a cached price history younger than 24 hours exists and its recorded generation matches the bundled static file
- **THEN** the app uses the cache without calling the API

#### Scenario: Expired cache
- **WHEN** the cache is older than 24 hours
- **THEN** the app fetches fresh data from the API and updates the cache

#### Scenario: Stale cache served during refresh
- **WHEN** the cache is expired and a refresh is in progress
- **THEN** the app serves the stale cached data and swaps in the fresh data when the fetch completes

#### Scenario: Newer static data invalidates cache
- **WHEN** the bundled static file's generation is newer than the cached entry's recorded generation
- **THEN** the cache is treated as expired even if younger than 24 hours

#### Scenario: Manual refresh
- **WHEN** the user activates the manual refresh control
- **THEN** the app fetches fresh data from the API and updates the cache regardless of TTL

### Requirement: Price data hook
The system SHALL provide a `useHistoricPrices` React hook that manages loading, error, and data states for the price data pipeline, merging the static series with the live tail and serving the static-only series as the fallback when the fetch fails and no cache is available.

#### Scenario: Loading state
- **WHEN** prices are being fetched
- **THEN** the hook reports a loading state

#### Scenario: Error state
- **WHEN** the fetch fails, no cache is available, and no static data exists
- **THEN** the hook reports an error state

#### Scenario: Static fallback
- **WHEN** the fetch fails and no cache is available
- **THEN** the hook returns the static-only series and reports stale data

### Requirement: Data pipeline tests
The system SHALL include Rust serde tests for `PricePoint` and Vitest tests for the API client, static data accessor, merge logic, cache layer, hook, and chart component.

#### Scenario: All price data tests pass
- **WHEN** the test suites are run
- **THEN** all historic-price-data tests pass without failure
