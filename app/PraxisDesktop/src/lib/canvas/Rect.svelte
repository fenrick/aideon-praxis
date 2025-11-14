<script lang="ts">
  const {
    width = 160,
    height = 100,
    label = 'Rect',
  } = $props<{ width?: number; height?: number; label?: string }>();
</script>

<div class="rect" role="group" aria-label={label} style={`width:${width}px;height:${height}px;`}>
  <span>{label}</span>
</div>

<style>
  .rect {
    background: #1f2937;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
</style>
