class MockElk {
  async layout(graph: { children?: { id: string }[] }) {
    // Return a shallow copy with deterministic coordinates for stability
    return {
      ...graph,
      children: (graph.children ?? []).map((child, index) => ({
        ...child,
        x: index * 32,
        y: index * 24,
      })),
    };
  }
}

export default MockElk;
