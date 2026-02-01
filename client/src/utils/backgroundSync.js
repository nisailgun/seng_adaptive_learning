import { syncProgress } from "../api";

let isSyncing = false;

export function initBackgroundSync(token) {
  const handler = async () => {
    if (isSyncing) return;
    isSyncing = true;

    console.log("🌐 Internet restored. Syncing offline progress...");

    const offlineData = localStorage.getItem("offlineProgress");
    if (!offlineData) {
      console.log("✅ No offline progress to sync.");
      isSyncing = false;
      return;
    }

    try {
      const parsed = JSON.parse(offlineData);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const progress of items) {
        await syncProgress(token, progress);
      }

      localStorage.removeItem("offlineProgress");
      console.log("✅ Offline progress synced successfully.");
    } catch (err) {
      console.error("❌ Failed to sync offline progress:", err);
    } finally {
      isSyncing = false;
    }
  };

  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
