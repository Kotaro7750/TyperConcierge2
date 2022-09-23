use serde::{Deserialize, Serialize};
use typing_engine::{TypingResultStatistics, TypingResultStatisticsTarget};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TypingResult {
    total_time_ms: usize,
    key_stroke: TypingResultTarget,
    ideal_key_stroke: TypingResultTarget,
}

impl From<TypingResultStatistics> for TypingResult {
    fn from(t: TypingResultStatistics) -> Self {
        Self {
            total_time_ms: t.total_time().as_millis().try_into().unwrap(),
            key_stroke: t.key_stroke().clone().into(),
            ideal_key_stroke: t.ideal_key_stroke().clone().into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TypingResultTarget {
    whole_count: usize,
    completely_correct_count: usize,
    missed_count: usize,
}

impl From<TypingResultStatisticsTarget> for TypingResultTarget {
    fn from(t: TypingResultStatisticsTarget) -> Self {
        Self {
            whole_count: t.whole_count(),
            completely_correct_count: t.completely_correct_count(),
            missed_count: t.missed_count(),
        }
    }
}
