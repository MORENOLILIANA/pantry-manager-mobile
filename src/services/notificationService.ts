import { Platform } from "react-native";
import type { PantryItem } from "@/api/pantries";

/*
 * Para activar notificaciones push reales, instala el paquete y descomenta el bloque de abajo:
 *   npx expo install expo-notifications
 */

// ─── Stub (sin expo-notifications instalado) ─────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleExpiryNotifications(_items: PantryItem[]): Promise<void> {
  // no-op until expo-notifications is installed
}

/*
// ─── Implementación real (descomentar tras instalar expo-notifications) ───────

import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function scheduleExpiryNotifications(items: PantryItem[]): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const expiringTomorrow = items.filter((i) => daysUntilExpiry(i.expiry_date) === 1);
    const expiredToday    = items.filter((i) => daysUntilExpiry(i.expiry_date) === 0);
    const expiredAlready  = items.filter((i) => daysUntilExpiry(i.expiry_date) < 0);

    if (expiringTomorrow.length > 0) {
      const names = expiringTomorrow.map((i) => i.product.name).join(", ");
      const trigger = new Date();
      trigger.setHours(20, 0, 0, 0);
      const fireAt = trigger.getTime() > Date.now() ? trigger : new Date(Date.now() + 5000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Productos a punto de caducar",
          body: expiringTomorrow.length === 1
            ? `Mañana caduca: ${names}`
            : `Mañana caducan ${expiringTomorrow.length} productos: ${names}`,
          sound: true,
        },
        trigger: fireAt,
      });
    }

    if (expiredToday.length > 0) {
      const names = expiredToday.map((i) => i.product.name).join(", ");
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Caduca hoy",
          body: expiredToday.length === 1
            ? `Caduca hoy: ${names}`
            : `Caducan hoy ${expiredToday.length} productos: ${names}`,
          sound: true,
        },
        trigger: new Date(Date.now() + 3000),
      });
    }

    if (expiredAlready.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🗑️ Productos caducados",
          body: `Tienes ${expiredAlready.length} producto${expiredAlready.length > 1 ? "s" : ""} caducado${expiredAlready.length > 1 ? "s" : ""}. Revisa tu despensa.`,
          sound: false,
        },
        trigger: new Date(Date.now() + 6000),
      });
    }
  } catch (error) {
    console.warn("Notification scheduling failed:", error);
  }
}
*/
