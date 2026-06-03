import { prisma } from "@/lib/db";

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function isGlobalKillSwitchActive(): Promise<boolean> {
  if (process.env.ADMIN_KILL_SWITCH === "true") return true;
  const db = await getAppSetting("global_kill_switch");
  return db === "true";
}

export async function setGlobalKillSwitch(active: boolean) {
  await setAppSetting("global_kill_switch", active ? "true" : "false");
}
