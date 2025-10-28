<script lang="ts">
  import '../../lib/styles/theme.css';
  import Tokens from './tokens.svelte';
  import Components from './components.svelte';
</script>

<div class="sg">
  <h1>Style Guide</h1>
  <Tokens />
  <Components />
</div>

<style>
  .sg {
    padding: var(--space-4);
    display: grid;
    gap: var(--space-6);
  }
  h1 {
    margin: 0;
  }
</style>
