use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Anchor {
    PercentOfInitial,
    PercentOfCurrent,
    FixedUsd,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Payout {
    Monthly,
    Quarterly,
    Yearly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Review {
    Once,
    Yearly,
    Monthly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Indicator {
    PowerLawQuantile,
    MayerMultiple,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Onboarding {
    Immediate,
    DeferredToEuphoria,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PresetId {
    ClassicFire,
    FixedPct,
    Guardrails,
    ValuationBased,
    Custom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Bear,
    Fair,
    Euphoria,
}

pub const RATE_PCT_MIN: f64 = 0.0;
pub const RATE_PCT_MAX: f64 = 20.0;
pub const RATE_PCT_DEFAULT: f64 = 4.0;

pub const SPEND_USD_MIN: f64 = 0.0;
pub const SPEND_USD_MAX: f64 = 10_000_000.0;
pub const SPEND_USD_DEFAULT: f64 = 50_000.0;

pub const GUARDRAIL_THRESHOLD_MIN: f64 = 0.0;
pub const GUARDRAIL_THRESHOLD_MAX: f64 = 100.0;
pub const CEILING_PCT_DEFAULT: f64 = 20.0;
pub const FLOOR_PCT_DEFAULT: f64 = 20.0;

pub const ADJUST_PCT_MIN: f64 = 1.0;
pub const ADJUST_PCT_MAX: f64 = 50.0;
pub const ADJUST_PCT_DEFAULT: f64 = 10.0;

pub const BUFFER_YEARS_MIN: f64 = 0.0;
pub const BUFFER_YEARS_MAX: f64 = 10.0;
pub const BUFFER_YEARS_DEFAULT: f64 = 3.0;

pub const SURPLUS_PCT_MIN: f64 = 0.0;
pub const SURPLUS_PCT_MAX: f64 = 100.0;
pub const EUPHORIA_SURPLUS_PCT_DEFAULT: f64 = 8.0;

pub const FAIR_LOW_MIN: f64 = 0.0;
pub const FAIR_LOW_MAX: f64 = 100.0;
pub const FAIR_LOW_DEFAULT: f64 = 50.0;

pub const FAIR_HIGH_MIN: f64 = 0.0;
pub const FAIR_HIGH_MAX: f64 = 100.0;
pub const FAIR_HIGH_DEFAULT: f64 = 85.0;

pub const BUFFER_TARGET_LOW_MIN: f64 = 0.0;
pub const BUFFER_TARGET_LOW_MAX: f64 = 10.0;
pub const BUFFER_TARGET_LOW_DEFAULT: f64 = 2.0;

pub const BUFFER_TARGET_HIGH_MIN: f64 = 0.0;
pub const BUFFER_TARGET_HIGH_MAX: f64 = 10.0;
pub const BUFFER_TARGET_HIGH_DEFAULT: f64 = 4.0;

pub const SAFETY_VALVE_MIN: f64 = 0.0;
pub const SAFETY_VALVE_MAX: f64 = 100.0;
pub const SAFETY_VALVE_DEFAULT: f64 = 50.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Guardrails {
    pub enabled: bool,
    pub ceiling_pct: f64,
    pub floor_pct: f64,
    pub adjust_pct: f64,
    pub prosperity: bool,
}

impl Default for Guardrails {
    fn default() -> Self {
        Guardrails {
            enabled: false,
            ceiling_pct: CEILING_PCT_DEFAULT,
            floor_pct: FLOOR_PCT_DEFAULT,
            adjust_pct: ADJUST_PCT_DEFAULT,
            prosperity: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Buffer {
    pub enabled: bool,
    pub years: f64,
}

impl Default for Buffer {
    fn default() -> Self {
        Buffer {
            enabled: false,
            years: BUFFER_YEARS_DEFAULT,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Valuation {
    pub enabled: bool,
    pub indicator: Indicator,
    pub fair_low: f64,
    pub fair_high: f64,
    pub bear_surplus_pct: f64,
    pub fair_surplus_pct: f64,
    pub euphoria_surplus_pct: f64,
    pub buffer_target_low_years: f64,
    pub buffer_target_high_years: f64,
    pub safety_valve: f64,
    pub onboarding: Onboarding,
}

impl Default for Valuation {
    fn default() -> Self {
        Valuation {
            enabled: false,
            indicator: Indicator::PowerLawQuantile,
            fair_low: FAIR_LOW_DEFAULT,
            fair_high: FAIR_HIGH_DEFAULT,
            bear_surplus_pct: 0.0,
            fair_surplus_pct: 0.0,
            euphoria_surplus_pct: EUPHORIA_SURPLUS_PCT_DEFAULT,
            buffer_target_low_years: BUFFER_TARGET_LOW_DEFAULT,
            buffer_target_high_years: BUFFER_TARGET_HIGH_DEFAULT,
            safety_valve: SAFETY_VALVE_DEFAULT,
            onboarding: Onboarding::DeferredToEuphoria,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WithdrawalPolicy {
    pub preset: PresetId,
    pub anchor: Anchor,
    pub rate_pct: f64,
    pub spend_usd: f64,
    pub payout: Payout,
    pub review: Review,
    pub guardrails: Guardrails,
    pub buffer: Buffer,
    pub valuation: Valuation,
}

fn clamp(v: f64, min: f64, max: f64) -> f64 {
    if !v.is_finite() {
        return min;
    }
    v.min(max).max(min)
}

impl WithdrawalPolicy {
    pub fn classic_fire() -> Self {
        WithdrawalPolicy {
            preset: PresetId::ClassicFire,
            anchor: Anchor::PercentOfInitial,
            rate_pct: RATE_PCT_DEFAULT,
            spend_usd: SPEND_USD_DEFAULT,
            payout: Payout::Yearly,
            review: Review::Once,
            guardrails: Guardrails::default(),
            buffer: Buffer::default(),
            valuation: Valuation::default(),
        }
    }

    pub fn fixed_pct() -> Self {
        WithdrawalPolicy {
            preset: PresetId::FixedPct,
            anchor: Anchor::PercentOfCurrent,
            rate_pct: RATE_PCT_DEFAULT,
            spend_usd: SPEND_USD_DEFAULT,
            payout: Payout::Yearly,
            review: Review::Yearly,
            guardrails: Guardrails::default(),
            buffer: Buffer::default(),
            valuation: Valuation::default(),
        }
    }

    pub fn guardrails() -> Self {
        WithdrawalPolicy {
            preset: PresetId::Guardrails,
            anchor: Anchor::PercentOfInitial,
            rate_pct: RATE_PCT_DEFAULT,
            spend_usd: SPEND_USD_DEFAULT,
            payout: Payout::Yearly,
            review: Review::Yearly,
            guardrails: Guardrails {
                enabled: true,
                ceiling_pct: CEILING_PCT_DEFAULT,
                floor_pct: FLOOR_PCT_DEFAULT,
                adjust_pct: ADJUST_PCT_DEFAULT,
                prosperity: true,
            },
            buffer: Buffer::default(),
            valuation: Valuation::default(),
        }
    }

    pub fn valuation_based() -> Self {
        WithdrawalPolicy {
            preset: PresetId::ValuationBased,
            anchor: Anchor::FixedUsd,
            rate_pct: RATE_PCT_DEFAULT,
            spend_usd: SPEND_USD_DEFAULT,
            payout: Payout::Monthly,
            review: Review::Monthly,
            guardrails: Guardrails::default(),
            buffer: Buffer {
                enabled: true,
                years: BUFFER_TARGET_HIGH_DEFAULT,
            },
            valuation: Valuation {
                enabled: true,
                indicator: Indicator::PowerLawQuantile,
                fair_low: FAIR_LOW_DEFAULT,
                fair_high: FAIR_HIGH_DEFAULT,
                bear_surplus_pct: 0.0,
                fair_surplus_pct: 0.0,
                euphoria_surplus_pct: EUPHORIA_SURPLUS_PCT_DEFAULT,
                buffer_target_low_years: BUFFER_TARGET_LOW_DEFAULT,
                buffer_target_high_years: BUFFER_TARGET_HIGH_DEFAULT,
                safety_valve: SAFETY_VALVE_DEFAULT,
                onboarding: Onboarding::DeferredToEuphoria,
            },
        }
    }

    pub fn custom() -> Self {
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.preset = PresetId::Custom;
        policy.review = Review::Yearly;
        policy
    }

    pub fn for_preset(preset: PresetId) -> Self {
        match preset {
            PresetId::ClassicFire => WithdrawalPolicy::classic_fire(),
            PresetId::FixedPct => WithdrawalPolicy::fixed_pct(),
            PresetId::Guardrails => WithdrawalPolicy::guardrails(),
            PresetId::ValuationBased => WithdrawalPolicy::valuation_based(),
            PresetId::Custom => WithdrawalPolicy::custom(),
        }
    }

    pub fn clamp(&mut self) {
        self.rate_pct = clamp(self.rate_pct, RATE_PCT_MIN, RATE_PCT_MAX);
        self.spend_usd = clamp(self.spend_usd, SPEND_USD_MIN, SPEND_USD_MAX);
        self.guardrails.ceiling_pct = clamp(
            self.guardrails.ceiling_pct,
            GUARDRAIL_THRESHOLD_MIN,
            GUARDRAIL_THRESHOLD_MAX,
        );
        self.guardrails.floor_pct = clamp(
            self.guardrails.floor_pct,
            GUARDRAIL_THRESHOLD_MIN,
            GUARDRAIL_THRESHOLD_MAX,
        );
        self.guardrails.adjust_pct = clamp(
            self.guardrails.adjust_pct,
            ADJUST_PCT_MIN,
            ADJUST_PCT_MAX,
        );
        self.buffer.years = clamp(self.buffer.years, BUFFER_YEARS_MIN, BUFFER_YEARS_MAX);
        self.valuation.fair_low = clamp(self.valuation.fair_low, FAIR_LOW_MIN, FAIR_LOW_MAX);
        self.valuation.fair_high = clamp(self.valuation.fair_high, FAIR_HIGH_MIN, FAIR_HIGH_MAX);
        self.valuation.bear_surplus_pct = clamp(
            self.valuation.bear_surplus_pct,
            SURPLUS_PCT_MIN,
            SURPLUS_PCT_MAX,
        );
        self.valuation.fair_surplus_pct = clamp(
            self.valuation.fair_surplus_pct,
            SURPLUS_PCT_MIN,
            SURPLUS_PCT_MAX,
        );
        self.valuation.euphoria_surplus_pct = clamp(
            self.valuation.euphoria_surplus_pct,
            SURPLUS_PCT_MIN,
            SURPLUS_PCT_MAX,
        );
        self.valuation.buffer_target_low_years = clamp(
            self.valuation.buffer_target_low_years,
            BUFFER_TARGET_LOW_MIN,
            BUFFER_TARGET_LOW_MAX,
        );
        self.valuation.buffer_target_high_years = clamp(
            self.valuation.buffer_target_high_years,
            BUFFER_TARGET_HIGH_MIN,
            BUFFER_TARGET_HIGH_MAX,
        );
        self.valuation.safety_valve = clamp(
            self.valuation.safety_valve,
            SAFETY_VALVE_MIN,
            SAFETY_VALVE_MAX,
        );
    }

    pub fn clamped(mut self) -> Self {
        self.clamp();
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classic_fire_defaults() {
        let p = WithdrawalPolicy::classic_fire();
        assert_eq!(p.preset, PresetId::ClassicFire);
        assert_eq!(p.anchor, Anchor::PercentOfInitial);
        assert!((p.rate_pct - 4.0).abs() < f64::EPSILON);
        assert_eq!(p.payout, Payout::Yearly);
        assert_eq!(p.review, Review::Once);
        assert!(!p.guardrails.enabled);
        assert!(!p.buffer.enabled);
        assert!(!p.valuation.enabled);
    }

    #[test]
    fn fixed_pct_defaults() {
        let p = WithdrawalPolicy::fixed_pct();
        assert_eq!(p.preset, PresetId::FixedPct);
        assert_eq!(p.anchor, Anchor::PercentOfCurrent);
        assert!((p.rate_pct - 4.0).abs() < f64::EPSILON);
        assert_eq!(p.review, Review::Yearly);
        assert!(!p.guardrails.enabled);
    }

    #[test]
    fn guardrails_defaults() {
        let p = WithdrawalPolicy::guardrails();
        assert_eq!(p.preset, PresetId::Guardrails);
        assert_eq!(p.anchor, Anchor::PercentOfInitial);
        assert_eq!(p.review, Review::Yearly);
        assert!(p.guardrails.enabled);
        assert!((p.guardrails.ceiling_pct - 20.0).abs() < f64::EPSILON);
        assert!((p.guardrails.floor_pct - 20.0).abs() < f64::EPSILON);
        assert!((p.guardrails.adjust_pct - 10.0).abs() < f64::EPSILON);
        assert!(p.guardrails.prosperity);
        assert!(!p.buffer.enabled);
        assert!(!p.valuation.enabled);
    }

    #[test]
    fn valuation_based_defaults() {
        let p = WithdrawalPolicy::valuation_based();
        assert_eq!(p.preset, PresetId::ValuationBased);
        assert_eq!(p.anchor, Anchor::FixedUsd);
        assert_eq!(p.payout, Payout::Monthly);
        assert_eq!(p.review, Review::Monthly);
        assert!(!p.guardrails.enabled);
        assert!(p.buffer.enabled);
        assert!(p.valuation.enabled);
        assert_eq!(p.valuation.indicator, Indicator::PowerLawQuantile);
        assert!((p.valuation.fair_low - 50.0).abs() < f64::EPSILON);
        assert!((p.valuation.fair_high - 85.0).abs() < f64::EPSILON);
        assert!((p.valuation.euphoria_surplus_pct - 8.0).abs() < f64::EPSILON);
        assert!((p.valuation.buffer_target_low_years - 2.0).abs() < f64::EPSILON);
        assert!((p.valuation.buffer_target_high_years - 4.0).abs() < f64::EPSILON);
        assert!((p.valuation.safety_valve - 50.0).abs() < f64::EPSILON);
        assert_eq!(p.valuation.onboarding, Onboarding::DeferredToEuphoria);
    }

    #[test]
    fn custom_matches_classic_fire_except_identity() {
        let custom = WithdrawalPolicy::custom();
        let classic = WithdrawalPolicy::classic_fire();
        assert_eq!(custom.preset, PresetId::Custom);
        assert_eq!(custom.anchor, classic.anchor);
        assert_eq!(custom.rate_pct, classic.rate_pct);
        assert_eq!(custom.payout, classic.payout);
        assert_eq!(custom.review, Review::Yearly);
    }

    #[test]
    fn clamp_bounds_rate_and_thresholds() {
        let mut p = WithdrawalPolicy::guardrails();
        p.rate_pct = 999.0;
        p.guardrails.ceiling_pct = 500.0;
        p.guardrails.floor_pct = -10.0;
        p.guardrails.adjust_pct = 0.5;
        p.buffer.years = 99.0;
        p.valuation.euphoria_surplus_pct = -3.0;
        p.clamp();
        assert!((p.rate_pct - RATE_PCT_MAX).abs() < f64::EPSILON);
        assert!((p.guardrails.ceiling_pct - GUARDRAIL_THRESHOLD_MAX).abs() < f64::EPSILON);
        assert!((p.guardrails.floor_pct - GUARDRAIL_THRESHOLD_MIN).abs() < f64::EPSILON);
        assert!((p.guardrails.adjust_pct - ADJUST_PCT_MIN).abs() < f64::EPSILON);
        assert!((p.buffer.years - BUFFER_YEARS_MAX).abs() < f64::EPSILON);
        assert!((p.valuation.euphoria_surplus_pct - SURPLUS_PCT_MIN).abs() < f64::EPSILON);
    }

    #[test]
    fn clamp_handles_non_finite_values() {
        let mut p = WithdrawalPolicy::classic_fire();
        p.rate_pct = f64::NAN;
        p.spend_usd = f64::INFINITY;
        p.clamp();
        assert!((p.rate_pct - RATE_PCT_MIN).abs() < f64::EPSILON);
        assert!((p.spend_usd - SPEND_USD_MIN).abs() < f64::EPSILON);
    }

    #[test]
    fn serde_roundtrip_preserves_every_preset() {
        let presets = [
            WithdrawalPolicy::classic_fire(),
            WithdrawalPolicy::fixed_pct(),
            WithdrawalPolicy::guardrails(),
            WithdrawalPolicy::valuation_based(),
            WithdrawalPolicy::custom(),
        ];
        for p in presets {
            let json = serde_json::to_string(&p).unwrap();
            let restored: WithdrawalPolicy = serde_json::from_str(&json).unwrap();
            assert_eq!(restored.preset, p.preset);
            assert_eq!(restored.anchor, p.anchor);
            assert!((restored.rate_pct - p.rate_pct).abs() < f64::EPSILON);
            assert!((restored.spend_usd - p.spend_usd).abs() < f64::EPSILON);
            assert_eq!(restored.payout, p.payout);
            assert_eq!(restored.review, p.review);
            assert_eq!(restored.guardrails.enabled, p.guardrails.enabled);
            assert!((restored.guardrails.ceiling_pct - p.guardrails.ceiling_pct).abs() < f64::EPSILON);
            assert!((restored.guardrails.floor_pct - p.guardrails.floor_pct).abs() < f64::EPSILON);
            assert!((restored.guardrails.adjust_pct - p.guardrails.adjust_pct).abs() < f64::EPSILON);
            assert_eq!(restored.guardrails.prosperity, p.guardrails.prosperity);
            assert_eq!(restored.buffer.enabled, p.buffer.enabled);
            assert!((restored.buffer.years - p.buffer.years).abs() < f64::EPSILON);
            assert_eq!(restored.valuation.enabled, p.valuation.enabled);
            assert_eq!(restored.valuation.indicator, p.valuation.indicator);
            assert!((restored.valuation.fair_low - p.valuation.fair_low).abs() < f64::EPSILON);
            assert!((restored.valuation.fair_high - p.valuation.fair_high).abs() < f64::EPSILON);
            assert!((restored.valuation.bear_surplus_pct - p.valuation.bear_surplus_pct).abs() < f64::EPSILON);
            assert!((restored.valuation.fair_surplus_pct - p.valuation.fair_surplus_pct).abs() < f64::EPSILON);
            assert!((restored.valuation.euphoria_surplus_pct - p.valuation.euphoria_surplus_pct).abs() < f64::EPSILON);
            assert!((restored.valuation.buffer_target_low_years - p.valuation.buffer_target_low_years).abs() < f64::EPSILON);
            assert!((restored.valuation.buffer_target_high_years - p.valuation.buffer_target_high_years).abs() < f64::EPSILON);
            assert!((restored.valuation.safety_valve - p.valuation.safety_valve).abs() < f64::EPSILON);
            assert_eq!(restored.valuation.onboarding, p.valuation.onboarding);
        }
    }
}
