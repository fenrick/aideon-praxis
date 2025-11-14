import { getWorkerHealth, type WorkerHealth } from './praxis-api';
import './styles.css';

const NAV_ITEMS = ['Overview', 'Workflows', 'Canvases', 'Catalogues'];

const root = document.querySelector('#root');
if (!root) {
  throw new Error('Missing root element');
}

root.append(buildShell());

function buildShell(): HTMLElement {
  const shell = createElement('div', 'app-shell');
  shell.append(buildSidebar());
  shell.append(buildMainArea());
  return shell;
}

function buildSidebar(): HTMLElement {
  const aside = createElement('aside', 'sidebar');
  const title = createElement('div', 'sidebar__title', 'Praxis Canvas');
  aside.append(title);

  const nav = createElement('div', 'sidebar__nav');
  for (const label of NAV_ITEMS) {
    const button = createElement('button', 'sidebar__button');
    button.type = 'button';
    const icon = createElement('span', 'icon-circle', label.charAt(0));
    button.append(icon, label);
    nav.append(button);
  }
  aside.append(nav);

  const footer = createElement('div', 'sidebar__footer');
  const footerButton = createButton('Settings', 'secondary');
  footer.append(footerButton);
  aside.append(footer);
  return aside;
}

function buildMainArea(): HTMLElement {
  const container = createElement('div', 'main-area');

  const header = createElement('header', 'main-area__header');
  const meta = createElement('div', 'header-metadata');
  meta.append(createElement('span', 'header-caption', 'Active template'));
  meta.append(createElement('span', 'header-title', 'Executive Overview'));
  header.append(meta);

  const headerActions = createElement('div');
  headerActions.style.display = 'flex';
  headerActions.style.gap = '12px';
  headerActions.append(createButton('Switch Scenario', 'secondary'), createButton('New Widget'));
  header.append(headerActions);
  container.append(header);

  const main = createElement('main', 'main-area__body');
  const grid = createElement('div', 'card-grid');
  grid.append(buildCanvasPlaceholder());
  grid.append(buildRightColumn());
  main.append(grid);
  container.append(main);
  return container;
}

function buildCanvasPlaceholder(): HTMLElement {
  const card = createElement('section', 'card');
  card.append(createElement('h2', 'card__title', 'Canvas runtime'));
  card.append(
    createElement('p', 'card__subtitle', 'React Flow placeholder — coming online in Phase 3.'),
  );
  card.append(createElement('div', 'canvas-placeholder', 'Node-based layouts mount here.'));
  return card;
}

function buildRightColumn(): HTMLElement {
  const stack = createElement('div', 'card-stack');
  stack.append(buildHealthCard());

  const phaseCard = createElement('section', 'card');
  phaseCard.append(createElement('h2', 'card__title', 'Phase checkpoints'));
  phaseCard.append(
    createElement('p', 'card__subtitle', 'Key milestones for the React canvas build.'),
  );
  const list = createElement('ol');
  list.style.paddingLeft = '20px';
  list.style.margin = '0';
  list.style.color = 'var(--color-muted)';
  for (const item of ['Bootstrap shell', 'Bind praxisApi IPC', 'Render React Flow widgets']) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }
  phaseCard.append(list);
  stack.append(phaseCard);
  return stack;
}

function buildHealthCard(): HTMLElement {
  const card = createElement('section', 'card');
  card.append(createElement('h2', 'card__title', 'Worker health'));
  card.append(createElement('p', 'card__subtitle', 'Rust engine status via Tauri IPC'));

  const pill = createElement('div', 'health-pill');
  card.append(pill);

  const errorLine = createElement('p');
  errorLine.style.marginTop = '12px';
  errorLine.style.color = '#dc2626';
  errorLine.style.display = 'none';
  card.append(errorLine);

  const actionRow = createElement('div');
  actionRow.style.marginTop = '16px';
  const refreshButton = createButton('Refresh', 'secondary');
  actionRow.append(refreshButton);
  card.append(actionRow);

  async function loadHealth() {
    refreshButton.disabled = true;
    errorLine.style.display = 'none';
    try {
      const snapshot = await getWorkerHealth();
      updateHealthPill(pill, snapshot);
    } catch (error) {
      errorLine.textContent = error instanceof Error ? error.message : String(error);
      errorLine.style.display = 'block';
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener('click', () => {
    void loadHealth();
  });
  void loadHealth();

  return card;
}

function updateHealthPill(target: HTMLElement, snapshot: WorkerHealth) {
  target.className = snapshot.ok ? 'health-pill health-pill--ok' : 'health-pill health-pill--warn';
  target.replaceChildren();
  const status = snapshot.ok ? 'Operational' : 'Needs attention';
  const suffix = snapshot.status ? ` · ${snapshot.status}` : '';
  const description = `Updated ${new Date(snapshot.timestamp_ms).toLocaleTimeString()}${suffix}`;
  target.append(createElement('strong', undefined, status));
  target.append(createElement('span', undefined, description));
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createButton(
  label: string,
  variant: 'primary' | 'secondary' = 'primary',
): HTMLButtonElement {
  const button = createElement('button', `button button--${variant}`);
  button.type = 'button';
  button.textContent = label;
  return button;
}
