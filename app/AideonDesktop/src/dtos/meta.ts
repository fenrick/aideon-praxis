export type MetaAttributeKind =
  | 'string'
  | 'text'
  | 'number'
  | 'datetime'
  | 'enum'
  | 'boolean'
  | 'blob';

export interface MetaModelAttribute {
  name: string;
  type: MetaAttributeKind;
  required?: boolean;
  enum?: string[];
}

export interface MetaModelType {
  id: string;
  label?: string;
  category?: string;
  extends?: string;
  attributes?: MetaModelAttribute[];
  effectTypes?: string[];
}

export interface MetaModelMultiplicity {
  from?: string;
  to?: string;
}

export interface MetaModelRelationship {
  id: string;
  label?: string;
  from: string[];
  to: string[];
  directed?: boolean;
  multiplicity?: MetaModelMultiplicity;
  attributes?: MetaModelAttribute[];
}

export interface MetaRelationshipRule {
  allowSelf?: boolean;
  allowDuplicate?: boolean;
}

export interface MetaValidationRules {
  attributes?: {
    string?: { maxLength?: number };
    text?: { maxLength?: number };
    enum?: { caseSensitive?: boolean };
  };
  relationships?: Record<string, MetaRelationshipRule>;
}

export interface MetaModelDocument {
  version: string;
  description?: string;
  types: MetaModelType[];
  relationships: MetaModelRelationship[];
  validation?: MetaValidationRules;
}
