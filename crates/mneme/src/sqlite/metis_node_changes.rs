//! SeaORM entity for per-commit node change facts.

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, DeriveEntityModel)]
#[sea_orm(table_name = "metis_commit_nodes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub event_id: String,
    pub commit_id: String,
    pub node_id: String,
    pub operation: String,
    pub node_type: Option<String>,
    pub props_json: Option<String>,
    pub recorded_at_ms: i64,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        panic!("No relations")
    }
}

impl ActiveModelBehavior for ActiveModel {}
