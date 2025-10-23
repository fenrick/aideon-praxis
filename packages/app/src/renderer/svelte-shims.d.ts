// Minimal Svelte component type to satisfy TS/ESLint without external deps
declare class SvelteComponentDevelopment {
  constructor(options: {
    target: Element;
    anchor?: Element | null;
    props?: Record<string, unknown>;
  });
  $destroy(): void;
  $on(event: string, handler: (...arguments_: unknown[]) => unknown): () => void;
  $set(properties: Record<string, unknown>): void;
}
declare module '*.svelte' {
  export default SvelteComponentDevelopment;
}
