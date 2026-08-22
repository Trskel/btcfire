import type { SimulationParams } from '@/types/simulation'
import type { ModelId } from '@/types/models'

export const PARAM_INFO: Record<keyof SimulationParams, string> = {
  holdingsBtc:
    'How many bitcoins you hold today. Used as the starting balance for the simulation — it assumes you keep all of them until withdrawals begin.',
  retirementStartYear:
    'The year you plan to stop working and start withdrawing. The simulation runs from this year through your expected lifespan.',
  currentAge:
    'Your age today. Used to work out how many years remain before retirement starts.',
  lifespan:
    'The age the simulation assumes you live to. A higher age means your savings must last longer.',
  minimumSpendUsd:
    'The yearly amount you must spend no matter what — your non-negotiable floor. If the simulation cannot sustain this, it counts as a failure.',
  annualSpendUsd:
    'The yearly amount you would like to spend. Simulations that keep up with this are more comfortable, but succeed less often.',
  inflationRate:
    'Assumed yearly rise in your spending due to inflation. Higher inflation makes future withdrawals more expensive. Only applies to amount-based withdrawals, not %-of-current strategies.',
}

export const MODEL_INFO: Record<ModelId, string> = {
  'power-law':
    "Fits a straight line to bitcoin's historic price on a log-log chart and extends it into the future with confidence bands. Assumes bitcoin keeps following its long-term power-law growth trend.",
  s2f: "Relates price to scarcity: total supply divided by newly minted coins each year. Projects forward using Bitcoin's halving schedule and assumes the historic price-vs-scarcity relationship persists.",
  bitcoin24:
    "MicroStrategy's Bitcoin24 model. Fits an exponential trend — a constant compound annual growth rate — to all of bitcoin's history. The simplest long-term projection: a pure extrapolation, not a prediction.",
}

export const POWER_LAW_INFO = {
  formulation:
    'How the line is fitted. Log-log fit fits a straight line to log(price) vs log(time); power fit fits the raw power curve. Custom lets you enter your own exponent (a) and intercept (b).',
  customA:
    'The power-law exponent — how fast price grows over time. The fitted default is roughly 5.8.',
  customB:
    'The intercept term, which shifts the fitted line up or down. The fitted default is roughly -17.3.',
  confidenceBand:
    'How wide the band around the median line is. ±1σ shows one standard deviation around the fit; the wider ±2σ band covers more of the estimated range. Custom percentiles let you pick your own band.',
  outerPercentiles:
    "The outer lower and upper percentiles of the band. P10/P90 means the band spans from the 10th to the 90th percentile of the model's estimated price range.",
  innerPercentiles:
    "The inner lower and upper percentiles of the band. P25/P75 means the band contains the middle 50% of the model's estimated price range.",
} as const

export const FIT_INFO = {
  rSquared: 'R² measures fit to past data only — it does not predict future accuracy.',
} as const

export const WITHDRAWAL_INFO = {
  anchorSection: 'How the annual withdrawal amount is calculated.',
  anchor:
    '% of initial fixes a share of your starting stack. % of current tracks your stack\'s value each year, so the amount floats with price. Fixed USD is a constant dollar amount that never changes.',
  withdrawalRate:
    'The percentage of your bitcoin withdrawn each year. Higher rates spend more today but shorten how long the stack lasts.',
  annualSpend:
    'The fixed dollar amount withdrawn every year, regardless of what bitcoin does.',
  payoutFrequency:
    'How often withdrawals happen. More frequent payouts average out price swings.',
  reviewCadence:
    'How often the strategy re-checks its rules and adjusts the withdrawal amount.',
  guardrails:
    'A withdrawal rule that keeps spending steady: it cuts when the portfolio runs hot and raises when it runs low.',
  ceilingThreshold:
    "The portfolio level considered too high. Once crossed, next year's withdrawal is cut by the adjustment size.",
  floorThreshold:
    "The portfolio level considered too low. Once crossed, next year's withdrawal is raised by the adjustment size.",
  adjustmentSize:
    'How much the withdrawal changes, in percentage points, when a guardrail is crossed.',
  prosperityRule:
    "After a cut, spending can only grow again once the portfolio recovers past a prosperity threshold — so cuts aren't undone during a bubble.",
  cashBuffer:
    'A stash of cash worth several years of spending, so you can pause selling bitcoin during bear markets.',
  bufferTarget:
    'How many years of spending to keep in cash. Bigger buffers smooth bear markets but sit uninvested.',
  valuationBased:
    'Sells more or less depending on where the price sits within the power law band — selling less in bear phases, more in euphoria.',
  indicator:
    "The signal that judges whether price is low or high. Power Law quantile places today's price within the model's historic range.",
  fairPhaseLow:
    'The quantile below which price counts as the bear phase — the model treats it as undervalued.',
  fairPhaseHigh:
    'The quantile above which price counts as the euphoria phase — the model treats it as overheated.',
  bearSurplus:
    'Extra percentage of the withdrawal sold on top of the baseline while price is in the bear phase.',
  fairSurplus: 'Extra percentage sold while price is in the fair phase.',
  euphoriaSurplus:
    'Extra percentage sold while price is in the euphoria phase — selling more when prices are high.',
  bufferTargetLow:
    'The minimum years of cash the strategy keeps as it builds the buffer.',
  bufferTargetHigh:
    'The maximum years of cash the strategy accumulates before it stops topping up.',
  safetyValve:
    'The power-law quantile above which the strategy may top up the cash buffer outside euphoria. If cash is below one year of spending and price sits above this level, a year of cash is refilled immediately.',
  bufferOnboarding:
    'When the cash buffer starts filling. Deferred waits for the first euphoria phase; immediate starts building right away.',
} as const

