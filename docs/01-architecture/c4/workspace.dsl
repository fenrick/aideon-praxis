workspace "Aideon Desktop" "Local-first, time-first digital twin of an organisation" {
  !identifiers hierarchical

  model {
    user = person "EA Practitioner" "Explores portfolios and time-sliced views of the twin"

    aideon = softwareSystem "Aideon Desktop" "Desktop app: Tauri host, React renderer, in-process Rust engine crates over a portable canonical workspace" {

      renderer = container "Renderer" "React UI and design system in the Tauri WebView. Disposable; holds no canonical truth." "React / TypeScript / WebView"

      host = container "Host" "Tauri v2 runtime: typed IPC, capability enforcement, workspace lifecycle, job orchestration, event distribution. The sole security boundary and composition root." "Rust / Tauri" {
        ipc = component "IPC and capability layer" "Validates and dispatches typed commands; enforces per-window capabilities; returns the stable error envelope." "Rust"
        lifecycle = component "Workspace lifecycle" "Open, validate, watch, rebuild-trigger, backup." "Rust"
        jobs = component "Job orchestrator" "AcceptedJob lifecycle: run, progress, cancel, recover." "Rust"
        events = component "Event distribution" "Pushes typed host to renderer events." "Rust"
        wiring = component "Engine harness (engine crate)" "Holds engine traits and assembles concrete engines behind them; routes commands to trait objects." "Rust"
      }

      engines = container "Domain engines" "In-process Rust engine crates, each behind a published trait. None depends on another in a cycle." "Rust crates" {
        praxis = component "Praxis" "Meaning: metamodel, types, edge catalogue, artefact execution, integrity scoring, explainability." "Rust"
        mneme = component "Mneme" "Storage: op log, bitemporal facts, schema-as-data, blob store, derived runtime, storage trait. The only engine that touches storage." "Rust"
        metis = component "Metis" "Analytics: deterministic, bounded graph computation — centrality, impact, paths, cost." "Rust"
        chrona = component "Chrona" "Time and scenario interpretation: Viewpoint resolution, layer policy, diff, scenario composition." "Rust"
        continuum = component "Continuum" "Local durable orchestration: jobs, retries, schedules, run ledger." "Rust"

        lexis = component "Lexis (planned)" "Search and discovery: full-text and semantic retrieval, bounded and Viewpoint-aware." "Rust (planned)"
        pylon = component "Pylon (planned)" "Interchange: import/export and connectors (ArchiMate Open Exchange, CSV/Excel)." "Rust (planned)"
        sophia = component "Sophia (planned)" "AI assistance: LLM-assisted authoring behind guardrails; all output Generated." "Rust (planned)"
        kerux = component "Kerux (planned)" "Reporting and publishing: deterministic briefings and packaged outputs, redaction by default." "Rust (planned)"
      }

      canonical = container "Canonical workspace folder" "Portable authority: append-only operations, schema-as-data, content-addressed blobs. The unit of copy, share, and sync." "Folder on disk"

      derived = container "Derived runtime (.aideon/runtime/)" "Rebuildable cache: runtime DB (SQLite default), tuple indexes, graph projections, search and vector sidecars. Deletable with no data loss." "SQLite + indexes"
    }

    # System context
    user -> aideon "Models, explores, and time-slices the organisation"

    # Container relationships
    user -> aideon.renderer "Uses"
    aideon.renderer -> aideon.host "Invokes typed commands; listens to events" "Tauri IPC (capability-gated, typed)"
    aideon.host -> aideon.engines "Calls engines via trait objects" "in-process trait calls"
    aideon.engines -> aideon.canonical "Reads and writes (Mneme only)" "filesystem"
    aideon.engines -> aideon.derived "Builds and queries (Mneme only)" "filesystem / DB"
    aideon.canonical -> aideon.derived "Rebuilds (lossless) on demand"

    # Host component wiring
    aideon.renderer -> aideon.host.ipc "invoke / listen"
    aideon.host.ipc -> aideon.host.lifecycle "Open / close / watch"
    aideon.host.ipc -> aideon.host.jobs "Dispatch long work"
    aideon.host.jobs -> aideon.host.events "Emit progress / completion"
    aideon.host.ipc -> aideon.host.wiring "Route to engine trait"
    aideon.host.wiring -> aideon.engines "Bind and call concrete engines"

    # Engine relationships (acyclic; Mneme is the storage seam)
    aideon.engines.praxis -> aideon.engines.mneme "Reads / writes facts and schema"
    aideon.engines.metis -> aideon.engines.mneme "Reads projections"
    aideon.engines.chrona -> aideon.engines.mneme "Time-aware fact reads"
    aideon.engines.continuum -> aideon.engines.mneme "Persistence workflows"
    aideon.engines.chrona -> aideon.engines.praxis "Consumes contracts only"
    aideon.engines.continuum -> aideon.engines.praxis "Consumes capability traits only"
    aideon.engines.continuum -> aideon.engines.metis "Consumes capability traits only"
    aideon.engines.continuum -> aideon.engines.chrona "Consumes capability traits only"
    aideon.engines.metis -> aideon.engines.praxis "Consumes contracts only"
    aideon.engines.lexis -> aideon.engines.mneme "Planned: reads through storage"
    aideon.engines.pylon -> aideon.engines.mneme "Planned: reads / writes through storage"
    aideon.engines.sophia -> aideon.engines.mneme "Planned: grounds output in twin content"
    aideon.engines.kerux -> aideon.engines.mneme "Planned: reads through storage"
  }

  views {
    systemContext aideon "system-context" {
      include *
      autolayout lr
      title "Aideon Desktop — System Context (C4 L1)"
      description "Who uses Aideon Desktop and what it is."
    }

    container aideon "container" {
      include *
      autolayout lr
      title "Aideon Desktop — Containers (C4 L2)"
      description "Renderer, host, engines, and the canonical/derived split."
    }

    component aideon.host "host-components" {
      include *
      autolayout lr
      title "Host — Components (C4 L3)"
      description "IPC, lifecycle, jobs, events, and the engine harness inside the host."
    }

    component aideon.engines "engine-components" {
      include *
      autolayout tb
      title "Domain Engines — Components (C4 L3)"
      description "The five current engines and the four planned engines, behind traits; Mneme is the only storage seam."
    }

    styles {
      element "Person" {
        background #08427b
        color #ffffff
        shape Person
      }
      element "Software System" {
        background #1168bd
        color #ffffff
      }
      element "Container" {
        background #438dd5
        color #ffffff
      }
      element "Component" {
        background #85bbf0
        color #000000
      }
      relationship {
        routing Orthogonal
      }
    }
  }
}
