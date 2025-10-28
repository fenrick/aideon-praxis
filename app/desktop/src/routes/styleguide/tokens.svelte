<script lang="ts">
  import '$lib/styles/theme.css';
</script>

<section>
  <h2>Tokens</h2>
  <div class="grid">
    <div class="swatch" style="--c: var(--color-bg)">bg</div>
    <div class="swatch" style="--c: var(--color-surface)">surface</div>
    <div class="swatch" style="--c: var(--color-border)">border</div>
    <div class="swatch" style="--c: var(--color-text); color: var(--color-bg)">text</div>
    <div class="swatch" style="--c: var(--color-muted)">muted</div>
    <div class="swatch" style="--c: var(--color-accent)">accent</div>
    <div class="swatch" style="--c: var(--color-danger)">danger</div>
    <div class="swatch" style="--c: var(--color-success)">success</div>
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  .swatch {
    height: 60px;
    background: var(--c);
    border: 1px solid var(--color-border);
    display: grid;
    place-items: center;
    border-radius: var(--radius-1);
    box-shadow: var(--shadow-1);
  }
</style>
