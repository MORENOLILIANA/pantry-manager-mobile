import AsyncStorage from "@react-native-async-storage/async-storage";

const groupsKey = "pantry-manager.groups";
const activeGroupIdKey = "pantry-manager.active-group-id";

export type GroupMemberRole = "owner" | "member";

export interface GroupMember {
  id: string;
  name: string;
  role: GroupMemberRole;
  joined_at: string;
}

export interface PantryGroup {
  id: string;
  name: string;
  inviteCode: string;
  members: GroupMember[];
  sharedShoppingListId?: string;
  created_at: string;
  updated_at: string;
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readGroups(): Promise<PantryGroup[]> {
  const raw = await AsyncStorage.getItem(groupsKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PantryGroup[]) : [];
  } catch {
    return [];
  }
}

async function writeGroups(groups: PantryGroup[]) {
  await AsyncStorage.setItem(groupsKey, JSON.stringify(groups));
}

export async function getGroups() {
  return readGroups();
}

export async function createGroup(name: string, ownerName = "Yo") {
  const current = await readGroups();
  const now = new Date().toISOString();
  const group: PantryGroup = {
    id: createId("group"),
    name: name.trim(),
    inviteCode: createId("INV").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
    members: [
      {
        id: createId("member"),
        name: ownerName.trim() || "Yo",
        role: "owner",
        joined_at: now,
      },
    ],
    created_at: now,
    updated_at: now,
  };

  const next = [group, ...current];
  await writeGroups(next);
  await setActiveGroupId(group.id);
  return group;
}

export async function joinGroupByCode(inviteCode: string, memberName: string) {
  const code = inviteCode.trim().toUpperCase();
  const groups = await readGroups();
  const groupIndex = groups.findIndex((group) => group.inviteCode.toUpperCase() === code);

  if (groupIndex === -1) {
    throw new Error("No se encontró un grupo con ese código de invitación.");
  }

  const now = new Date().toISOString();
  const target = groups[groupIndex];
  const member: GroupMember = {
    id: createId("member"),
    name: memberName.trim() || "Invitado",
    role: "member",
    joined_at: now,
  };

  groups[groupIndex] = {
    ...target,
    members: [...target.members, member],
    updated_at: now,
  };

  await writeGroups(groups);
  await setActiveGroupId(groups[groupIndex].id);
  return groups[groupIndex];
}

export async function addGroupMember(groupId: string, memberName: string) {
  const groups = await readGroups();
  const index = groups.findIndex((group) => group.id === groupId);
  if (index === -1) {
    throw new Error("No se encontró el grupo.");
  }

  const now = new Date().toISOString();
  const member: GroupMember = {
    id: createId("member"),
    name: memberName.trim(),
    role: "member",
    joined_at: now,
  };

  groups[index] = {
    ...groups[index],
    members: [...groups[index].members, member],
    updated_at: now,
  };

  await writeGroups(groups);
  return groups[index];
}

export async function updateGroupSharing(groupId: string, sharedShoppingListId?: string) {
  const groups = await readGroups();
  const index = groups.findIndex((group) => group.id === groupId);
  if (index === -1) {
    throw new Error("No se encontró el grupo.");
  }

  groups[index] = {
    ...groups[index],
    sharedShoppingListId,
    updated_at: new Date().toISOString(),
  };

  await writeGroups(groups);
  return groups[index];
}

export async function setActiveGroupId(groupId: string | null) {
  if (!groupId) {
    await AsyncStorage.removeItem(activeGroupIdKey);
    return;
  }

  await AsyncStorage.setItem(activeGroupIdKey, groupId);
}

export async function getActiveGroupId() {
  return AsyncStorage.getItem(activeGroupIdKey);
}

export async function getActiveGroup() {
  const [groups, activeGroupId] = await Promise.all([readGroups(), getActiveGroupId()]);
  if (!activeGroupId) return null;
  return groups.find((group) => group.id === activeGroupId) ?? null;
}
