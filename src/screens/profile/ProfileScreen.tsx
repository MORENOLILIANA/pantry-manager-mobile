import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography, borderRadius, shadows } from "@/config/theme";
import { fetchCurrentUser, updateProfile, type AuthUser } from "@/api/auth";
import { getPantries, updatePantry, deletePantry, type Pantry } from "@/api/pantries";
import {
  getUserAvatar,
  saveUserAvatar,
  getUserAvatarPhoto,
  saveUserAvatarPhoto,
  clearUserAvatarPhoto,
} from "@/services/storage";

type Navigation = NativeStackNavigationProp<any>;

function crossAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

const AVATAR_OPTIONS = [
  "account",
  "account-star",
  "account-heart",
  "account-tie",
  "face-man",
  "face-woman",
  "robot",
  "cat",
];

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const { user: authUser, signOut, refreshSession } = useAuth();

  const [user, setUser] = useState<AuthUser | null>(authUser || null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editLoading, setEditLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarPhotoUri, setAvatarPhotoUri] = useState<string | null>(null);
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [pantryModalVisible, setPantryModalVisible] = useState(false);
  const [editingPantry, setEditingPantry] = useState<Pantry | null>(null);
  const [pantryEditName, setPantryEditName] = useState("");
  const [pantryLoading, setPantryLoading] = useState(false);

  // Cargar datos del usuario y despensas
  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userData, userPantries] = await Promise.all([
        fetchCurrentUser(),
        getPantries().catch(() => [] as Pantry[]),
      ]);
      setUser(userData);
      setEditName(userData.name);
      setPantries(userPantries);
    } catch (error) {
      console.error("Error fetching user:", error);
      crossAlert("Error", "No se pudieron cargar los datos del usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleRenamePantry = async () => {
    if (!editingPantry || !pantryEditName.trim()) return;
    try {
      setPantryLoading(true);
      const updated = await updatePantry(editingPantry.id, { name: pantryEditName.trim() });
      setPantries((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setPantryModalVisible(false);
    } catch {
      crossAlert("Error", "No se pudo renombrar la despensa.");
    } finally {
      setPantryLoading(false);
    }
  };

  const handleDeletePantry = (pantry: Pantry) => {
    Alert.alert(
      "Eliminar despensa",
      `¿Eliminar "${pantry.name}"? Se borrarán todos sus productos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePantry(pantry.id);
              setPantries((prev) => prev.filter((p) => p.id !== pantry.id));
            } catch {
              crossAlert("Error", "No se pudo eliminar la despensa.");
            }
          },
        },
      ]
    );
  };

  const openRenameModal = (pantry: Pantry) => {
    setEditingPantry(pantry);
    setPantryEditName(pantry.name);
    setPantryModalVisible(true);
  };

  useEffect(() => {
    loadUserData();
    void (async () => {
      const savedAvatar = await getUserAvatar();
      const savedPhoto = await getUserAvatarPhoto();
      if (savedAvatar) setAvatar(savedAvatar);
      if (savedPhoto) setAvatarPhotoUri(savedPhoto);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  // Obtener iniciales (primera letra nombre + primera letra apellido)
  const getInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.split(" ").filter((n: string) => n.length > 0);
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  // Editar perfil
  const handleEditProfile = async () => {
    if (!editName.trim()) {
      crossAlert("Error", "El nombre no puede estar vacío");
      return;
    }

    try {
      setEditLoading(true);
      const updatedUser = await updateProfile({ name: editName.trim(), email: user?.email ?? "" });
      setUser(updatedUser);
      await refreshSession();
      setEditModalVisible(false);
      crossAlert("Perfil actualizado", "Tu nombre se ha actualizado correctamente.");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const message = error.response?.data?.message || "No se pudo actualizar el perfil";
      crossAlert("Error", message);
    } finally {
      setEditLoading(false);
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    const doSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error("Error logging out:", error);
        if (Platform.OS === "web") {
          window.alert("No se pudo cerrar sesión");
        } else {
          Alert.alert("Error", "No se pudo cerrar sesión");
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
        void doSignOut();
      }
    } else {
      Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas cerrar sesión?", [
        { text: "Cancelar", onPress: () => {} },
        { text: "Cerrar sesión", onPress: () => void doSignOut(), style: "destructive" },
      ]);
    }
  };

  const handleSelectAvatar = async (iconName: string) => {
    setAvatar(iconName);
    setAvatarPhotoUri(null);
    await clearUserAvatarPhoto();
    await saveUserAvatar(iconName);
    setAvatarModalVisible(false);
  };

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        crossAlert("Permiso requerido", "Necesitamos acceso a tu galería para seleccionar una foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const uri = result.assets[0].uri;
        setAvatarPhotoUri(uri);
        await saveUserAvatarPhoto(uri);
      }
    } catch (error) {
      console.error("Error selecting photo:", error);
      crossAlert("Error", "No se pudo seleccionar la foto.");
    }
  };

  const handleAvatarCirclePress = () => {
    if (Platform.OS === "web") {
      setAvatarModalVisible(true);
      return;
    }
    Alert.alert("Foto de perfil", "Elige cómo quieres personalizar tu perfil", [
      { text: "Cancelar", style: "cancel" },
      { text: "Elegir foto", onPress: () => void handlePickPhoto() },
      { text: "Elegir avatar", onPress: () => setAvatarModalVisible(true) },
      ...(avatarPhotoUri
        ? [{
            text: "Quitar foto",
            style: "destructive" as const,
            onPress: async () => {
              setAvatarPhotoUri(null);
              await clearUserAvatarPhoto();
            },
          }]
        : []),
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <Pressable onPress={handleAvatarCirclePress} style={[styles.avatar, shadows.md]}>
          {avatarPhotoUri ? (
            <Image source={{ uri: avatarPhotoUri }} style={styles.avatarImage} />
          ) : avatar ? (
            <MaterialCommunityIcons name={avatar as any} size={42} color={colors.white} />
          ) : (
            <Text style={styles.avatarText}>{getInitials()}</Text>
          )}
          <View style={styles.avatarEditBadge}>
            <MaterialCommunityIcons name="camera" size={14} color={colors.white} />
          </View>
        </Pressable>

        {/* User Info */}
        <View style={styles.userInfoSection}>
          <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
          <Text style={styles.userEmail}>{user?.email || "email@example.com"}</Text>
        </View>

        {/* Section: Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>

          {/* Editar Perfil */}
          <Pressable
            onPress={() => setEditModalVisible(true)}
            style={[styles.settingItem, shadows.sm]}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={24}
              color={colors.primary}
            />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Editar perfil</Text>
              <Text style={styles.settingSubtitle}>
                Actualiza tu nombre
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.subtext}
            />
          </Pressable>

          {/* Cambiar Contraseña */}
          <Pressable
            onPress={() =>
              navigation.navigate("ChangePassword")
            }
            style={[styles.settingItem, shadows.sm]}
          >
            <MaterialCommunityIcons
              name="lock"
              size={24}
              color={colors.primary}
            />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cambiar contraseña</Text>
              <Text style={styles.settingSubtitle}>
                Actualiza tu contraseña
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.subtext}
            />
          </Pressable>

          <Pressable
            onPress={() => setAvatarModalVisible(true)}
            style={[styles.settingItem, shadows.sm]}
          >
            <MaterialCommunityIcons
              name="account-circle"
              size={24}
              color={colors.primary}
            />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Elegir avatar</Text>
              <Text style={styles.settingSubtitle}>Personaliza tu perfil</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.subtext}
            />
          </Pressable>
        </View>

        {/* Section: Pantries */}
        {pantries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis despensas</Text>
            {pantries.map((pantry) => {
              const isOwner = pantry.user_id == null || pantry.user_id === user?.id;
              return (
                <View key={pantry.id} style={[styles.pantryItem, shadows.sm]}>
                  <MaterialCommunityIcons
                    name={isOwner ? "fridge-outline" : "fridge"}
                    size={22}
                    color={isOwner ? colors.primary : colors.subtext}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pantryName} numberOfLines={1}>{pantry.name}</Text>
                    {!isOwner && (
                      <Text style={styles.pantryGuestLabel}>Despensa compartida</Text>
                    )}
                  </View>
                  {isOwner && (
                    <>
                      <Pressable
                        onPress={() => openRenameModal(pantry)}
                        style={styles.pantryActionBtn}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeletePantry(pantry)}
                        style={styles.pantryActionBtn}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                      </Pressable>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.footer}>
        <PrimaryButton
            title="Cerrar sesión"
          onPress={handleLogout}
          variant="danger"
        />
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackground}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={[styles.modalContent, shadows.lg]}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre"
              placeholderTextColor={colors.subtext}
              value={editName}
              onChangeText={setEditName}
              editable={!editLoading}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                disabled={editLoading}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleEditProfile}
                disabled={editLoading}
                style={[styles.modalButton, styles.modalButtonSave]}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rename Pantry Modal */}
      <Modal
        visible={pantryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPantryModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackground} onPress={() => setPantryModalVisible(false)} />
          <View style={[styles.modalContent, shadows.lg]}>
            <Text style={styles.modalTitle}>Renombrar despensa</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre de la despensa"
              placeholderTextColor={colors.subtext}
              value={pantryEditName}
              onChangeText={setPantryEditName}
              editable={!pantryLoading}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setPantryModalVisible(false)}
                disabled={pantryLoading}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleRenamePantry}
                disabled={pantryLoading}
                style={[styles.modalButton, styles.modalButtonSave]}
              >
                {pantryLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackground}
            onPress={() => setAvatarModalVisible(false)}
          />
          <View style={[styles.modalContent, shadows.lg]}>
            <Text style={styles.modalTitle}>Elige un avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((iconName) => (
                <Pressable
                  key={iconName}
                  onPress={() => handleSelectAvatar(iconName)}
                  style={[
                    styles.avatarOption,
                    avatar === iconName && styles.avatarOptionActive,
                  ]}
                >
                  <MaterialCommunityIcons name={iconName as any} size={28} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  avatarText: {
    ...typography.h1,
    color: colors.white,
    fontWeight: "700",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  userInfoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  userEmail: {
    ...typography.body,
    color: colors.subtext,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  settingItem: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
  },
  spacer: {
    height: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonCancelText: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonSaveText: {
    ...typography.bodySm,
    color: colors.white,
    fontWeight: "600",
  },
  pantryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  pantryName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  pantryActionBtn: {
    padding: spacing.xs,
  },
  pantryGuestLabel: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  avatarOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
});