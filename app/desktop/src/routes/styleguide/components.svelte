<script lang="ts">
  import {
    Button,
    Checkbox,
    Modal,
    Radio,
    Select,
    Switch,
    TextField,
    ToastHost,
    Toolbar,
    ToolbarButton,
    Tooltip,
    push as toast,
  } from '@aideon/design-system';
  let open = false;
</script>

<section>
  <h2>Buttons</h2>
  <div class="row">
    <Button variant="primary">Primary</Button>
    <Button>Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Danger</Button>
  </div>
</section>

<section>
  <h2>Fields</h2>
  <div class="grid2">
    <TextField id="name" label="Name" placeholder="Component Name" />
    <Select
      id="type"
      label="Type"
      options={[
        { value: 'app', label: 'Application' },
        { value: 'cap', label: 'Capability' },
      ]}
    />
    <Checkbox id="active" label="Active" />
    <div>
      <Radio name="r1" id="r1a" label="A" value="A" />
      <Radio name="r1" id="r1b" label="B" value="B" />
    </div>
    <Switch id="sw1" label="Enabled" />
  </div>
</section>

<section>
  <h2>Toolbar</h2>
  <Toolbar title="Demo">
    <Tooltip text="New">
      <ToolbarButton icon="ph:plus" title="New" onClick={() => (open = true)} />
    </Tooltip>
    <div class="separator"></div>
    <Tooltip text="Toast">
      <ToolbarButton icon="ph:bell" title="Toast" onClick={() => toast('Hello from Toast!')} />
    </Tooltip>
  </Toolbar>
</section>

<!-- SplitPane demo temporarily removed from style guide to keep type/lint clean -->

<Modal title="Create Item" {open} onClose={() => (open = false)}>
  <TextField id="n2" label="Name" />
  <div style="display:flex; gap: 8px; justify-content: end; margin-top: 12px;">
    <Button variant="ghost" onClick={() => (open = false)}>Cancel</Button>
    <Button variant="primary" onClick={() => (open = false)}>Create</Button>
  </div>
  <ToastHost />
</Modal>

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
  }
  /* removed unused .pane-eg and .box */
</style>
