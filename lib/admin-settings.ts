export type AdminSettings = {
  maintenanceMode: boolean;
  enrollmentStatus: "open" | "closed" | "waitlist";
  supportEmail: string;
  broadcastMessage: string;
  sessionTimeoutMinutes: number;
};

type GlobalWithAdminSettings = typeof globalThis & {
  __flexproAdminSettings?: AdminSettings;
};

const globalStore = globalThis as GlobalWithAdminSettings;

if (!globalStore.__flexproAdminSettings) {
  globalStore.__flexproAdminSettings = {
    maintenanceMode: false,
    enrollmentStatus: "open",
    supportEmail: "support@flexpro.edu",
    broadcastMessage: "",
    sessionTimeoutMinutes: 60,
  };
}

export function getAdminSettings(): AdminSettings {
  return globalStore.__flexproAdminSettings!;
}

export function updateAdminSettings(settings: AdminSettings): AdminSettings {
  globalStore.__flexproAdminSettings = { ...settings };
  return globalStore.__flexproAdminSettings;
}
