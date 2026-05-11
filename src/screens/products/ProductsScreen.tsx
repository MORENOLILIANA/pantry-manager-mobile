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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
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

type Navigation = NativeStackNavigationProp<PantriesStackParamList>;
type Route = RouteProp<PantriesStackParamList, "Products">;

const UNIT_OPTIONS = ["unidades", "kg", "g", "litros", "ml"];

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

  const { control, handleSubmit, watch, setValue } = useForm<FormData>({
    defaultValues: {
      productName:
        barcodeData?.name || item?.product.name || "",
      productBrand:
        barcodeData?.brand || item?.product.brand || "",
      productCategory:
        barcodeData?.category || item?.product.category || "",
      quantity: item?.quantity.toString() || "1",
      unit: item?.unit || "unidades",
      expiryDate: item?.expiry_date ? new Date(item.expiry_date) : new Date(),
      location: item?.location || "pantry",
      notes: item?.notes || "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const selectedUnit = watch("unit");
  const selectedLocation = watch("location");
  const expiryDate = watch("expiryDate");

  // Pre-rellenar si viene de BarcodeScan
  useEffect(() => {
    if (barcodeData) {
      if (barcodeData.name) {
        setValue("productName", barcodeData.name);
      }
      if (barcodeData.brand) {
        setValue("productBrand", barcodeData.brand);
      }
      if (barcodeData.category) {
        setValue("productCategory", barcodeData.category);
      }
    }
  }, [barcodeData, setValue]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setValue("expiryDate", date);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const itemData: AddItemData & UpdateItemData = {
        product_name: data.productName,
        product_brand: data.productBrand || undefined,
        product_category: data.productCategory || undefined,
        quantity: parseFloat(data.quantity) || 1,
        unit: data.unit,
        expiry_date: data.expiryDate.toISOString().split("T")[0], // YYYY-MM-DD
        location: data.location,
        notes: data.notes || undefined,
      };

      if (mode === "add") {
        await addItem(pantryId, itemData);
        Alert.alert("Éxito", "Producto añadido a la despensa");
      } else if (mode === "edit" && itemId) {
        await updateItem(pantryId, itemId, itemData);
        Alert.alert("Éxito", "Producto actualizado");
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert(
        "Error",
        "No se pudo guardar el producto. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = () => {
    if (mode !== "edit" || !itemId) return;

    Alert.alert(
      "Eliminar producto",
      `¿Estás seguro de que deseas eliminar este producto?`,
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteItemApi(pantryId, itemId);
              Alert.alert("Éxito", "Producto eliminado");
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "No se pudo eliminar el producto");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const navigateToBarcodeScan = () => {
    // Navegar a BarcodeScan pasando que regrese a Products
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
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={colors.primary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>
            {mode === "add" ? "Añadir producto" : "Editar producto"}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Formulario */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Nombre del producto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre del producto</Text>
            <View style={styles.inputWithButton}>
              <Controller
                control={control}
                name="productName"
                rules={{ required: "El nombre es requerido" }}
                render={({ field: { value, onChange } }) => (
                  <InputField
                    label=""
                    value={value}
                    onChangeText={onChange}
                    placeholder="Ej: Leche"
                    style={styles.expandedInput}
                  />
                )}
              />
              <Pressable
                onPress={navigateToBarcodeScan}
                style={styles.barcodeButton}
              >
                <MaterialCommunityIcons
                  name="barcode"
                  size={22}
                  color={colors.primary}
                />
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
              rules={{ required: "La cantidad es requerida" }}
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Cantidad"
                  value={value}
                  onChangeText={onChange}
                  placeholder="1"
                  keyboardType="decimal-pad"
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
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateButton, shadows.sm]}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateButtonText}>
                {expiryDate.toLocaleDateString("es-ES")}
              </Text>
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
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

          {/* Espaciador */}
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
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
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
});