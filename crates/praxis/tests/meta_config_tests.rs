use super::{MetaModelConfig, MetaModelSource};

#[test]
fn default_uses_embedded_core() {
    let config = MetaModelConfig::default();
    matches!(config.base, MetaModelSource::EmbeddedCore);
    assert!(config.overrides.is_empty());
}

#[test]
fn builder_methods_update_config() {
    let config = MetaModelConfig::default()
        .with_base(MetaModelSource::Inline("{}".into()))
        .add_override(MetaModelSource::Inline("{\"types\":[]}".into()));
    assert!(matches!(config.base, MetaModelSource::Inline(_)));
    assert_eq!(config.overrides.len(), 1);
}
