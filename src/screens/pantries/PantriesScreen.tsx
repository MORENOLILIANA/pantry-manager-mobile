import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
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
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import {
  getPantries, getPantry, createPantry,
  deleteItem as deleteItemApi, sharePantry, joinSharedPantry, getPantryMembers,
  type Pantry, type PantryItem, type PantryMember,
} from "@/api/pantries";
import { requestNotificationPermission, scheduleExpiryNotifications } from "@/services/notificationService";
import { loadProductImages } from "@/services/productImages";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;
type ViewMode = "all" | "location" | "category" | "expiry";

type FlatEntry =
  | { _type: "header"; key: string; label: string; icon: string; color: string; count: number }
  | { _type: "item";   key: string; item: PantryItem };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
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

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCATION_DISPLAY: Record<string, string> = {
  refrigerator: "Nevera", freezer: "Congelador", pantry: "Armario", other: "Otro",
};

const LOCATION_GROUP: Record<string, { label: string; icon: string; color: string }> = {
  refrigerator: { label: "Nevera",     icon: "fridge-outline",       color: "#3498DB" },
  freezer:      { label: "Congelador", icon: "snowflake",             color: "#5DADE2" },
  pantry:       { label: "Armario",    icon: "archive-outline",       color: "#F39C12" },
  other:        { label: "Otro",       icon: "map-marker-outline",    color: "#95A5A6" },
};
const LOCATION_ORDER_GROUP = ["refrigerator", "freezer", "pantry", "other"];

const EXPIRY_GROUP: Record<string, { label: string; icon: string; color: string }> = {
  caducado: { label: "Caducados",           icon: "alert-circle-outline",  color: "#E74C3C" },
  proximo:  { label: "Próximos a caducar",  icon: "clock-alert-outline",   color: "#E67E22" },
  normal:   { label: "En buen estado",      icon: "check-circle-outline",  color: "#27AE60" },
};
const EXPIRY_ORDER_GROUP = ["caducado", "proximo", "normal"];

const VIEW_MODES = [
  { key: "all",      label: "Todos",     icon: "format-list-bulleted" },
  { key: "expiry",   label: "Caducidad", icon: "clock-outline"        },
  { key: "category", label: "Categoría", icon: "tag-multiple-outline" },
  { key: "location", label: "Ubicación", icon: "map-marker-outline"   },
] as const;

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  lacteos:      { label: "Lácteos",           icon: "cup",            color: "#3498DB" },
  carnes:       { label: "Carnes y pescados",  icon: "food-drumstick", color: "#E74C3C" },
  frutas:       { label: "Frutas y verduras",  icon: "food-apple",     color: "#27AE60" },
  cereales:     { label: "Cereales y pasta",   icon: "bread-slice",    color: "#F39C12" },
  bebidas:      { label: "Bebidas",            icon: "bottle-wine",    color: "#8E44AD" },
  conservas:    { label: "Conservas",          icon: "archive",        color: "#E67E22" },
  congelados:   { label: "Congelados",         icon: "snowflake",      color: "#5DADE2" },
  frutos_secos: { label: "Frutos secos",       icon: "food-variant",   color: "#8B6914" },
  limpieza:     { label: "Limpieza",           icon: "broom",          color: "#1ABC9C" },
  higiene:      { label: "Higiene",            icon: "shower",         color: "#9B59B6" },
  otros:        { label: "Otros",              icon: "tag-outline",    color: "#95A5A6" },
};

const CATEGORY_ORDER = [
  "lacteos","carnes","frutas","cereales","bebidas",
  "conservas","congelados","frutos_secos","limpieza","higiene","otros",
];

