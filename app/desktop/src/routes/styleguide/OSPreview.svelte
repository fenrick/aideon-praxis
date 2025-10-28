<script lang="ts">
  // Minimal OS-specific component previews
  // Assumes the theme manager has already injected any required CSS/assets
  import { onMount } from 'svelte';
  import { getResolvedUiTheme, onUiThemeChange } from '$lib/theme/platform';
  let theme = $state(getResolvedUiTheme());
  onMount(() => {
    const off = onUiThemeChange((t) => (theme = t));
    return () => off();
  });
</script>

{#if theme === 'win'}
  <section>
    <h2>Windows (Fluent 2)</h2>
    <div class="row">
      <fluent-button appearance="accent">Primary</fluent-button>
      <fluent-button>Default</fluent-button>
      <fluent-button appearance="outline">Outline</fluent-button>
    </div>
    <div class="grid2">
      <fluent-text-field placeholder="Name"></fluent-text-field>
      <fluent-select>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </fluent-select>
    </div>
  </section>
{:else if theme === 'mac'}
  <section>
    <h2>macOS (Puppertino)</h2>
    <div class="row">
      <button class="p-btn">Default</button>
      <button class="p-btn p-prim-col">Primary</button>
      <button class="p-btn p-btn-destructive">Destructive</button>
    </div>
    <div class="grid2">
      <input class="p-form-text" type="text" placeholder="Name" />
      <div class="p-form-select">
        <select>
          <option>Option A</option>
          <option>Option B</option>
        </select>
      </div>
      <label class="p-form-checkbox-cont"><input type="checkbox" /><span>Active</span></label>
      <label class="p-form-radio-cont"><input type="radio" name="r1" /><span>Choice</span></label>
    </div>
  </section>
{:else}
  <section>
    <h2>Neutral (Tailwind/shadcn-like)</h2>
    <div class="row">
      <button class="btn-neutral-primary">Primary</button>
      <button class="btn-neutral">Default</button>
    </div>
    <div class="grid2">
      <input class="tw-input" placeholder="Name" />
      <select class="tw-select">
        <option>Option A</option>
        <option>Option B</option>
      </select>
    </div>
  </section>
{/if}

<style>
  .row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .grid2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-2);
  }
  /* Tailwind-styled basic inputs for neutral preview */
  .tw-input {
    border: 1px solid rgb(212 212 212);
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    background: white;
  }
  .tw-select {
    border: 1px solid rgb(212 212 212);
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    background: white;
  }
  :global(.dark) .tw-input,
  :global(.dark) .tw-select {
    background: rgb(23 23 23);
    color: white;
    border-color: rgb(64 64 64);
  }
  /* Puppertino button helpers — classes provided by vendored CSS */
  .p-btn + .p-btn {
    margin-left: 8px;
  }
  .p-form-select {
    min-width: 160px;
  }
</style>
