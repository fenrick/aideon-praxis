<script lang="ts">
  const props = $props<{
    icon?: string;
    width?: string | number;
    height?: string | number;
  }>();
</script>

<span data-icon={props.icon} data-width={props.width} data-height={props.height}></span>
