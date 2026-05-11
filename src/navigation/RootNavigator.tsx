import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/context/AuthContext";
import { AuthStack } from "@/navigation/stacks/AuthStack";
import { AppStack } from "@/navigation/stacks/AppStack";
import { SplashScreen } from "@/screens/auth/SplashScreen";

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isBootstrapping } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isBootstrapping ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : user ? (
        <Stack.Screen name="App" component={AppStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}