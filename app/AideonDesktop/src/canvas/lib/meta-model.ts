export interface MetaModelSchema {
  version: string;
  description?: string;
  types: MetaModelType[];
  relationships: MetaModelRelationship[];
}

export interface MetaModelType {
  id: string;
  label?: string;
  category?: string;
  extends?: string;
  attributes?: MetaModelAttribute[];
}

export interface MetaModelRelationship {
  id: string;
  label?: string;
  directed?: boolean;
  from: string[];
  to: string[];
  attributes?: MetaModelAttribute[];
}

export interface MetaModelAttribute {
  name: string;
  type: string;
  required?: boolean;
  enum?: string[];
}

export async function fetchMetaModel(): Promise<MetaModelSchema> {
  await new Promise((resolve) => {
    setTimeout(resolve, 150);
  });
  return SAMPLE_SCHEMA;
}

const SAMPLE_SCHEMA: MetaModelSchema = {
  version: '2025.4',
  description: 'Baseline schema for the Chrona digital twin.',
  types: [
    {
      id: 'Capability',
      label: 'Business Capability',
      category: 'Business',
      attributes: [
        { name: 'criticality', type: 'string', enum: ['low', 'medium', 'high'] },
        { name: 'owner', type: 'string', required: true },
      ],
    },
    {
      id: 'Application',
      label: 'Application Service',
      category: 'Technology',
      extends: 'Service',
      attributes: [
        { name: 'lifecycle', type: 'string', enum: ['plan', 'live', 'retire'] },
        { name: 'platform', type: 'string' },
      ],
    },
  ],
  relationships: [
    {
      id: 'supports',
      label: 'Supports',
      directed: true,
      from: ['Application'],
      to: ['Capability'],
      attributes: [{ name: 'confidence', type: 'number' }],
    },
    {
      id: 'depends_on',
      directed: true,
      from: ['Capability'],
      to: ['Capability'],
    },
  ],
};
