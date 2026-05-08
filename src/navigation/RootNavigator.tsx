import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/context/AuthContext";
import { AuthStack } from "@/navigation/stacks/AuthStack";
import { AppStack } from "@/navigation/stacks/AppStack";

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? <Stack.Screen name="App" component={AppStack} /> : <Stack.Screen name="Auth" component={AuthStack} />}
    </Stack.Navigator>
  );
}