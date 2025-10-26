<script lang="ts">
  // Appearance settings panel. Stores the chosen mode in localStorage and
  // toggles a class on <body> so CSS can respond without any backend coupling.
  import '$lib/styles/theme.css';
  type ThemeMode = 'system' | 'light' | 'dark';
  let mode: ThemeMode = (localStorage.getItem('themeMode') as ThemeMode) || 'system';

  // Apply the chosen theme by updating body classes. System mode leaves it unset.
  function apply(mode_: ThemeMode) {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (mode_ === 'light') document.body.classList.add('theme-light');
    else if (mode_ === 'dark') document.body.classList.add('theme-dark');
  }

  // Persist the preference and apply immediately.
  function setMode(next: ThemeMode) {
    mode = next;
    localStorage.setItem('themeMode', mode);
    apply(mode);
  }

  apply(mode);
</script>

<div style="padding:16px; font-family: var(--font-ui); min-width: 480px;">
  <h2 style="margin:0 0 12px 0;">Appearance</h2>
  <fieldset style="border: none; padding: 0;">
    <legend style="margin-bottom: 8px;">Theme</legend>
    <label
      ><input
        type="radio"
        name="mode"
        value="system"
        bind:group={mode}
        on:change={() => setMode('system')}
      /> System</label
    >
    <label style="margin-left:12px"
      ><input
        type="radio"
        name="mode"
        value="light"
        bind:group={mode}
        on:change={() => setMode('light')}
      /> Light</label
    >
    <label style="margin-left:12px"
      ><input
        type="radio"
        name="mode"
        value="dark"
        bind:group={mode}
        on:change={() => setMode('dark')}
      /> Dark</label
    >
  </fieldset>
  <p style="opacity:0.75; margin-top:12px;">Accent color follows system (AccentColor).</p>
</div>

<style>
  :global(.theme-light) {
    color-scheme: light;
  }
  :global(.theme-dark) {
    color-scheme: dark;
  }
</style>
