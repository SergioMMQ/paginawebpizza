import { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase/config";

import LoginScreen         from "./screens/LoginScreen";
import DashboardScreen     from "./screens/DashboardScreen";
import MenuScreen          from "./screens/MenuScreen";
import PromocionesScreen   from "./screens/PromocionesScreen";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const headerOpts = (cerrarSesion) => ({
  headerStyle:      { backgroundColor: "#532803" },
  headerTintColor:  "#fff",
  headerTitleStyle: { fontWeight: "700" },
  headerRight: () => (
    <TouchableOpacity onPress={cerrarSesion} style={{ marginRight: 4 }}>
      <Text style={styles.cerrar}>Salir</Text>
    </TouchableOpacity>
  ),
});

function Tabs({ cerrarSesion }) {
  return (
    <Tab.Navigator
      screenOptions={{
        ...headerOpts(cerrarSesion),
        tabBarActiveTintColor:   "#d65f04",
        tabBarInactiveTintColor: "#a07850",
        tabBarStyle: {
          backgroundColor: "#fff8f2",
          borderTopColor:  "#e0c8b0",
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: "Menú & Productos",
          tabBarLabel: "Menú",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Promociones"
        component={PromocionesScreen}
        options={{
          title: "Promociones",
          tabBarLabel: "Promos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏷️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [usuario,   setUsuario]   = useState(null);
  const [cargando,  setCargando]  = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUsuario(user);
      setCargando(false);
    });
    return unsub;
  }, []);

  if (cargando) return <View style={{ flex: 1, backgroundColor: "#ffeee2" }} />;

  const cerrarSesion = () => signOut(auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!usuario
          ? <Stack.Screen name="Login" component={LoginScreen} />
          : <Stack.Screen name="Main">
              {() => <Tabs cerrarSesion={cerrarSesion} />}
            </Stack.Screen>
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  cerrar: { color: "#fff", fontSize: 14, paddingHorizontal: 4 },
});
