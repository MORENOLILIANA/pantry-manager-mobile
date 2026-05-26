import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, borderRadius, typography, shadows } from "@/config/theme";
import type { PantriesStackParamList } from "@/navigation/stacks/AppStack";
import { InputField } from "@/components/InputField";
import { CategoryChip } from "@/components/CategoryChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  addItem,
  updateItem,
  deleteItem as deleteItemApi,
  type AddItemData,
  type UpdateItemData,
} from "@/api/pantries";
import { saveProductImage, getProductImage } from "@/services/productImages";

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;

type Route = RouteProp<PantriesStackParamList, "Products">;

const UNIT_OPTIONS = ["unidades", "kg", "g", "litros", "ml"];

function estimateExpiryFromCategory(category?: string): Date {
  const addDays = (d: number) => new Date(Date.now() + d * 86400000);
  const cat = (category || "").toLowerCase();
  if (/fresc|verdur|fruta|hortaliz|fresh|produce|vegetal/.test(cat)) return addDays(7);
  if (/carne|pollo|ternera|cerdo|meat|fish|pescado|marisco|seafood/.test(cat)) return addDays(3);
  if (/pan|bollería|pastel|bread|bakery|biscuit|galleta/.test(cat)) return addDays(7);
  if (/lácteo|leche|yogur|queso|nata|dairy|milk|cream/.test(cat)) return addDays(14);
  if (/congelado|frozen/.test(cat)) return addDays(180);
  if (/conserva|lata|bote|canned|preserv|encurtido/.test(cat)) return addDays(730);
  if (/bebida|refresco|zumo|drink|juice|beverage|agua|water/.test(cat)) return addDays(365);
  if (/palomita|snack|chips|aperitivo/.test(cat)) return addDays(180);
  return addDays(365);
}

const LOCATION_OPTIONS = [
  { label: "Nevera", value: "refrigerator" },
  { label: "Congelador", value: "freezer" },
  { label: "Armario", value: "pantry" },
  { label: "Otro", value: "other" },
];

interface FormData {
  productName: string;
  productBrand: string;
  productCategory: string;
  quantity: string;
  unit: string;
  expiryDate: Date;
  location: string;
  notes: string;
}

