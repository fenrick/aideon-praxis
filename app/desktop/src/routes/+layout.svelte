<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/styles/theme.css';

  onMount(async () => {
    await import('$lib/tauri-shim');
  });
</script>

<slot />