function normalizeCategory(raw?: string): string {
  if (!raw) return "otros";
  const s = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(lact|leche|queso|yogur|nata|mantequilla)/.test(s)) return "lacteos";
  if (/(carne|pollo|cerdo|ternera|pesc|mariscos|jamon|embutid|salchich|fiambre)/.test(s)) return "carnes";
  if (/(fruta|verdura|vegetal|legumbre|hortaliza|ensalada)/.test(s)) return "frutas";
  if (/(cereal|pasta|arroz|pan|harina|galleta|avena)/.test(s)) return "cereales";
  if (/(bebida|zumo|agua|refresc|cafe|te\b|vino|cerveza|batido)/.test(s)) return "bebidas";
  if (/(conserva|lata|bote|enlatad)/.test(s)) return "conservas";
  if (/congelad/.test(s)) return "congelados";
  if (/(fruto.seco|nuez|almendra|pistacho|anacardo|avellana|cacahuete|pipa)/.test(s)) return "frutos_secos";
  if (/(limpiez|detergente|jabón|jabon|suavizante|limpiad|fregasuelos|lejia|bayeta)/.test(s)) return "limpieza";
  if (/(higiene|champu|gel de|pasta diente|higienico|desodorante|colonia)/.test(s)) return "higiene";
  return "otros";
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function PantriesScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<PantriesStackParamList, "Pantries">>();

  const [allPantries,  setAllPantries]  = useState<Pantry[]>([]);
  const [pantry,       setPantry]       = useState<Pantry | null>(null);
  const [allItems,     setAllItems]     = useState<PantryItem[]>([]);
  const [filteredItems,setFilteredItems]= useState<PantryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [switchingPantry, setSwitchingPantry] = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const selectedPantryIdRef = useRef<string | null>(null);

  const [searchQuery,         setSearchQuery]         = useState("");
  const [viewMode,            setViewMode]            = useState<ViewMode>(route.params?.viewMode ?? "all");
  const [collapsedSections,   setCollapsedSections]   = useState<Set<string>>(new Set());

  const [localImages,       setLocalImages]       = useState<Record<string, string>>({});
  const [createModalVisible,setCreateModalVisible]= useState(false);
  const [newPantryName,     setNewPantryName]     = useState("");
  const [createLoading,     setCreateLoading]     = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareToken,        setShareToken]        = useState<string | null>(null);
  const [shareLoading,      setShareLoading]      = useState(false);
  const [pantryMembers,     setPantryMembers]     = useState<PantryMember[]>([]);
  const [joinCode,          setJoinCode]          = useState("");
  const [joinLoading,       setJoinLoading]       = useState(false);
  const [joinError,         setJoinError]         = useState<string | null>(null);
  const [joinModalVisible,  setJoinModalVisible]  = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadPantries = async (silent = false, preferredPantryId?: string) => {
    try {
      if (!silent) setLoading(true);
      const pantries = await getPantries();
      if (pantries && pantries.length > 0) {
        setAllPantries(pantries);
        const targetId =
          preferredPantryId && pantries.find((p) => p.id === preferredPantryId) ? preferredPantryId
          : selectedPantryIdRef.current && pantries.find((p) => p.id === selectedPantryIdRef.current) ? selectedPantryIdRef.current!
          : pantries[0].id;
        const fullPantry = await getPantry(targetId);
        selectedPantryIdRef.current = fullPantry.id;
        setPantry(fullPantry);
        const items = fullPantry.items || [];
        setAllItems(items);
        scheduleExpiryNotifications(items).catch(() => {});
        loadProductImages(items.map((i) => i.product.id)).then(setLocalImages).catch(() => {});
      } else if (!silent) {
        setAllPantries([]); setPantry(null); setAllItems([]);
      }
    } catch {
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
    } catch { Alert.alert("Error", "No se pudo cargar la despensa"); }
    finally { setSwitchingPantry(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPantries(true, selectedPantryIdRef.current ?? undefined);
    setRefreshing(false);
  };

  // ── List data ─────────────────────────────────────────────────────────────

  const initialLoadDone = useRef(false);

  useEffect(() => {
    const updated = route.params?._updatedItem;
    if (!updated) return;
    setAllItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    navigation.setParams({ _updatedItem: undefined });
  }, [route.params?._updatedItem]);

  useEffect(() => {
    if (route.params?.viewMode) {
      setViewMode(route.params.viewMode);
      navigation.setParams({ viewMode: undefined });
    }
  }, [route.params?.viewMode]);

  useEffect(() => { requestNotificationPermission().catch(() => {}); }, []);

  useFocusEffect(useCallback(() => {
    if (!initialLoadDone.current) { initialLoadDone.current = true; loadPantries(); }
    else { loadPantries(true, selectedPantryIdRef.current ?? undefined); }
  }, []));

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  useEffect(() => { setCollapsedSections(new Set()); }, [viewMode]);

  // ── Memos ─────────────────────────────────────────────────────────────────

  const closestExpiry = useMemo(() => {
    if (!allItems.length) return null;
    return [...allItems].sort((a, b) => getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date))[0];
  }, [allItems]);

  const listData = useMemo((): FlatEntry[] => {
    let base = allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter((i) => i.product.name.toLowerCase().includes(q));
    }
    const sorted = [...base].sort((a, b) => getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date));

    if (viewMode === "all") {
      return sorted.map((item) => ({ _type: "item", key: item.id, item }));
    }

    const group = (
      keyFn: (i: PantryItem) => string,
      order: string[],
      config: Record<string, { label: string; icon: string; color: string }>
    ): FlatEntry[] => {
      const groups = new Map<string, PantryItem[]>();
      for (const item of sorted) {
        const k = keyFn(item);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(item);
      }
      const result: FlatEntry[] = [];
      for (const key of order) {
        const items = groups.get(key);
        if (!items?.length) continue;
        const cfg = config[key];
        const headerKey = `h-${key}`;
        result.push({ _type: "header", key: headerKey, label: cfg.label, icon: cfg.icon, color: cfg.color, count: items.length });
        if (!collapsedSections.has(headerKey)) {
          items.forEach((item) => result.push({ _type: "item", key: `i-${item.id}`, item }));
        }
      }
      return result;
    };

    if (viewMode === "category") return group((i) => normalizeCategory(i.product.category), CATEGORY_ORDER, CATEGORY_CONFIG);
    if (viewMode === "location") return group((i) => i.location || "other", LOCATION_ORDER_GROUP, LOCATION_GROUP);
    if (viewMode === "expiry")   return group((i) => getExpiryStatus(i.expiry_date), EXPIRY_ORDER_GROUP, EXPIRY_GROUP);
    return [];
  }, [allItems, searchQuery, viewMode, collapsedSections]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreatePantry = async () => {
    const name = newPantryName.trim();
    if (!name) { Alert.alert("Error", "El nombre de la despensa es obligatorio."); return; }
    try {
      setCreateLoading(true);
      const newPantry = await createPantry({ name });
      setCreateModalVisible(false); setNewPantryName("");
      await loadPantries(false, newPantry.id);
    } catch (e: any) { Alert.alert("Error", e?.response?.data?.message ?? "No se pudo crear la despensa."); }
    finally { setCreateLoading(false); }
  };

  const handleOpenShareModal = async () => {
    setShareToken(null); setJoinCode(""); setJoinError(null); setPantryMembers([]);
    setShareModalVisible(true);
    if (!pantry) return;
    try {
      setShareLoading(true);
      const [result, members] = await Promise.all([sharePantry(pantry.id), getPantryMembers(pantry.id)]);
      setShareToken(result.token ?? result.share_url ?? null); setPantryMembers(members);
    } catch { setShareToken(null); }
    finally { setShareLoading(false); }
  };

  const handleCopyOrShare = async () => {
    if (!shareToken) return;
    const token = shareToken.replace(/^.*\//, "");
    const httpsUrl = `https://nutricasa.duckdns.org/join/${token}`;
    const message = `Te invito a unirte a mi despensa en La Despensa 🏠\n\nToca el enlace para unirte:\n${httpsUrl}`;
    if (Platform.OS === "web") {
      try { await (globalThis as any).navigator.clipboard.writeText(httpsUrl); (globalThis as any).alert("Enlace copiado."); } catch { (globalThis as any).alert(httpsUrl); }
    } else {
      await Share.share({ message });
    }
  };

  const handleJoin = async () => {
    let code = joinCode.trim();
    if (!code) { setJoinError("Introduce el código o enlace de invitación."); return; }
    const m = code.match(/\/pantry\/shared\/([^/?#]+)/);
    if (m) code = m[1];
    try {
      setJoinLoading(true); setJoinError(null);
      await joinSharedPantry(code);
      setShareModalVisible(false); setJoinModalVisible(false); setJoinCode("");
      await loadPantries();
    } catch (e: any) { setJoinError(e?.response?.data?.message ?? "Código no válido o expirado."); }
    finally { setJoinLoading(false); }
  };

  const handleDeleteItem = (item: PantryItem) => {
    if (!pantry) return;
    Alert.alert("Eliminar producto", `¿Eliminar ${item.product.name}?`, [
      { text: "Cancelar" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try { await deleteItemApi(pantry.id, item.id); setAllItems(allItems.filter((i) => i.id !== item.id)); }
        catch { Alert.alert("Error", "No se pudo eliminar el producto"); }
      }},
    ]);
  };

  const handleEditItem = (item: PantryItem) => {
    if (!pantry) return;
    navigation.navigate("Products", { pantryId: pantry.id, itemId: item.id, mode: "edit", item });
  };

  const handleAddItem = () => {
    if (!pantry) return;
    navigation.navigate("Products", { pantryId: pantry.id, mode: "add" });
  };

  // ── Loading / empty ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}><ActivityIndicator size="large" color={colors.primary} /></View>
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
          <Text style={styles.createSubtitle}>Organiza tus productos, controla las caducidades y compártela con quien quieras.</Text>
          <Pressable onPress={() => setCreateModalVisible(true)} style={styles.createButton}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            <Text style={styles.createButtonText}>Crear despensa</Text>
          </Pressable>
          <Pressable onPress={() => { setJoinCode(""); setJoinError(null); setJoinModalVisible(true); }} style={styles.joinPantryButton}>
            <MaterialCommunityIcons name="link-variant" size={18} color={colors.primary} />
            <Text style={styles.joinPantryButtonText}>Unirme con código o enlace</Text>
          </Pressable>
        </View>

        <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nueva despensa</Text>
              <TextInput style={styles.joinInput} placeholder="Nombre (ej: Casa, Oficina...)" placeholderTextColor={colors.subtext} value={newPantryName} onChangeText={setNewPantryName} autoFocus maxLength={60} />
              <Pressable onPress={handleCreatePantry} disabled={createLoading} style={styles.joinButton}>
                {createLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.joinButtonText}>Crear</Text>}
              </Pressable>
              <Pressable onPress={() => setCreateModalVisible(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Cancelar</Text></Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setJoinModalVisible(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Unirme a una despensa</Text>
              <Text style={styles.modalDesc}>Introduce el código de invitación o pega el enlace.</Text>
              <TextInput style={styles.joinInput} placeholder="Código o enlace de invitación" placeholderTextColor={colors.subtext} value={joinCode} onChangeText={(t) => { setJoinCode(t); setJoinError(null); }} autoCapitalize="none" autoFocus />
              {joinError && <Text style={styles.joinError}>{joinError}</Text>}
              <Pressable onPress={handleJoin} disabled={joinLoading} style={styles.joinButton}>
                {joinLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.joinButtonText}>Unirme</Text>}
              </Pressable>
              <Pressable onPress={() => setJoinModalVisible(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Cancelar</Text></Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

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

      {/* Selector de despensas */}
      {allPantries.length > 0 && (
        <View style={styles.pantrySelectorRow}>
          <FlatList
            horizontal data={allPantries} keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pantrySelectorContent}
            renderItem={({ item: p }) => (
              <Pressable onPress={() => switchPantry(p.id)} style={[styles.pantryChip, p.id === selectedPantryIdRef.current && styles.pantryChipActive, switchingPantry && styles.pantryChipDisabled]}>
                <MaterialCommunityIcons name="package-variant" size={13} color={p.id === selectedPantryIdRef.current ? colors.white : colors.primary} />
                <Text style={[styles.pantryChipText, p.id === selectedPantryIdRef.current && styles.pantryChipTextActive]} numberOfLines={1}>{p.name}</Text>
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

      {/* Toggle de vista — misma estructura que el selector de despensas */}
      <View style={styles.pantrySelectorRow}>
        <FlatList
          horizontal
          data={VIEW_MODES as unknown as any[]}
          keyExtractor={(m: any) => m.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pantrySelectorContent}
          renderItem={({ item: m }: { item: typeof VIEW_MODES[number] }) => {
            const active = viewMode === m.key;
            return (
              <Pressable
                onPress={() => setViewMode(m.key as ViewMode)}
                style={[styles.pantryChip, active && styles.pantryChipActive]}
              >
                <MaterialCommunityIcons name={m.icon as any} size={13} color={active ? colors.white : colors.primary} />
                <Text style={[styles.pantryChipText, active && styles.pantryChipTextActive]}>{m.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Buscador */}
      <View style={[styles.searchBox, shadows.sm]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.subtext} />
        <TextInput
          style={styles.searchInput} placeholder="Buscar productos..."
          value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.subtext}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.subtext} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={listData as any}
        keyExtractor={(entry: any) => entry.key}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          viewMode === "all" && closestExpiry ? (
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
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="package-outline" title="Sin productos"
              subtitle={searchQuery ? "No hay productos con esta búsqueda" : "Añade el primer producto a tu despensa"}
              button={{ label: "Añadir producto", onPress: handleAddItem }}
            />
          </View>
        }
        renderItem={({ item: entry }: { item: FlatEntry }) => {
          if (entry._type === "header") {
            const collapsed = collapsedSections.has(entry.key);
            return (
              <Pressable
                style={[styles.sectionHeader, { borderLeftColor: entry.color }]}
                onPress={() => toggleSection(entry.key)}
              >
                <View style={[styles.sectionHeaderIcon, { backgroundColor: entry.color + "22" }]}>
                  <MaterialCommunityIcons name={entry.icon as any} size={15} color={entry.color} />
                </View>
                <Text style={[styles.sectionHeaderLabel, { color: entry.color }]}>{entry.label}</Text>
                <View style={[styles.sectionHeaderBadge, { backgroundColor: entry.color }]}>
                  <Text style={styles.sectionHeaderCount}>{entry.count}</Text>
                </View>
                <MaterialCommunityIcons
                  name={collapsed ? "chevron-down" : "chevron-up"}
                  size={18}
                  color={entry.color}
                />
              </Pressable>
            );
          }
          return (
            <View style={styles.itemWrapper}>
              <ProductCard
                name={entry.item.product.name}
                brand={entry.item.product.brand}
                category={entry.item.product.category}
                quantity={entry.item.quantity}
                unit={entry.item.unit}
                location={LOCATION_DISPLAY[entry.item.location] || entry.item.location}
                expiryDate={entry.item.expiry_date}
                status={getExpiryStatus(entry.item.expiry_date)}
                imageUrl={localImages[entry.item.product.id] || entry.item.product.image_url}
                addedBy={entry.item.added_by?.name}
                onPress={() => {
                  const visibleItems = (listData as FlatEntry[])
                    .filter((e): e is { _type: "item"; key: string; item: PantryItem } => e._type === "item")
                    .map((e) => e.item);
                  const idx = visibleItems.findIndex((i) => i.id === entry.item.id);
                  navigation.navigate("ProductDetail", {
                    pantryId: pantry!.id,
                    items: visibleItems,
                    initialIndex: Math.max(0, idx),
                  });
                }}
              />
            </View>
          );
        }}
      />

      {/* Modal compartir */}
      <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShareModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Compartir despensa</Text>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Invita a alguien</Text>
              <Text style={styles.modalDesc}>Comparte este enlace para añadir a alguien.</Text>
              {shareLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
              : shareToken ? (
                <>
                  <Text style={[styles.modalDesc, { marginBottom: spacing.xs }]}>Código de invitación:</Text>
                  <View style={styles.tokenBox}>
                    <Text style={[styles.tokenText, { fontSize: 13 }]} numberOfLines={2}>
                      {`https://nutricasa.duckdns.org/join/${shareToken.replace(/^.*\//, "")}`}
                    </Text>
                  </View>
                  <Text style={[styles.modalDesc, { marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                    La otra persona puede pegarlo en "Unirme con código" dentro de la app.
                  </Text>
                  <Pressable onPress={handleCopyOrShare} style={styles.copyButton}>
                    <MaterialCommunityIcons name="share-variant" size={18} color={colors.white} />
                    <Text style={styles.copyButtonText}>{Platform.OS === "web" ? "Copiar enlace" : "Compartir invitación"}</Text>
                  </Pressable>
                </>
              ) : <Text style={styles.modalDesc}>No se pudo generar el enlace.</Text>}
            </View>
            {pantryMembers.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Miembros ({pantryMembers.length})</Text>
                  {pantryMembers.map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={styles.memberAvatar}>
                        <MaterialCommunityIcons name={m.role === "owner" ? "shield-account" : "account"} size={16} color={colors.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberEmail}>{m.email}</Text>
                      </View>
                      <Text style={styles.memberRoleBadge}>{m.role === "owner" ? "Propietario" : "Invitado"}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Unirse a una despensa</Text>
              <Text style={styles.modalDesc}>Introduce el código o pega el enlace.</Text>
              <TextInput style={styles.joinInput} placeholder="Código o enlace de invitación" placeholderTextColor={colors.subtext} value={joinCode} onChangeText={(t) => { setJoinCode(t); setJoinError(null); }} autoCapitalize="none" />
              {joinError && <Text style={styles.joinError}>{joinError}</Text>}
              <Pressable onPress={handleJoin} disabled={joinLoading} style={styles.joinButton}>
                {joinLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.joinButtonText}>Unirse</Text>}
              </Pressable>
            </View>
            <Pressable onPress={() => setShareModalVisible(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Cerrar</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal nueva despensa */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva despensa</Text>
            <TextInput style={styles.joinInput} placeholder="Nombre (ej: Casa, Oficina...)" placeholderTextColor={colors.subtext} value={newPantryName} onChangeText={setNewPantryName} autoFocus maxLength={60} />
            <Pressable onPress={handleCreatePantry} disabled={createLoading} style={styles.joinButton}>
              {createLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.joinButtonText}>Crear</Text>}
            </Pressable>
            <Pressable onPress={() => setCreateModalVisible(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>Cancelar</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  createContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xl },
  createTitle: { ...typography.h2, color: colors.text, textAlign: "center", marginBottom: spacing.md },
  createSubtitle: { ...typography.body, color: colors.subtext, textAlign: "center", marginBottom: spacing.xl },
  createButton: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  createButtonText: { ...typography.body, color: colors.white, fontWeight: "700" },
  joinPantryButton: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.white },
  joinPantryButtonText: { ...typography.body, color: colors.primary, fontWeight: "600" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  headerTitle: { ...typography.h2, color: colors.text },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  shareButton: { width: 44, height: 44, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary, justifyContent: "center", alignItems: "center" },
  addButton: { width: 44, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },

  searchBox: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: "#E5E5E5" },
  searchInput: { flex: 1, marginLeft: spacing.sm, ...typography.body, color: colors.text },

  // Toggle de vista
  viewToggleRow: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewToggleChip: {
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

  // Section headers (agrupación visual)
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  sectionHeaderIcon: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  sectionHeaderLabel: { ...typography.body, fontWeight: "700", flex: 1 },
  sectionHeaderBadge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
  sectionHeaderCount: { ...typography.caption, color: colors.white, fontWeight: "700" },

  closestCard: { marginHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.secondary },
  closestText: { flex: 1 },
  closestTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  closestSubtitle: { ...typography.bodySm, color: colors.subtext, marginTop: spacing.xs },

  emptyContainer: { flex: 1, justifyContent: "center" },
  listContent: { paddingBottom: spacing.xl },
  itemWrapper: { marginBottom: spacing.sm, paddingHorizontal: spacing.lg },

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, width: "88%", maxWidth: 420 },
  modalTitle: { ...typography.h2, color: colors.text, textAlign: "center", marginBottom: spacing.lg },
  modalSection: { marginBottom: spacing.md },
  modalSectionTitle: { ...typography.body, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  modalDesc: { ...typography.bodySm, color: colors.subtext, marginBottom: spacing.md },
  tokenBox: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  tokenText: { ...typography.bodySm, color: colors.text, fontFamily: "monospace" },
  copyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md },
  copyButtonText: { ...typography.body, color: colors.white, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  memberName: { ...typography.bodySm, color: colors.text, fontWeight: "600" },
  memberEmail: { ...typography.caption, color: colors.subtext },
  memberRoleBadge: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  joinInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body, color: colors.text, marginBottom: spacing.sm },
  joinError: { ...typography.bodySm, color: colors.error, marginBottom: spacing.sm },
  joinButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: "center" },
  joinButtonText: { ...typography.body, color: colors.white, fontWeight: "700" },
  modalClose: { marginTop: spacing.lg, alignItems: "center" },
  modalCloseText: { ...typography.bodySm, color: colors.subtext, fontWeight: "600" },

  pantrySelectorRow: { borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  pantrySelectorContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  pantryChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.white },
  pantryChipActive: { backgroundColor: colors.primary },
  pantryChipDisabled: { opacity: 0.5 },
  pantryChipNew: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary, borderStyle: "dashed", backgroundColor: colors.white },
  pantryChipText: { ...typography.bodySm, color: colors.primary, fontWeight: "600" },
  pantryChipTextActive: { color: colors.white },
});
