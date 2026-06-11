#[cfg(target_os = "linux")]
fn assert_no_tcp_listeners_linux() {
    use std::collections::{BTreeMap, BTreeSet};
    use std::fs;
    use std::path::Path;

    fn socket_inodes_for_process() -> BTreeSet<u64> {
        let mut inodes = BTreeSet::new();
        let Ok(entries) = fs::read_dir("/proc/self/fd") else {
            return inodes;
        };
        for entry in entries.flatten() {
            let Ok(link) = fs::read_link(entry.path()) else {
                continue;
            };
            let Some(link) = link.to_str() else {
                continue;
            };
            let Some(inner) = link.strip_prefix("socket:[") else {
                continue;
            };
            let Some(inner) = inner.strip_suffix(']') else {
                continue;
            };
            if let Ok(inode) = inner.parse::<u64>() {
                inodes.insert(inode);
            }
        }
        inodes
    }

    fn parse_proc_net_tcp(path: &Path) -> BTreeMap<u64, String> {
        let mut listening = BTreeMap::new();
        let Ok(raw) = fs::read_to_string(path) else {
            return listening;
        };
        for (ix, line) in raw.lines().enumerate() {
            if ix == 0 {
                continue;
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 10 {
                continue;
            }
            let local_address = parts[1];
            let state = parts[3];
            let inode = parts[9];
            if state != "0A" {
                continue;
            }
            if let Ok(inode) = inode.parse::<u64>() {
                listening.insert(inode, local_address.to_string());
            }
        }
        listening
    }

    let process_inodes = socket_inodes_for_process();
    let mut listening = parse_proc_net_tcp(Path::new("/proc/net/tcp"));
    listening.extend(parse_proc_net_tcp(Path::new("/proc/net/tcp6")));

    let mut owned_listeners = Vec::new();
    for inode in process_inodes {
        if let Some(addr) = listening.get(&inode) {
            owned_listeners.push(format!("inode={inode} local={addr}"));
        }
    }

    assert!(
        owned_listeners.is_empty(),
        "desktop host must not open TCP listeners in desktop mode; found: {owned_listeners:?}"
    );
}

#[test]
fn desktop_does_not_open_tcp_listeners() {
    #[cfg(target_os = "linux")]
    assert_no_tcp_listeners_linux();
}
