import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Alert,
  TextInput,
  Modal,
  Share,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import {
  getPantries,
  getPantry,
  createPantry,
  deleteItem as deleteItemApi,
  sharePantry,
  joinSharedPantry,
  getPantryMembers,
  type Pantry,
  type PantryItem,
  type PantryMember,
} from "@/api/pantries";
import {
  requestNotificationPermission,
  scheduleExpiryNotifications,
} from "@/services/notificationService";
import { loadProductImages } from "@/services/productImages";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;

type LocationFilter = "all" | "refrigerator" | "freezer" | "pantry" | "other";
type ExpiryFilter = "all" | "normal" | "proximo" | "caducado";

// Fuera del componente para evitar recreación y problemas de cierre
function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parseamos solo la parte de fecha (YYYY-MM-DD) como hora local
  // para evitar el problema de UTC vs local con new Date("YYYY-MM-DD")
  const datePart = (expiryDate || "").split("T")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return 0;
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(expiryDate: string): "normal" | "proximo" | "caducado" {
  const days = getDaysUntilExpiry(expiryDate);
  if (days < 0) return "caducado";
  if (days < 7) return "proximo";
  return "normal";
}

const LOCATION_OPTIONS: { label: string; value: LocationFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Nevera", value: "refrigerator" },
  { label: "Congelador", value: "freezer" },
  { label: "Armario", value: "pantry" },
  { label: "Otro", value: "other" },
];

const LOCATION_DISPLAY: Record<string, string> = {
  refrigerator: "Nevera",
  freezer: "Congelador",
  pantry: "Armario",
  other: "Otro",
};

const EXPIRY_CARD_CONFIG = {
  normal:   { label: "Normales",  icon: "check-circle-outline" as const, color: "#27AE60", lightBg: "#EAF7EE" },
  proximo:  { label: "Próximos",  icon: "clock-alert-outline"  as const, color: "#E67E22", lightBg: "#FEF5E7" },
  caducado: { label: "Caducados", icon: "alert-circle-outline" as const, color: "#E74C3C", lightBg: "#FDEDEC" },
};

