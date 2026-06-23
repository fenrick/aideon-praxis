#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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
    pub(crate) fn from_branch(branch: String, updated_at: Option<String>) -> Self {
        let is_default = branch == "main";
        let name = if is_default {
            "Mainline".into()
        } else {
            branch.replace('-', " ")
        };
        ScenarioSummary {
            id: format!("scenario-{branch}"),
            name,
            branch,
            description: None,
            updated_at: updated_at.unwrap_or_else(now_iso),
            is_default: if is_default { Some(true) } else { None },
        }
    }
}
