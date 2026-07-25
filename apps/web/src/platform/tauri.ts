import { isTauri } from "@tauri-apps/api/core";

export { isTauri };

/**
 * Shows a native OS notification via Tauri's notification plugin. Returns false (and does
 * nothing) outside the desktop shell, so callers can fall back to the Browser Notification API.
 */
export async function sendNativeNotification(title: string, body: string): Promise<boolean> {
  if (!isTauri()) return false;

  const { isPermissionGranted, requestPermission, sendNotification } = await import(
    "@tauri-apps/plugin-notification"
  );

  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (!granted) return false;

  sendNotification({ title, body });
  return true;
}

/**
 * Opens a URL in the user's default OS browser via Tauri's opener plugin (spec 17.1: "Open
 * meeting links, Open map links"). Remote content shouldn't navigate the app's own webview to
 * arbitrary external sites, so this is the desktop equivalent of `window.open`.
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