export function PantriesScreen() {
  const navigation = useNavigation<Navigation>();

  const [allPantries, setAllPantries] = useState<Pantry[]>([]);
  const [pantry, setPantry] = useState<Pantry | null>(null);
  const [allItems, setAllItems] = useState<PantryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingPantry, setSwitchingPantry] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const selectedPantryIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>("all");
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryFilter>("all");

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPantryName, setNewPantryName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [expirySummary, setExpirySummary] = useState({ normal: 0, proximo: 0, caducado: 0 });
  const [localImages, setLocalImages] = useState<Record<string, string>>({});
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [pantryMembers, setPantryMembers] = useState<PantryMember[]>([]);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadPantries = async (silent = false, preferredPantryId?: string) => {
    try {
      if (!silent) setLoading(true);
      const pantries = await getPantries();

      if (pantries && pantries.length > 0) {
        setAllPantries(pantries);
        const targetId =
          preferredPantryId && pantries.find((p) => p.id === preferredPantryId)
            ? preferredPantryId
            : selectedPantryIdRef.current && pantries.find((p) => p.id === selectedPantryIdRef.current)
            ? selectedPantryIdRef.current!
            : pantries[0].id;
        const fullPantry = await getPantry(targetId);
        selectedPantryIdRef.current = fullPantry.id;
        setPantry(fullPantry);
        const items = fullPantry.items || [];
        setAllItems(items);
        scheduleExpiryNotifications(items).catch(() => {});
        loadProductImages(items.map((i) => i.product.id))
          .then(setLocalImages)
          .catch(() => {});
      } else if (!silent) {
        setAllPantries([]);
        setPantry(null);
        setAllItems([]);
      }
    } catch (error) {
      console.error("Error loading pantries:", error);
      if (!silent) Alert.alert("Error", "No se pudieron cargar las despensas");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const switchPantry = async (pantryId: string) => {
    if (pantryId === selectedPantryIdRef.current || switchingPantry) return;
    try {
      setSwitchingPantry(true);
      const fullPantry = await getPantry(pantryId);
      selectedPantryIdRef.current = fullPantry.id;
      setPantry(fullPantry);
      setAllItems(fullPantry.items || []);
      setSearchQuery("");
      setSelectedLocation("all");
      setSelectedExpiry("all");
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar la despensa");
    } finally {
      setSwitchingPantry(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPantries(false, selectedPantryIdRef.current ?? undefined);
    setRefreshing(false);
  };

  useEffect(() => {
    // Paso 1: filtrar por búsqueda y ubicación
    let base = allItems;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      base = base.filter((item) =>
        item.product.name.toLowerCase().includes(query)
      );
    }
    if (selectedLocation !== "all") {
      base = base.filter((item) => item.location === selectedLocation);
    }

    // El resumen refleja exactamente los mismos items que se muestran al hacer clic
    setExpirySummary(
      base.reduce(
        (acc, item) => { acc[getExpiryStatus(item.expiry_date)] += 1; return acc; },
        { normal: 0, proximo: 0, caducado: 0 }
      )
    );

    // Paso 2: filtrar por caducidad y ordenar
    let filtered = base;
    if (selectedExpiry !== "all") {
      filtered = filtered.filter(
        (item) => getExpiryStatus(item.expiry_date) === selectedExpiry
      );
    }
    filtered = [...filtered].sort(
      (a, b) => getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date)
    );
    setFilteredItems(filtered);
  }, [allItems, searchQuery, selectedLocation, selectedExpiry]);

  const initialLoadDone = useRef(false);

  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        loadPantries();
      } else {
        loadPantries(true);
      }
    }, [])
  );

  const closestExpiry = useMemo(() => {
    if (!allItems.length) return null;
    return [...allItems].sort(
      (a, b) => getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date)
    )[0];
  }, [allItems]);

  const handleCreatePantry = async () => {
    const name = newPantryName.trim();
    if (!name) {
      Alert.alert("Error", "El nombre de la despensa es obligatorio.");
      return;
    }
    try {
      setCreateLoading(true);
      const newPantry = await createPantry({ name });
      setCreateModalVisible(false);
      setNewPantryName("");
      await loadPantries(false, newPantry.id);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "No se pudo crear la despensa.";
      Alert.alert("Error", msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenShareModal = async () => {
    setShareToken(null);
    setJoinCode("");
    setJoinError(null);
    setPantryMembers([]);
    setShareModalVisible(true);
    if (!pantry) return;
    try {
      setShareLoading(true);
      const [result, members] = await Promise.all([
        sharePantry(pantry.id),
        getPantryMembers(pantry.id),
      ]);
      setShareToken(result.token ?? result.share_url ?? null);
      setPantryMembers(members);
    } catch (e) {
      setShareToken(null);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyOrShare = async () => {
    if (!shareToken) return;
    const shareUrl = shareToken.startsWith("http")
      ? shareToken
      : `https://nutricasa.duckdns.org/pantry/shared/${shareToken}`;
    if (Platform.OS === "web") {
      try { await navigator.clipboard.writeText(shareUrl); alert("Enlace copiado al portapapeles."); } catch { alert(shareUrl); }
    } else {
      await Share.share({ message: `Únete a mi despensa en NutriCasa: ${shareUrl}`, url: shareUrl });
    }
  };

  const handleJoin = async () => {
    let code = joinCode.trim();
    if (!code) { setJoinError("Introduce el código o enlace de invitación."); return; }

    // Si pegan un enlace completo, extraer solo el token
    const urlMatch = code.match(/\/pantry\/shared\/([^/?#]+)/);
    if (urlMatch) code = urlMatch[1];

    try {
      setJoinLoading(true);
      setJoinError(null);
      await joinSharedPantry(code);
      setShareModalVisible(false);
      setJoinModalVisible(false);
      setJoinCode("");
      await loadPantries();
    } catch (e: any) {
      setJoinError(e?.response?.data?.message ?? "Código no válido o expirado.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDeleteItem = (item: PantryItem) => {
    if (!pantry) return;

    Alert.alert(
      "Eliminar producto",
      `¿Estás seguro de que deseas eliminar ${item.product.name}?`,
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteItemApi(pantry.id, item.id);
              setAllItems(allItems.filter((i) => i.id !== item.id));
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "No se pudo eliminar el producto");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleEditItem = (item: PantryItem) => {
    if (!pantry) return;
    navigation.navigate("Products", {
      pantryId: pantry.id,
      itemId: item.id,
      mode: "edit",
      item,
    });
  };

  const handleAddItem = () => {
    if (!pantry) return;
    navigation.navigate("Products", {
      pantryId: pantry.id,
      mode: "add",
    });
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

  if (!pantry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Despensa</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.createContainer}>
          <MaterialCommunityIcons name="fridge-outline" size={72} color={colors.primary} style={{ marginBottom: spacing.xl }} />
          <Text style={styles.createTitle}>Crea tu primera despensa</Text>
          <Text style={styles.createSubtitle}>
            Organiza tus productos, controla las caducidades y compártela con quien quieras.
          </Text>
          <Pressable onPress={() => setCreateModalVisible(true)} style={styles.createButton}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            <Text style={styles.createButtonText}>Crear despensa</Text>
          </Pressable>
          <Pressable onPress={() => { setJoinCode(""); setJoinError(null); setJoinModalVisible(true); }} style={styles.joinPantryButton}>
            <MaterialCommunityIcons name="link-variant" size={18} color={colors.primary} />
            <Text style={styles.joinPantryButtonText}>Unirme con código o enlace</Text>
          </Pressable>
        </View>

        {/* Modal crear despensa */}
        <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nueva despensa</Text>
              <TextInput
                style={styles.joinInput}
                placeholder="Nombre (ej: Casa, Oficina...)"
                placeholderTextColor={colors.subtext}
                value={newPantryName}
                onChangeText={setNewPantryName}
                autoFocus
                maxLength={60}
              />
              <Pressable onPress={handleCreatePantry} disabled={createLoading} style={styles.joinButton}>
                {createLoading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.joinButtonText}>Crear</Text>}
              </Pressable>
              <Pressable onPress={() => setCreateModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>Cancelar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal unirse con código o enlace */}
        <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setJoinModalVisible(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Unirme a una despensa</Text>
              <Text style={styles.modalDesc}>Introduce el código de invitación o pega el enlace que te han compartido.</Text>
              <TextInput
                style={styles.joinInput}
                placeholder="Código o enlace de invitación"
                placeholderTextColor={colors.subtext}
                value={joinCode}
                onChangeText={(t) => { setJoinCode(t); setJoinError(null); }}
                autoCapitalize="none"
                autoFocus
              />
              {joinError && <Text style={styles.joinError}>{joinError}</Text>}
              <Pressable onPress={handleJoin} disabled={joinLoading} style={styles.joinButton}>
                {joinLoading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.joinButtonText}>Unirme</Text>}
              </Pressable>
              <Pressable onPress={() => setJoinModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>Cancelar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{pantry.name}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleOpenShareModal} style={styles.shareButton}>
            <MaterialCommunityIcons name="account-plus" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={handleAddItem} style={styles.addButton}>
            <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Selector de despensas */}
            {allPantries.length > 0 && (
              <View style={styles.pantrySelectorRow}>
                <FlatList
                  horizontal
                  data={allPantries}
                  keyExtractor={(p) => p.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pantrySelectorContent}
                  renderItem={({ item: p }) => (
                    <Pressable
                      onPress={() => switchPantry(p.id)}
                      style={[
                        styles.pantryChip,
                        p.id === selectedPantryIdRef.current && styles.pantryChipActive,
                        switchingPantry && styles.pantryChipDisabled,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={13}
                        color={p.id === selectedPantryIdRef.current ? colors.white : colors.primary}
                      />
                      <Text
                        style={[styles.pantryChipText, p.id === selectedPantryIdRef.current && styles.pantryChipTextActive]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                    </Pressable>
                  )}
                  ListFooterComponent={
                    <Pressable onPress={() => setCreateModalVisible(true)} style={styles.pantryChipNew}>
                      <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
                      <Text style={styles.pantryChipText}>Nueva</Text>
                    </Pressable>
                  }
                />
              </View>
            )}

            {/* Búsqueda */}
            <View style={[styles.searchBox, shadows.sm]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.subtext} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar productos..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.subtext}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.subtext} />
                </Pressable>
              )}
            </View>

            {/* Filtro de ubicación */}
            <FlatList
              horizontal
              data={LOCATION_OPTIONS}
              keyExtractor={(item) => item.value}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.locationFilterContent}
              style={styles.locationFilterRow}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedLocation(item.value)}
                  style={[styles.filterChip, selectedLocation === item.value && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selectedLocation === item.value && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />

            {/* Tarjetas de caducidad — toca para filtrar, toca de nuevo para quitar */}
            <View style={styles.expiryCardsRow}>
              {(["normal", "proximo", "caducado"] as const).map((key) => {
                const cfg = EXPIRY_CARD_CONFIG[key];
                const count = expirySummary[key];
                const active = selectedExpiry === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedExpiry(active ? "all" : key)}
                    style={[
                      styles.expiryCard,
                      { borderColor: cfg.color, backgroundColor: active ? cfg.color : cfg.lightBg },
                    ]}
                  >
                    <MaterialCommunityIcons name={cfg.icon} size={22} color={active ? "#fff" : cfg.color} />
                    <Text style={[styles.expiryCardCount, { color: active ? "#fff" : cfg.color }]}>{count}</Text>
                    <Text style={[styles.expiryCardLabel, { color: active ? "rgba(255,255,255,0.85)" : colors.subtext }]}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Próximo a caducar */}
            {closestExpiry && (
              <View style={styles.closestCard}>
                <MaterialCommunityIcons
                  name={getExpiryStatus(closestExpiry.expiry_date) === "caducado" ? "alert-circle" : "clock-alert"}
                  size={22}
                  color={getExpiryStatus(closestExpiry.expiry_date) === "caducado" ? colors.error : "#E67E22"}
                />
                <View style={styles.closestText}>
                  <Text style={styles.closestTitle}>Más próximo a caducar</Text>
                  <Text style={styles.closestSubtitle}>
                    {closestExpiry.product.name} · {new Date(closestExpiry.expiry_date).toLocaleDateString("es-ES")}
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="package-outline"
              title="Sin productos"
              subtitle={
                searchQuery || selectedLocation !== "all" || selectedExpiry !== "all"
                  ? "No hay productos con estos filtros"
                  : "Añade el primer producto a tu despensa"
              }
              button={{ label: "Añadir producto", onPress: handleAddItem }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <ProductCard
              name={item.product.name}
              brand={item.product.brand}
              quantity={item.quantity}
              unit={item.unit}
              location={LOCATION_DISPLAY[item.location] || item.location}
              expiryDate={item.expiry_date}
              status={getExpiryStatus(item.expiry_date)}
              imageUrl={localImages[item.product.id] || item.product.image_url}
              addedBy={item.added_by?.name}
              onEdit={() => handleEditItem(item)}
              onDelete={() => handleDeleteItem(item)}
            />
          </View>
        )}
      />
      {/* Modal compartir despensa */}
      <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShareModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Compartir despensa</Text>

            {/* Sección: compartir */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Invita a alguien</Text>
              <Text style={styles.modalDesc}>Comparte este enlace con la persona que quieras añadir a tu despensa.</Text>
              {shareLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : shareToken ? (
                <>
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenText} numberOfLines={2}>
                      {shareToken.startsWith("http") ? shareToken : `https://nutricasa.duckdns.org/pantry/shared/${shareToken}`}
                    </Text>
                  </View>
                  <Pressable onPress={handleCopyOrShare} style={styles.copyButton}>
                    <MaterialCommunityIcons name="share-variant" size={18} color={colors.white} />
                    <Text style={styles.copyButtonText}>
                      {Platform.OS === "web" ? "Copiar enlace" : "Compartir enlace"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.modalDesc}>No se pudo generar el enlace.</Text>
              )}
            </View>

            {/* Sección: miembros */}
            {pantryMembers.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Miembros ({pantryMembers.length})
                  </Text>
                  {pantryMembers.map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <MaterialCommunityIcons
                          name={m.role === "owner" ? "shield-account" : "account"}
                          size={16}
                          color={colors.white}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberEmail}>{m.email}</Text>
                      </View>
                      <Text style={styles.memberRoleBadge}>
                        {m.role === "owner" ? "Propietario" : "Invitado"}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Divisor */}
            <View style={styles.divider} />

            {/* Sección: unirse */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Unirse a una despensa</Text>
              <Text style={styles.modalDesc}>Introduce el código o pega el enlace de invitación.</Text>
              <TextInput
                style={styles.joinInput}
                placeholder="Código o enlace de invitación"
                placeholderTextColor={colors.subtext}
                value={joinCode}
                onChangeText={(t) => { setJoinCode(t); setJoinError(null); }}
                autoCapitalize="none"
              />
              {joinError && <Text style={styles.joinError}>{joinError}</Text>}
              <Pressable onPress={handleJoin} disabled={joinLoading} style={styles.joinButton}>
                {joinLoading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.joinButtonText}>Unirse</Text>}
              </Pressable>
            </View>

            <Pressable onPress={() => setShareModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal crear nueva despensa (desde el selector de chips) */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva despensa</Text>
            <TextInput
              style={styles.joinInput}
              placeholder="Nombre (ej: Casa, Oficina...)"
              placeholderTextColor={colors.subtext}
              value={newPantryName}
              onChangeText={setNewPantryName}
              autoFocus
              maxLength={60}
            />
            <Pressable onPress={handleCreatePantry} disabled={createLoading} style={styles.joinButton}>
              {createLoading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.joinButtonText}>Crear</Text>}
            </Pressable>
            <Pressable onPress={() => setCreateModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </Pressable>
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
  createContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  createTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  createSubtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700",
  },
  joinPantryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  joinPantryButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  modalDesc: {
    ...typography.bodySm,
    color: colors.subtext,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  locationFilterRow: {
    marginBottom: spacing.md,
  },
  locationFilterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySm,
    color: colors.primary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  expiryCardsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  expiryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  expiryCardCount: {
    ...typography.h2,
    fontWeight: "700",
  },
  expiryCardLabel: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  closestCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  closestText: {
    flex: 1,
  },
  closestTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  closestSubtitle: {
    ...typography.bodySm,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  itemWrapper: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: "88%",
    maxWidth: 420,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalDesc: {
    ...typography.bodySm,
    color: colors.subtext,
    marginBottom: spacing.md,
  },
  tokenBox: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tokenText: {
    ...typography.bodySm,
    color: colors.text,
    fontFamily: "monospace",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  copyButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
  },
  memberEmail: {
    ...typography.caption,
    color: colors.subtext,
  },
  memberRoleBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  joinInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  joinError: {
    ...typography.bodySm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  joinButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700",
  },
  modalClose: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  modalCloseText: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "600",
  },
  pantrySelectorRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  pantrySelectorContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pantryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  pantryChipActive: {
    backgroundColor: colors.primary,
  },
  pantryChipDisabled: {
    opacity: 0.5,
  },
  pantryChipNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    backgroundColor: colors.white,
  },
  pantryChipText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },
  pantryChipTextActive: {
    color: colors.white,
  },
});