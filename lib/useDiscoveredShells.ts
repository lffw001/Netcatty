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
      // Clear the failed promise so the next mount can retry
      shellPromise = null;
    });
  }, []);

  return shells;
}

/**
 * Resolve a localShell setting value to shell command and args.
 * The value can be a discovered shell id (e.g., "wsl-ubuntu", "pwsh")
 * or a custom path/command (e.g., "/usr/local/bin/fish" or "fish").
 * Returns { command, args } or null when discovery hasn't loaded yet
 * and the value might be a shell ID that can't be resolved yet.
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

  // Check if the value looks like a file path or bare executable name
  const looksLikePath = /[/\\]/.test(localShell);
  const looksLikeShellId = /-/.test(localShell) && !looksLikePath;

  if (discoveredShells.length > 0) {
    // Discovery loaded. If value looks like a path/executable, pass through as custom.
    // If it looks like a shell ID (has hyphens, e.g. "wsl-ubuntu") but didn't match,
    // it's stale/unavailable — return null to fall back to system default.
    return looksLikeShellId ? null : { command: localShell };
  }

  // Discovery hasn't loaded yet. Pass through paths and bare names,
  // but hold back shell-ID-like values until discovery completes.
  return looksLikeShellId ? null : { command: localShell };
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

/** Distro icons are monochrome black and need `dark:invert` in dark mode */
export function isMonochromeShellIcon(iconId: string): boolean {
  return DISTRO_ICONS.has(iconId);
}
