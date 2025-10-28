workspace "Aideon Praxis" "Local‑first, time‑first EA platform" {
  !identifiers hierarchical

  model {
    user = person "EA Practitioner" "Explores portfolios and time‑sliced views"
    aideon = softwareSystem "Aideon Praxis" "Desktop app with Tauri host, Svelte renderer, Rust worker crates" {
      renderer = container "Renderer (Svelte in Tauri Webview)" "UI, no backend logic" "Svelte"
      host = container "Host (Tauri/Rust)" "Typed IPC, window mgmt, security, worker orchestration" "Rust"
      worker = container "Worker (Chrona/Metis/Praxis)" "Time API + analytics behind traits" "Rust"
    }

    user -> renderer "Uses" "IPC bridge (typed)"
    renderer -> host "Invokes commands" "Tauri invoke (typed)"
    host -> worker "Calls engines via adapters" "in‑process (desktop), swappable adapters"
  }

  views {
    systemContext aideon "system-context" {
      include *
      autolayout lr
      title "Aideon Praxis — System Context"
    }

    container aideon "container" {
      include *
      autolayout lr
      title "Aideon Praxis — Container View"
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
      relationship {
        routing Orthogonal
      }
    }
  }
}

