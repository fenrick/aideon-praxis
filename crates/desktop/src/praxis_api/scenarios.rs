#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioSummary {
    pub id: String,
    pub name: String,
    pub branch: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_default: Option<bool>,
}

impl ScenarioSummary {
    pub(crate) fn demo_list() -> Vec<Self> {
        vec![
            ScenarioSummary {
                id: "scenario-main".into(),
                name: "Mainline FY25".into(),
                branch: "main".into(),
                description: Some("Authoritative branch".into()),
                updated_at: now_iso(),
                is_default: Some(true),
            },
            ScenarioSummary {
                id: "scenario-chrona".into(),
                name: "Chrona Playground".into(),
                branch: "chronaplay".into(),
                description: Some("Prototype overlays".into()),
                updated_at: now_iso(),
                is_default: None,
            },
        ]
    }
}

