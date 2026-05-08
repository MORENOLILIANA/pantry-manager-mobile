import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DashboardScreen } from "@/screens/home/DashboardScreen";
import { PantriesScreen } from "@/screens/pantries/PantriesScreen";
import { ShoppingListsScreen } from "@/screens/shopping-lists/ShoppingListsScreen";
import { ProductsScreen } from "@/screens/products/ProductsScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { BarcodeScanScreen } from "@/screens/products/BarcodeScanScreen";

export type AppStackParamList = {
  Dashboard: undefined;
  Pantries: undefined;
  ShoppingLists: undefined;
  Products: undefined;
  BarcodeScan: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: "#111827" },
        headerTintColor: "#f9fafb",
        contentStyle: { backgroundColor: "#0b1220" }
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Pantries" component={PantriesScreen} />
      <Stack.Screen name="ShoppingLists" component={ShoppingListsScreen} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} options={{ title: "Escanear" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}