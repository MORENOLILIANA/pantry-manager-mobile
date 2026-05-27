import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/config/theme";
import type { PantryItem, NutritionalInfo } from "@/api/pantries";

// Screens
import { DashboardScreen } from "@/screens/home/DashboardScreen";
import { PantriesScreen } from "@/screens/pantries/PantriesScreen";
import { ShoppingListsScreen } from "@/screens/shopping-lists/ShoppingListsScreen";
import { ProductsScreen } from "@/screens/products/ProductsScreen";
import { ProductDetailScreen } from "@/screens/products/ProductDetailScreen";
import { BarcodeScanScreen } from "@/screens/products/BarcodeScanScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { ChangePasswordScreen } from "@/screens/profile/ChangePasswordScreen";
import { GroupsScreen } from "@/screens/groups/GroupsScreen";
import { RecipesScreen } from "@/screens/recipes/RecipesScreen";
import RecipeDetailScreen from "@/screens/recipes/RecipeDetailScreen";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";

export type AppStackParamList = {
  DashboardStack: NavigatorScreenParams<DashboardStackParamList> | undefined;
  PantriesStack: NavigatorScreenParams<PantriesStackParamList> | undefined;
  BarcodeScannerTab: undefined;
  ShoppingListStack: NavigatorScreenParams<ShoppingListStackParamList> | undefined;
  ProfileStack: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  Recipes: undefined;
  RecipeDetail: {
    recipe: any;
    availableIngredients?: string[];
    missingIngredients?: string[];
  };
  Notifications: undefined;
  PantriesStack?: { screen: string };
  ShoppingListStack?: { screen: string };
};

export type PantriesStackParamList = {
  Pantries: { _updatedItem?: PantryItem; viewMode?: "all" | "expiry" | "category" | "location" } | undefined;
  Products:
    | {
        pantryId: string;
        mode: "add";
        barcodeData?: {
          barcode: string;
          name: string;
          brand?: string;
          category?: string;
          nutritionalInfo?: NutritionalInfo;
          image_url?: string;
        };
      }
    | {
        pantryId: string;
        mode: "edit";
        itemId: string;
        item: PantryItem;
      };
  BarcodeScan: {
    pantryId?: string;
    shoppingListMode?: boolean;
  };
  ProductDetail: {
    pantryId: string;
    item: PantryItem;
  };
};

export type ShoppingListStackParamList = {
  ShoppingLists: { scannedProduct?: { name: string; brand?: string } } | undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  ChangePassword: undefined;
  Groups: undefined;
};

const Tab = createBottomTabNavigator<AppStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const PantriesStack = createNativeStackNavigator<PantriesStackParamList>();
const ShoppingListStack = createNativeStackNavigator<ShoppingListStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.white,
    borderBottomWidth: 0,
  },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontWeight: "700" as const,
    color: colors.text,
  },
  contentStyle: {
    backgroundColor: colors.white,
  },
};

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: true,
      }}
    >
      <DashboardStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Inicio" }}
      />
      <DashboardStack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{ title: "Recetas" }}
      />
      <DashboardStack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: "Receta" }}
      />
      <DashboardStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notificaciones" }}
      />
    </DashboardStack.Navigator>
  );
}

function PantriesStackNavigator() {
  return (
    <PantriesStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: true,
      }}
    >
      <PantriesStack.Screen
        name="Pantries"
        component={PantriesScreen}
        options={{ title: "Mi Despensa" }}
      />
      <PantriesStack.Screen
        name="Products"
        component={ProductsScreen}
        options={{ title: "Producto" }}
      />
      <PantriesStack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{ title: "Escanear", headerShown: false }}
      />
      <PantriesStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
    </PantriesStack.Navigator>
  );
}

function ShoppingListStackNavigator() {
  return (
    <ShoppingListStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: true,
      }}
    >
      <ShoppingListStack.Screen
        name="ShoppingLists"
        component={ShoppingListsScreen}
        options={{ title: "Lista de Compra" }}
      />
    </ShoppingListStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: true,
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Mi Perfil" }}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: "Cambiar contraseña" }}
      />
      <ProfileStack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: "Grupos y compartidos" }}
      />
    </ProfileStack.Navigator>
  );
}

export function AppStack() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? 20 : Math.max(insets.bottom, 8);
  const tabHeight  = Platform.OS === "ios" ? 88 : 56 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: bottomPad,
          paddingTop: spacing.sm,
          height: tabHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          marginTop: 4,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: string = "home";

          if (route.name === "DashboardStack") {
            iconName = "home";
          } else if (route.name === "PantriesStack") {
            iconName = "package-variant";
          } else if (route.name === "BarcodeScannerTab") {
            iconName = "barcode";
          } else if (route.name === "ShoppingListStack") {
            iconName = "cart-outline";
          } else if (route.name === "ProfileStack") {
            iconName = "account-circle";
          }

          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DashboardStack"
        component={DashboardStackNavigator}
        options={{
          title: "Inicio",
        }}
      />
      <Tab.Screen
        name="PantriesStack"
        component={PantriesStackNavigator}
        options={{
          title: "Despensa",
        }}
      />
      <Tab.Screen
        name="BarcodeScannerTab"
        component={BarcodeScanScreen}
        options={{
          title: "Escanear",
          tabBarLabel: "Escanear",
          tabBarIcon: ({ color }) => (
            <View style={styles.scanButton}>
              <MaterialCommunityIcons name="barcode" size={28} color={colors.white} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ShoppingListStack"
        component={ShoppingListStackNavigator}
        options={{
          title: "Compra",
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{
          title: "Perfil",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});