use serde::{Deserialize, Serialize};
use typing_engine::{
    display_info::{KeyStrokeDisplayInfo, ViewDisplayInfo},
    DisplayInfo,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DisplayInformation {
    view: ViewDisplayInformation,
    key_stroke: KeyStrokeDisplayInformation,
}

impl From<DisplayInfo> for DisplayInformation {
    fn from(di: DisplayInfo) -> Self {
        Self {
            view: di.view_info().into(),
            key_stroke: di.key_stroke_info().into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ViewDisplayInformation {
    view: String,
    current_cursor_positions: Vec<usize>,
    missed_positions: Vec<usize>,
    last_position: usize,
}

impl From<&ViewDisplayInfo> for ViewDisplayInformation {
    fn from(vdi: &ViewDisplayInfo) -> Self {
        Self {
            view: vdi.view().to_string(),
            current_cursor_positions: vdi.current_cursor_positions().clone(),
            missed_positions: vdi.missed_positions().clone(),
            last_position: vdi.last_position(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct KeyStrokeDisplayInformation {
    key_stroke: String,
    current_cursor_position: usize,
    missed_positions: Vec<usize>,
    progress: f64,
    lap_end_positions: Vec<usize>,
    lap_end_time: Vec<f64>,
}

impl From<&KeyStrokeDisplayInfo> for KeyStrokeDisplayInformation {
    fn from(ksdi: &KeyStrokeDisplayInfo) -> Self {
        let on_typing_statistics = ksdi.on_typing_statistics();
        let on_typing_statistics_ideal = ksdi.on_typing_statistics_ideal();

        Self {
            key_stroke: ksdi.key_stroke().to_string(),
            current_cursor_position: ksdi.current_cursor_position(),
            missed_positions: ksdi.missed_positions().clone(),
            progress: on_typing_statistics_ideal.finished_count() as f64
                / on_typing_statistics_ideal.whole_count() as f64,
            lap_end_positions: on_typing_statistics.lap_end_positions().clone(),
            lap_end_time: on_typing_statistics_ideal
                .lap_end_time()
                .unwrap()
                .iter()
                .map(|d| d.as_millis() as f64)
                .collect(),
        }
    }
}
