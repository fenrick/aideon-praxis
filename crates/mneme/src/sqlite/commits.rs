//! SeaORM Entity for the `commits` table.

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, DeriveEntityModel)]
#[sea_orm(table_name = "commits")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub commit_id: String,
    pub branch: String,
    pub parents_json: String,
    pub author: Option<String>,
    pub time: Option<String>,
    pub message: String,
    pub tags_json: String,
    pub change_count: i64,
    pub summary_json: String,
    pub changes_json: String,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        panic!("No relations")
    }
}

impl ActiveModelBehavior for ActiveModel {}
