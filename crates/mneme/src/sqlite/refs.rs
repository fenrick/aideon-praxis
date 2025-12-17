//! SeaORM Entity for the `refs` table.

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, DeriveEntityModel)]
#[sea_orm(table_name = "refs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub branch: String,
    pub commit_id: Option<String>,
    pub updated_at_ms: i64,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        panic!("No relations")
    }
}

impl ActiveModelBehavior for ActiveModel {}
