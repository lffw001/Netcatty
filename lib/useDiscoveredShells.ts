import { useEffect, useState } from "react";
import { netcattyBridge } from "../infrastructure/services/netcattyBridge";

let shellCache: DiscoveredShell[] | null = null;
let shellPromise: Promise<DiscoveredShell[]> | null = null;

export function useDiscoveredShells(): DiscoveredShell[] {
  const [shells, setShells] = useState<DiscoveredShell[]>(shellCache ?? []);

  useEffect(() => {
    if (shellCache) {
      setShells(shellCache);
      return;
    }

    const bridge = netcattyBridge.get();
    if (!bridge?.discoverShells) return;

    if (!shellPromise) {
      shellPromise = bridge.discoverShells();
    }

    shellPromise.then((result) => {
      shellCache = result;
      setShells(result);
    }).catch((err) => {
      console.warn("Failed to discover shells:", err);
    });
  }, []);

  return shells;
}

/**
 * Resolve a localShell setting value to shell command and args.
 * The value can be a discovered shell id (e.g., "wsl-ubuntu", "pwsh")
 * or a custom path (e.g., "/usr/local/bin/fish").
 * Returns { command, args } or null if unresolved.
 */
export function resolveShellSetting(
  localShell: string,
  discoveredShells: DiscoveredShell[]
): { command: string; args?: string[] } | null {
  if (!localShell) return null;

  // Try to match as a discovered shell id
  const shell = discoveredShells.find(s => s.id === localShell);
  if (shell) {
    return { command: shell.command, args: shell.args };
  }

  // Treat as a custom shell path (backward compat with existing settings)
  return { command: localShell };
}

const DISTRO_ICONS = new Set([
  "ubuntu", "debian", "kali", "alpine", "opensuse",
  "fedora", "arch", "oracle", "linux",
]);

export function getShellIconPath(iconId: string): string {
  if (DISTRO_ICONS.has(iconId)) {
    return `/distro/${iconId}.svg`;
  }
  return `/shells/${iconId}.svg`;
}
