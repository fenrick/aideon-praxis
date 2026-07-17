import type { LayoutPreset } from 'praxis/layouts';
import type { ScenarioSummary } from 'praxis/praxis-api';
import { invokeIpc } from '../../adapters/ipc';
import { toErrorMessage } from './lib/errors';

interface ProjectPayload {
  readonly id?: string;
  readonly name?: string;
  readonly scenarios?: ScenarioSummary[];
}

interface TemplatePayload extends Partial<LayoutPreset> {
  readonly id?: string;
  readonly name?: string;
  readonly documentId?: string;
  readonly description?: string;
  readonly widgets?: LayoutPreset['widgets'];
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly scenarios: ScenarioSummary[];
}

const COMMANDS = {
  listProjects: 'workspace_projects_list',
  listTemplates: 'workspace_templates_list',
  saveTemplate: 'workspace_templates_save',
} as const;

export const PRAXIS_DOMAIN_IPC_COMMANDS = COMMANDS;

/**
 * Fetch projects (with scenarios) from the host.
 */
export async function listProjectsWithScenarios(): Promise<ProjectSummary[]> {
  try {
    const payload = await invokeIpc<ProjectPayload[]>(COMMANDS.listProjects, {});
    const projects = Array.isArray(payload) ? payload.map((entry) => normaliseProject(entry)) : [];
    if (projects.length === 0) {
      throw new Error('Host returned no projects.');
    }
    return projects;
  } catch (error) {
    const message = toErrorMessage(error);
    throw new Error(`Host command '${COMMANDS.listProjects}' failed: ${message}`, { cause: error });
  }
}

/**
 * Load template definitions from the host.
 */
export async function listLayoutsFromHost(): Promise<LayoutPreset[]> {
  try {
    const payload = await invokeIpc<TemplatePayload[]>(COMMANDS.listTemplates, {});
    const templates = Array.isArray(payload)
      ? payload.map((template) => normaliseTemplate(template))
      : [];
    if (templates.length === 0) {
      throw new Error('Host returned no templates.');
    }
    return templates;
  } catch (error) {
    const message = toErrorMessage(error);
    throw new Error(`Host command '${COMMANDS.listTemplates}' failed: ${message}`, {
      cause: error,
    });
  }
}

/**
 * Persist a template snapshot to the host when running inside Tauri.
 * @param template
 */
export async function saveLayoutToHost(template: LayoutPreset): Promise<LayoutPreset> {
  try {
    const payload = await invokeIpc<TemplatePayload>(COMMANDS.saveTemplate, {
      id: template.id,
      documentId: template.documentId,
      name: template.name,
      description: template.description,
      widgets: template.widgets,
    });
    return normaliseTemplate(payload);
  } catch (error) {
    const message = toErrorMessage(error);
    throw new Error(`Host command '${COMMANDS.saveTemplate}' failed: ${message}`, { cause: error });
  }
}

/**
 *
 * @param payload
 */
function normaliseProject(payload: ProjectPayload): ProjectSummary {
  const id = requireString(payload.id, 'project id');
  const name = requireString(payload.name, 'project name').trim();
  if (!Array.isArray(payload.scenarios)) {
    throw new TypeError('Project scenarios missing.');
  }
  return {
    id,
    name,
    scenarios: payload.scenarios,
  };
}

/**
 *
 * @param payload
 */
function normaliseTemplate(payload: TemplatePayload): LayoutPreset {
  const id = requireString(payload.id, 'template id');
  const documentId = requireString(payload.documentId, 'template documentId');
  const name = requireString(payload.name, 'template name').trim();
  const description = typeof payload.description === 'string' ? payload.description : '';
  if (!Array.isArray(payload.widgets)) {
    throw new TypeError('Template widgets missing.');
  }
  return {
    id,
    documentId,
    name,
    description,
    widgets: payload.widgets,
  } satisfies LayoutPreset;
}

/**
 * Require a non-empty string; throw otherwise.
 * @param value
 * @param label
 */
function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`Missing ${label}.`);
  }
  return value;
}