export function ProductsScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  const params = (route.params as any) || {};
  const { pantryId, mode = "add", item, itemId, barcodeData } = params;

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      productName: barcodeData?.name || item?.product.name || "",
      productBrand: barcodeData?.brand || item?.product.brand || "",
      productCategory: barcodeData?.category || item?.product.category || "",
      quantity: item?.quantity.toString() || "1",
      unit: item?.unit || "unidades",
      expiryDate: item?.expiry_date
        ? new Date(item.expiry_date)
        : barcodeData?.category
        ? estimateExpiryFromCategory(barcodeData.category)
        : new Date(),
      location: item?.location || "pantry",
      notes: item?.notes || "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [localImageUri, setLocalImageUri] = useState<string | null>(
    item?.product.image_url || null
  );

  const selectedUnit = watch("unit");
  const selectedLocation = watch("location");
  const expiryDate = watch("expiryDate");

  const toDate = (d: any) => (d instanceof Date ? d : d ? new Date(d) : new Date());

  // Pre-rellenar si viene de BarcodeScan — reset completo para evitar datos del scan anterior
  useEffect(() => {
    if (!barcodeData) return;
    reset({
      productName: barcodeData.name || "",
      productBrand: barcodeData.brand || "",
      productCategory: barcodeData.category || "",
      quantity: "1",
      unit: "unidades",
      expiryDate: barcodeData.category
        ? estimateExpiryFromCategory(barcodeData.category)
        : new Date(),
      location: "pantry",
      notes: "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeData?.barcode]);

  // Cargar imagen local guardada (tiene prioridad sobre image_url del backend)
  useEffect(() => {
    if (item?.product.id) {
      getProductImage(item.product.id)
        .then((uri) => { if (uri) setLocalImageUri(uri); })
        .catch(() => {});
    }
  }, [item?.product.id]);

  // ─── Image picker ────────────────────────────────────────────────────────────

  const handlePickImage = () => {
    Alert.alert(
      "Añadir foto del producto",
      "¿Cómo quieres añadir la imagen?",
      [
        { text: "Galería", onPress: pickFromLibrary },
        { text: "Cámara", onPress: pickFromCamera },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos requeridos", "Necesitamos acceso a tu galería para elegir una foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisos requeridos", "Necesitamos acceso a la cámara para hacer una foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  // ─── Date picker ─────────────────────────────────────────────────────────────

  const openDatePicker = () => {
    setTempDate(toDate(expiryDate));
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event?.type === "set" && date) setValue("expiryDate", date);
      return;
    }
    if (date) setTempDate(date);
  };

  const confirmIOSDate = () => {
    setValue("expiryDate", tempDate);
    setShowDatePicker(false);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const itemData: AddItemData & UpdateItemData = {
        product_name: data.productName,
        product_brand: data.productBrand || undefined,
        product_category: data.productCategory || undefined,
        product_barcode: barcodeData?.barcode || undefined,
        quantity: parseFloat(data.quantity) || 1,
        unit: data.unit,
        expiry_date: (() => {
          const d = data.expiryDate;
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })(),
        location: data.location,
        notes: data.notes || undefined,
      };

      let savedProductId: string | undefined;

      if (mode === "add") {
        const result = await addItem(pantryId, itemData);
        savedProductId = result.product?.id ?? result.product_id;
      } else if (mode === "edit" && itemId) {
        const result = await updateItem(pantryId, itemId, itemData);
        savedProductId = result.product?.id ?? result.product_id;
      }

      // Guardar imagen local si se eligió una
      if (localImageUri && savedProductId) {
        await saveProductImage(savedProductId, localImageUri).catch(() => {});
      }

      navigation.navigate("Pantries");
    } catch (error: any) {
      console.error("Error saving item:", error);
      const serverErrors = error?.response?.data?.errors;
      const serverMessage = error?.response?.data?.message;
      let msg = "No se pudo guardar el producto.";
      if (serverErrors) {
        msg = Object.values(serverErrors as Record<string, string[]>).flat().join("\n");
      } else if (serverMessage) {
        msg = serverMessage;
      }
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = () => {
    if (mode !== "edit" || !itemId) return;
    Alert.alert(
      "Eliminar producto",
      "¿Estás seguro de que deseas eliminar este producto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteItemApi(pantryId, itemId);
              navigation.navigate("Pantries");
            } catch {
              Alert.alert("Error", "No se pudo eliminar el producto");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToBarcodeScan = () => {
    navigation.navigate("BarcodeScan", { pantryId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {mode === "add" ? "Añadir producto" : "Editar producto"}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

          {/* Foto del producto */}
          <View style={styles.imageSection}>
            <Pressable onPress={handlePickImage} style={styles.imageButton}>
              {localImageUri ? (
                <Image
                  source={{ uri: localImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={40} color={colors.subtext} />
                  <Text style={styles.imagePlaceholderText}>Añadir foto</Text>
                </View>
              )}
              {/* Badge cámara */}
              <View style={styles.cameraOverlay}>
                <MaterialCommunityIcons name="camera" size={16} color={colors.white} />
              </View>
            </Pressable>
          </View>

          {/* Nombre del producto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre del producto</Text>
            <View style={styles.inputWithButton}>
              <Controller
                control={control}
                name="productName"
                rules={{ required: "El nombre del producto es obligatorio." }}
                render={({ field: { value, onChange } }) => (
                  <InputField
                    label=""
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ej: Leche"
                    error={errors.productName?.message}
                    style={styles.expandedInput}
                  />
                )}
              />
              <Pressable onPress={navigateToBarcodeScan} style={styles.barcodeButton}>
                <MaterialCommunityIcons name="barcode" size={22} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Marca y Categoría */}
          <View style={styles.twoColumnRow}>
            <Controller
              control={control}
              name="productBrand"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Marca"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ej: Danone"
                  containerStyle={styles.halfInput}
                />
              )}
            />
            <Controller
              control={control}
              name="productCategory"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Categoría"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ej: Lácteos"
                  containerStyle={styles.halfInput}
                />
              )}
            />
          </View>

          {/* Cantidad y Unidad */}
          <View style={styles.twoColumnRow}>
            <Controller
              control={control}
              name="quantity"
              rules={{
                required: "La cantidad es obligatoria.",
                validate: (v) => parseFloat(v) > 0 || "La cantidad debe ser mayor que 0.",
              }}
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Cantidad"
                  value={value}
                  onChangeText={onChange}
                  placeholder="1"
                  keyboardType="decimal-pad"
                  error={errors.quantity?.message}
                  containerStyle={styles.halfInput}
                />
              )}
            />
            <View style={styles.halfInput}>
              <Text style={styles.fieldLabel}>Unidad</Text>
              <View style={styles.unitsGrid}>
                {UNIT_OPTIONS.map((unit) => (
                  <CategoryChip
                    key={unit}
                    label={unit}
                    selected={selectedUnit === unit}
                    onPress={() => setValue("unit", unit)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Fecha de caducidad */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Fecha de caducidad</Text>
            <Pressable onPress={openDatePicker} style={[styles.dateButton, shadows.sm]}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.dateButtonText}>
                {toDate(expiryDate).toLocaleDateString("es-ES")}
              </Text>
            </Pressable>
          </View>

          {showDatePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={toDate(expiryDate)}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {showDatePicker && Platform.OS === "ios" && (
            <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.dateModalOverlay}>
                <View style={styles.dateModalCard}>
                  <Text style={styles.dateModalTitle}>Selecciona la fecha</Text>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                  />
                  <View style={styles.dateModalActions}>
                    <PrimaryButton
                      title="Cancelar"
                      variant="secondary"
                      onPress={() => setShowDatePicker(false)}
                      style={styles.modalHalfButton}
                    />
                    <PrimaryButton
                      title="Guardar"
                      onPress={confirmIOSDate}
                      style={styles.modalHalfButton}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Ubicación */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Ubicación</Text>
            <View style={styles.chipsGrid}>
              {LOCATION_OPTIONS.map((loc) => (
                <CategoryChip
                  key={loc.value}
                  label={loc.label}
                  selected={selectedLocation === loc.value}
                  onPress={() => setValue("location", loc.value)}
                />
              ))}
            </View>
          </View>

          {/* Notas */}
          <View style={styles.section}>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Notas"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ej: Abierto, próximo a caducar..."
                  multiline
                  numberOfLines={4}
                />
              )}
            />
          </View>

          <View style={styles.spacer} />
        </ScrollView>

        {/* Botones de acción */}
        <View style={styles.footer}>
          {mode === "edit" && (
            <PrimaryButton
              label="Eliminar producto"
              onPress={handleDeleteItem}
              loading={loading}
              variant="danger"
              style={styles.deleteButton}
            />
          )}
          <PrimaryButton
            label={loading ? "" : mode === "add" ? "Añadir" : "Guardar cambios"}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const IMAGE_SIZE = 140;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // ─── Image ───────────────────────────────────────────────────────────────────
  imageSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  imageButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imagePlaceholder: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  imagePlaceholderText: {
    ...typography.bodySm,
    color: colors.subtext,
    fontWeight: "600",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  // ─── Form fields ─────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  inputWithButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  expandedInput: {
    flex: 1,
  },
  barcodeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfInput: {
    flex: 1,
  },
  unitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  spacer: {
    height: spacing.xl,
  },
  // ─── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  deleteButton: {
    marginBottom: spacing.sm,
  },
  // ─── Date modal ──────────────────────────────────────────────────────────────
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  dateModalCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  dateModalTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  dateModalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalHalfButton: {
    flex: 1,
  },
});
