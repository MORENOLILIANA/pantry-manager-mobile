import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/config/theme";
import type { PantryItem } from "@/api/pantries";

// Screens
import { DashboardScreen } from "@/screens/home/DashboardScreen";
import { PantriesScreen } from "@/screens/pantries/PantriesScreen";
import { ShoppingListsScreen } from "@/screens/shopping-lists/ShoppingListsScreen";
import { ProductsScreen } from "@/screens/products/ProductsScreen";
import { BarcodeScanScreen } from "@/screens/products/BarcodeScanScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { ChangePasswordScreen } from "@/screens/profile/ChangePasswordScreen";
import { RecipesScreen } from "@/screens/recipes/RecipesScreen";
import RecipeDetailScreen from "@/screens/recipes/RecipeDetailScreen";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";

export type AppStackParamList = {
  DashboardStack: undefined;
  PantriesStack: undefined;
  BarcodeScannerTab: undefined;
  ShoppingListStack: undefined;
  ProfileStack: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  Recipes: undefined;
  RecipeDetail: { recipe: any };
  Notifications: undefined;
  PantriesStack?: { screen: string };
  ShoppingListStack?: { screen: string };
};

export type PantriesStackParamList = {
  Pantries: undefined;
  Products:
    | {
        pantryId: string;
        mode: "add";
        barcodeData?: {
          barcode: string;
          name: string;
          brand?: string;
          category?: string;
        };
      }
    | {
        pantryId: string;
        mode: "edit";
        itemId: string;
        item: PantryItem;
      };
  BarcodeScan: {
    pantryId: string;
  };
};

export type ShoppingListStackParamList = {
  ShoppingLists: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  ChangePassword: undefined;
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
        options={{ title: "Dashboard" }}
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
    </ProfileStack.Navigator>
  );
}

export function AppStack() {
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
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: spacing.sm,
          height: Platform.OS === "ios" ? 88 : 70,
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
            iconName = "shopping-cart";
          } else if (route.name === "ProfileStack") {
            iconName = "account-circle";
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DashboardStack"
        component={DashboardStackNavigator}
        options={{
          title: "Dashboard",
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