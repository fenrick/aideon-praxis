<script lang="ts">
  export let visible = true;
  export let line = 'Starting…';
</script>

{#if visible}
  <div class="splash">
    <img class="bg" src="/assets/splash.png" alt="" />
    <div class="right">
      <h1 class="title">Aideon&nbsp;Praxis</h1>
      <div class="loading">
        <span id="loadline">{line}</span>
        <div class="bar"><i></i></div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(:root) {
    --ink: #0b1220;
    --teal: #22e3d0;
    --vio: #7c5cff;
    --sun: #ff6a3d;
  }
  .splash {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: #061428;
  }
  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.9) saturate(1.05);
  }
  .right {
    position: absolute;
    right: 5vw;
    top: 50%;
    transform: translateY(-50%);
    max-width: 42vw;
  }
  .title {
    font-family:
      'Atomic Age Local',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI Variable',
      'Segoe UI',
      Roboto,
      Ubuntu,
      Cantarell,
      'Noto Sans',
      Arial,
      sans-serif;
    font-size: clamp(64px, 8vw, 140px);
    letter-spacing: 0.012em;
    margin: 0 0 24px;
    background: linear-gradient(90deg, var(--teal), var(--vio), var(--sun));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 14px rgba(11, 18, 32, 0.35);
  }
  .loading {
    font:
      600 20px/1.4 'Geist Mono Local',
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    color: #cfe6ff;
  }
  .bar {
    margin-top: 8px;
    height: 3px;
    background: rgba(255, 255, 255, 0.15);
    overflow: hidden;
    border-radius: 999px;
  }
  .bar i {
    display: block;
    width: 30%;
    height: 100%;
    background: linear-gradient(90deg, var(--teal), var(--sun));
    animation: scan 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    border-radius: 999px;
  }
  @keyframes scan {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }
</style>
