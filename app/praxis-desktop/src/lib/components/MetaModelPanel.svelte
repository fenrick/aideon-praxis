<script lang="ts">
  import { onMount } from 'svelte';
  import type { MetaModelState } from '$lib/stores/metamodel';
  import { metaModelStore } from '$lib/stores/metamodel';

  let state: MetaModelState = { status: 'idle', schema: null, error: null };

  const unsubscribe = metaModelStore.subscribe((value) => {
    state = value;
  });

  async function loadMetaModel() {
    try {
      await metaModelStore.load();
    } catch {
      // store already captures the error state; nothing else needed here.
    }
  }

  async function refreshMetaModel() {
    try {
      await metaModelStore.refresh();
    } catch {
      // handled by the store state
    }
  }

  onMount(() => {
    loadMetaModel();
    return unsubscribe;
  });

  const toTitle = (value: string | undefined, fallback: string) => value ?? fallback;
</script>

<section class="meta-panel">
  <header>
    <div>
      <h1>Schema Reference</h1>
      {#if state.schema?.description}
        <p class="muted">{state.schema.description}</p>
      {/if}
    </div>
    <div class="status">
      <span class="pill">Version · {state.schema?.version ?? 'loading'}</span>
      {#if state.status === 'loading'}
        <span class="pill info">Loading…</span>
      {:else if state.status === 'error'}
        <span class="pill warning">Error</span>
      {:else if state.status === 'ready'}
        <span class="pill success">Live</span>
      {/if}
    </div>
  </header>

  {#if state.status === 'error'}
    <div class="alert">
      <h2>Failed to load meta-model</h2>
      <p>{state.error}</p>
      <button type="button" class="retry" on:click={refreshMetaModel}>Retry</button>
    </div>
  {:else if state.status === 'loading' && !state.schema}
    <p class="muted">Fetching schema…</p>
  {:else if !state.schema}
    <p class="muted">Schema not available yet.</p>
  {:else}
    <div class="summary">
      <article>
        <h3>Types</h3>
        <p class="count">{state.schema.types.length}</p>
        <p class="muted">Element definitions available to the worker.</p>
      </article>
      <article>
        <h3>Relationships</h3>
        <p class="count">{state.schema.relationships.length}</p>
        <p class="muted">Allowed links between element types.</p>
      </article>
    </div>

    <section class="grid">
      <div>
        <h2>Element Types</h2>
        <ul class="card-list">
          {#each state.schema.types as type (type.id)}
            <li class="card">
              <div class="card__header">
                <div>
                  <h3>{toTitle(type.label, type.id)}</h3>
                  <p class="muted">{type.category ?? 'Uncategorised'}</p>
                </div>
                {#if type.extends}
                  <span class="pill">Extends {type.extends}</span>
                {/if}
              </div>
              {#if type.attributes?.length}
                <dl>
                  {#each type.attributes as attribute (attribute.name)}
                    <div>
                      <dt>
                        {attribute.name}
                        {#if attribute.required}
                          <span class="required">required</span>
                        {/if}
                      </dt>
                      <dd>
                        {attribute.type}
                        {#if attribute.enum?.length}
                          <span class="muted">[{attribute.enum.join(', ')}]</span>
                        {/if}
                      </dd>
                    </div>
                  {/each}
                </dl>
              {:else}
                <p class="muted">No attributes defined.</p>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      <div>
        <h2>Relationships</h2>
        <ul class="card-list">
          {#each state.schema.relationships as rel (rel.id)}
            <li class="card">
              <div class="card__header">
                <div>
                  <h3>{toTitle(rel.label, rel.id)}</h3>
                  <p class="muted">{rel.directed === false ? 'Undirected' : 'Directed'}</p>
                </div>
              </div>
              <p class="muted">{rel.from.join(', ')} → {rel.to.join(', ')}</p>
              {#if rel.attributes?.length}
                <dl>
                  {#each rel.attributes as attribute (attribute.name)}
                    <div>
                      <dt>{attribute.name}</dt>
                      <dd>
                        {attribute.type}
                        {#if attribute.enum?.length}
                          <span class="muted">[{attribute.enum.join(', ')}]</span>
                        {/if}
                      </dd>
                    </div>
                  {/each}
                </dl>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}
</section>

<style>
  .meta-panel {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  .status {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pill {
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.85rem;
    background: color-mix(in srgb, var(--color-border) 65%, transparent);
  }
  .pill.info {
    background: color-mix(in srgb, var(--color-accent) 25%, transparent);
  }
  .pill.success {
    background: color-mix(in srgb, #10b981 30%, transparent);
  }
  .pill.warning {
    background: color-mix(in srgb, #f97316 25%, transparent);
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }
  .summary article {
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 16px;
    background: color-mix(in srgb, var(--color-surface) 85%, transparent);
  }
  .summary .count {
    font-size: 2rem;
    margin: 4px 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
  }
  .card-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .card {
    border: 1px solid var(--color-border);
    border-radius: 18px;
    padding: 16px;
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
    box-shadow: 0 12px 24px -20px rgba(15, 23, 42, 0.45);
  }
  .card__header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  dl {
    margin: 0;
    display: grid;
    gap: 4px;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    color: color-mix(in srgb, var(--color-text) 80%, transparent);
  }
  .muted {
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
    margin: 0;
  }
  .required {
    margin-left: 6px;
    font-size: 0.75rem;
    color: #dc2626;
  }
  .alert {
    border: 1px solid color-mix(in srgb, #f97316 45%, transparent);
    border-radius: 12px;
    padding: 16px;
    background: color-mix(in srgb, #fff7ed 85%, transparent);
  }
  .retry {
    margin-top: 12px;
    border: none;
    background: color-mix(in srgb, var(--color-accent) 35%, transparent);
    color: #fff;
    border-radius: 999px;
    padding: 6px 14px;
    cursor: pointer;
  }
</style>
