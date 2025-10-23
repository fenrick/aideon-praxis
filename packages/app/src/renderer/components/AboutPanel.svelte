<script lang="ts">
</script>

<div class="about">
  <img class="mark" src="/assets/app-icon.png" alt="Aideon Praxis" />
  <div class="col">
    <h1 class="title">Aideon&nbsp;Praxis</h1>
    <div class="meta">Twin‑orbit decision tooling · © Aideon</div>
  </div>
</div>

<style>
  :global(:root){ --ink:#0B1220; --teal:#22E3D0; --vio:#7C5CFF; --sun:#FF6A3D; --ui:-apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", Arial, sans-serif; }
  .about{ display:flex; gap:20px; align-items:center; padding:16px; }
  .mark{ width:72px; height:72px; border-radius:16px; object-fit:cover }
  .title{
    margin:0; font-family:'Atomic Age Local', var(--ui); font-size:36px; letter-spacing:.012em;
    background:linear-gradient(90deg,var(--teal),var(--vio),var(--sun)); -webkit-background-clip:text; background-clip:text; color:transparent;
    text-shadow:0 0 12px rgba(11,18,32,.35)
  }
  .meta{ opacity:.75; margin-top:4px; font-family:var(--ui) }
  .col{ display:flex; flex-direction:column }
</style>

