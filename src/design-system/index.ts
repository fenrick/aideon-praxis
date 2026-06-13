// Blocks
export * from './blocks/artefact-frame';
export * from './blocks/command-palette';
export * from './blocks/confidence-label';
export * from './blocks/dashboard-grid';
export * from './blocks/diff-marker';
export * from './blocks/explanation-surface';
export * from './blocks/inspector-panel';
export * from './blocks/inspector-section';
export * from './blocks/property-list';
export * from './blocks/provenance-panel';
export * from './blocks/empty-state';
export * from './blocks/error-frame';
export * from './blocks/modal';
export * from './blocks/panel';
export * from './blocks/partial-banner';
export * from './blocks/provenance-badge';
export * from './blocks/rebuilding-indicator';
export * from './blocks/sidebar';
export * from './blocks/stale-badge';
export * from './blocks/status-badge';
export * from './blocks/toolbar';
export * from './blocks/warning-banner';
export * from './blocks/widget-frame';
export * from './blocks/filter-bar';

// Shell
export * from './desktop-shell';

// UI primitives (shadcn/ui — ADR-0010 proxy boundary)
// Icons are available separately via 'design-system/icons' to avoid name collisions.
export * from './components/ui/accordion';
export * from './components/ui/empty';
export * from './components/ui/alert';
export * from './components/ui/avatar';
export * from './components/ui/badge';
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/collapsible';
export * from './components/ui/command';
export * from './components/ui/dialog';
export * from './components/ui/dropdown-menu';
export * from './components/ui/form';
export * from './components/ui/input';
export * from './components/ui/kbd';
export * from './components/ui/label';
export * from './components/ui/popover';
export * from './components/ui/scroll-area';
export * from './components/ui/select';
export * from './components/ui/separator';
// sidebar re-exported via desktop-shell
export * from './components/ui/skeleton';
export * from './components/ui/slider';
export * from './components/ui/sonner';
export * from './components/ui/switch';
export * from './components/ui/table';
export * from './components/ui/tabs';
export * from './components/ui/textarea';
export * from './components/ui/toggle-group';
export * from './components/ui/tooltip';
