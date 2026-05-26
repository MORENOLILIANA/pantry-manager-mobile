import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState } from "@/components/EmptyState";
import { getShoppingLists } from "@/api/shoppingLists";
import {
  addGroupMember,
  createGroup,
  getActiveGroupId,
  getGroups,
  joinGroupByCode,
  setActiveGroupId,
  updateGroupSharing,
  type PantryGroup,
} from "@/services/groups";


type ModalMode = "create" | "join" | "member";

export function GroupsScreen() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<PantryGroup[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeShoppingListId, setActiveShoppingListId] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const load = async () => {
    try {
      setLoading(true);
      const [savedGroups, activeId, lists] = await Promise.all([
        getGroups(),
        getActiveGroupId(),
        getShoppingLists().catch(() => []),
      ]);

      setGroups(savedGroups);
      setActiveGroupIdState(activeId);
      const activeList = lists.find((list) => list.status === "active") ?? null;
      setActiveShoppingListId(activeList?.id ?? null);

      if (!selectedGroupId && savedGroups.length > 0) {
        setSelectedGroupId(savedGroups[0].id);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
      Alert.alert("Error", "No se pudieron cargar los grupos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refresh = async () => {
    await load();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Escribe un nombre para el grupo.");
      return;
    }

    try {
      setBusy(true);
      const group = await createGroup(groupName.trim());
      setGroupName("");
      setGroups((current) => [group, ...current]);
      setActiveGroupIdState(group.id);
      setSelectedGroupId(group.id);
      setModalMode(null);
      Alert.alert("Éxito", `Grupo creado con código ${group.inviteCode}`);
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "No se pudo crear el grupo.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Escribe el código de invitación.");
      return;
    }

    try {
      setBusy(true);
      const group = await joinGroupByCode(inviteCode.trim(), memberName.trim() || "Invitado");
      setInviteCode("");
      setMemberName("");
      await refresh();
      setActiveGroupIdState(group.id);
      setSelectedGroupId(group.id);
      setModalMode(null);
      Alert.alert("Éxito", `Te has unido a ${group.name}`);
    } catch (error: any) {
      console.error("Error joining group:", error);
      Alert.alert("Error", error?.message || "No se pudo unir al grupo.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !memberName.trim()) {
      Alert.alert("Error", "Escribe el nombre del miembro.");
      return;
    }

    try {
      setBusy(true);
      const updated = await addGroupMember(selectedGroup.id, memberName.trim());
      setGroups((current) => current.map((group) => (group.id === updated.id ? updated : group)));
      setMemberName("");
      setModalMode(null);
      Alert.alert("Éxito", "Miembro añadido correctamente.");
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "No se pudo añadir el miembro.");
    } finally {
      setBusy(false);
    }
  };

  const handleSelectGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);
    setActiveGroupIdState(groupId);
    await setActiveGroupId(groupId);
  };

  const handleShareActiveList = async () => {
    if (!selectedGroup) {
      Alert.alert("Error", "Selecciona un grupo primero.");
      return;
    }

    if (!activeShoppingListId) {
      Alert.alert("Error", "No hay lista activa para compartir.");
      return;
    }

    try {
      setBusy(true);
      const updated = await updateGroupSharing(selectedGroup.id, activeShoppingListId);
      setGroups((current) => current.map((group) => (group.id === updated.id ? updated : group)));
      Alert.alert("Compartida", "La lista activa quedó vinculada al grupo seleccionado.");
    } catch (error) {
      console.error("Error sharing list:", error);
      Alert.alert("Error", "No se pudo vincular la lista.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Grupos y compartidos</Text>
            <Text style={styles.subtitle}>Organiza hogares, comparte listas y gestiona miembros.</Text>
          </View>
          <Pressable onPress={refresh} style={styles.iconButton}>
            <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Botones crear / unirse */}
        <View style={styles.actionsRow}>
          <PrimaryButton title="Crear grupo" onPress={() => setModalMode("create")} style={styles.actionButton} />
          <PrimaryButton title="Unirme con código" onPress={() => setModalMode("join")} variant="secondary" style={styles.actionButton} />
        </View>

        {/* Tarjeta grupo seleccionado */}
        {selectedGroup ? (
          <View style={[styles.card, shadows.sm]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{selectedGroup.name}</Text>
                <Text style={styles.groupMeta}>Código: {selectedGroup.inviteCode}</Text>
              </View>
              {activeGroupId === selectedGroup.id && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Activo</Text>
                </View>
              )}
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{selectedGroup.members.length}</Text>
                <Text style={styles.metricLabel}>Miembros</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{selectedGroup.sharedShoppingListId ? 1 : 0}</Text>
                <Text style={styles.metricLabel}>Lista vinculada</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <Pressable onPress={() => setModalMode("member")} style={styles.inlineAction}>
                <MaterialCommunityIcons name="account-plus" size={18} color={colors.primary} />
                <Text style={styles.inlineActionText}>Añadir miembro</Text>
              </Pressable>
              <Pressable onPress={handleShareActiveList} style={styles.inlineAction}>
                <MaterialCommunityIcons name="share-variant" size={18} color={colors.primary} />
                <Text style={styles.inlineActionText}>Vincular lista activa</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Miembros</Text>
            {selectedGroup.members.map((item) => (
              <View key={item.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <MaterialCommunityIcons name={item.role === "owner" ? "shield-account" : "account"} size={18} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberRole}>{item.role === "owner" ? "Propietario" : "Miembro"}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="account-group-outline"
            title="No tienes grupos"
            subtitle="Crea un grupo o únete con un código para compartir listas"
          />
        )}

        {/* Lista de todos los grupos */}
        <View style={styles.groupListHeader}>
          <Text style={styles.sectionLabel}>Mis grupos ({groups.length})</Text>
          <Pressable onPress={refresh}>
            <Text style={styles.sectionHint}>Actualizar</Text>
          </Pressable>
        </View>

        {groups.length === 0 ? (
          <Text style={styles.emptyHint}>Aún no tienes ningún grupo.</Text>
        ) : (
          groups.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void handleSelectGroup(item.id)}
              style={[styles.groupRow, item.id === selectedGroupId && styles.groupRowActive, shadows.sm]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.groupRowTitle}>{item.name}</Text>
                <Text style={styles.groupRowSubtitle}>{item.members.length} miembros · código {item.inviteCode}</Text>
              </View>
              <MaterialCommunityIcons
                name={item.id === selectedGroupId ? "check-circle" : "chevron-right"}
                size={22}
                color={item.id === selectedGroupId ? colors.primary : colors.subtext}
              />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackground} onPress={() => setModalMode(null)} />
          <View style={[styles.modalContent, shadows.lg]}>
            <Text style={styles.modalTitle}>
              {modalMode === "create" ? "Crear grupo" : modalMode === "join" ? "Unirme a grupo" : "Añadir miembro"}
            </Text>

            {modalMode === "create" ? (
              <TextInput value={groupName} onChangeText={setGroupName} placeholder="Nombre del grupo" placeholderTextColor={colors.subtext} style={styles.input} />
            ) : modalMode === "join" ? (
              <>
                <TextInput value={inviteCode} onChangeText={setInviteCode} placeholder="Código de invitación" placeholderTextColor={colors.subtext} style={styles.input} autoCapitalize="characters" />
                <TextInput value={memberName} onChangeText={setMemberName} placeholder="Tu nombre" placeholderTextColor={colors.subtext} style={styles.input} />
              </>
            ) : (
              <TextInput value={memberName} onChangeText={setMemberName} placeholder="Nombre del miembro" placeholderTextColor={colors.subtext} style={styles.input} />
            )}

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setModalMode(null)} disabled={busy} style={[styles.modalButton, styles.modalCancel]}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (modalMode === "create") {
                    void handleCreateGroup();
                    return;
                  }
                  if (modalMode === "join") {
                    void handleJoinGroup();
                    return;
                  }
                  void handleAddMember();
                }}
                disabled={busy}
                style={[styles.modalButton, styles.modalSave]}
              >
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalSaveText}>Guardar</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: spacing.xxl },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.bodySm, color: colors.subtext, marginTop: spacing.xs },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary },
  actionsRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  actionButton: { flex: 1 },
  card: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: colors.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  groupName: { ...typography.h3, color: colors.text },
  groupMeta: { ...typography.bodySm, color: colors.subtext, marginTop: spacing.xs },
  activeBadge: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  activeBadgeText: { ...typography.caption, color: colors.white, fontWeight: "700" },
  metricsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  metricBox: { flex: 1, backgroundColor: colors.secondary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: "center" },
  metricValue: { ...typography.h2, color: colors.primary },
  metricLabel: { ...typography.caption, color: colors.subtext, marginTop: spacing.xs },
  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.secondary, borderRadius: 999 },
  inlineActionText: { ...typography.bodySm, color: colors.primary, fontWeight: "700" },
  sectionLabel: { ...typography.bodySm, color: colors.text, fontWeight: "700", marginBottom: spacing.sm },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  memberName: { ...typography.body, color: colors.text, fontWeight: "600" },
  memberRole: { ...typography.caption, color: colors.subtext },
  groupListHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.md },
  sectionHint: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  emptyHint: { ...typography.bodySm, color: colors.subtext, textAlign: "center", paddingHorizontal: spacing.xl, marginTop: spacing.md },
  groupRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, marginHorizontal: spacing.xl, backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  groupRowActive: { borderColor: colors.primary, backgroundColor: colors.secondary },
  groupRowTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  groupRowSubtitle: { ...typography.caption, color: colors.subtext, marginTop: spacing.xs },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalContent: { width: "88%", maxWidth: 420, backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: "center" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body, color: colors.text, marginBottom: spacing.md },
  modalButtons: { flexDirection: "row", gap: spacing.md },
  modalButton: { flex: 1, minHeight: 50, borderRadius: borderRadius.md, alignItems: "center", justifyContent: "center" },
  modalCancel: { backgroundColor: colors.secondary },
  modalCancelText: { ...typography.bodySm, color: colors.text, fontWeight: "700" },
  modalSave: { backgroundColor: colors.primary },
  modalSaveText: { ...typography.bodySm, color: colors.white, fontWeight: "700" },
});