export const RESULTS_INFO = {
  monteCarlo:
    "10,000 randomized price futures sampled around your model's bands, each run through your withdrawal policy. The summary splits them into three outcomes and shows how often spending stayed at your desired level. These are probabilities, not predictions.",
  runOut:
    'The share of futures where the stack hit zero before your lifespan — you could no longer sell anything to cover spending.',
  belowMin:
    "The share of futures where you never ran out, but at least once had to spend below your minimum floor.",
  success:
    'The share of futures where you never ran out of money and never had to spend below your minimum.',
  desiredSpend:
    'Across the successful futures only: the share of retirement years where spending reached your desired level (adjusted for inflation).',
  pricePaths:
    "Each tile follows your retirement at a different percentile of the model's price range — P10 is pessimistic, P90 optimistic. 'Depleted' means the stack ran out before your lifespan. The suffix shows the phase of the final year.",
  phase:
    "Where the year's price sits in the model's band: bear (below fair phase low), fair (inside the band), or euphoria (above fair phase high). Phases reflect the model's view, not market advice.",
  forensics:
    "A deeper look at the failed futures: when they break, why, and how far below your minimum they fall. It complements the summary — the odds above, the timing and severity here.",
  survival:
    "The share of futures still alive each year. It starts at 100% and drops as futures fail; the final value equals the success rate. Steeper drops mean failures cluster early.",
  failureYear:
    "How many futures fail each year, split by cause. 'Ran out' futures fail in the first year they had nothing left to sell; 'Below minimum' futures fail in the first year spending dropped below your floor.",
  medianFailureYear:
    'The middle failure year across all failed futures. Half of the failed futures break down before this year, half after. A later year means failures cluster late in retirement.',
  shortfall:
    'How far spending fell below your minimum floor in the worst year of each failed future. The median is the typical worst gap; the p90 is the harsh tail — 10% of failed futures fall short by at least this much.',
  finalBtc:
    'The bitcoin left at the end of retirement, across the 10,000 futures. p10 is the pessimistic tail, p50 the typical outcome, p90 the optimistic tail. The success-path median shows the typical bequest among futures that never failed.',
  phaseTime:
    'The share of simulated years spent in each market phase, approximated from each year\'s final month. Reflects the model\'s phase view of your sampled futures, not a market forecast.',
} as const

export const VISUALIZATION_INFO = {
  fanChartBands:
    'The shaded fan shows the spread of the 10,000 simulated futures year by year. The wide outer band spans the 10th to the 90th percentile; the darker inner band the 25th to the 75th. The solid line is the median. Wider bands mean more uncertainty about that year.',
  metricBtc:
    'The typical bitcoin holdings left in each retirement year, with the P10–P90 and P25–P75 bands around it. Flat or falling bands show futures where the stack shrank faster.',
  metricSpend:
    'The annual spending each year across all futures, adjusted for inflation, with the P10–P90 and P25–P75 bands around the median. Drops mean futures where spending had to be cut.',
  metricBuffer:
    'How many years of spending the cash buffer covers each year, with the P10–P90 and P25–P75 bands around the median. A healthy buffer smooths bear markets without selling bitcoin.',
  colMedianBtc:
    'The typical (median) bitcoin holdings for each retirement year across all simulated futures.',
  colBtcRange:
    'The middle 80% range of bitcoin holdings for each year — from the 10th to the 90th percentile of the futures.',
  colMedianSpend:
    'The typical annual spending in each retirement year across all futures, adjusted for inflation.',
  colMedianBuffer:
    'The typical number of years of spending held in the cash buffer in each retirement year.',
  colSurvival:
    'The share of futures still alive in each year — not run out of money and never forced below minimum spending. It starts at 100% and declines as futures fail.',
} as const
