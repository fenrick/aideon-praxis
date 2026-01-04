#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PraxisOperation {
    CreateNode { node: TwinNode },
    UpdateNode { node: TwinNode },
    DeleteNode { node_id: String },
    CreateEdge { edge: TwinEdge },
    DeleteEdge { edge_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationBatchResult {
    pub accepted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_id: Option<String>,
}

impl OperationBatchResult {
    fn accepted(commit_id: String) -> Self {
        Self {
            accepted: true,
            message: Some("mock commit created".into()),
            commit_id: Some(commit_id),
        }
    }

    fn rejected(message: &str) -> Self {
        Self {
            accepted: false,
            message: Some(message.into()),
            commit_id: None,
        }
    }
}
