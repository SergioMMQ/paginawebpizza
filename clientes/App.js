import { useState, useEffect } from "react";
import {
  Text, View, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, doc, collection, query, where } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import TrackingModal, { estadoColor } from "./components/TrackingModal";

import MenuScreen            from "./screens/MenuScreen";
import PromocionesScreen     from "./screens/PromocionesScreen";
import PerfilScreen          from "./screens/PerfilScreen";
import LoginScreen           from "./screens/LoginScreen";
import PedidosScreen         from "./screens/PedidosScreen";
import TarjetasClienteScreen from "./screens/TarjetasClienteScreen";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ESTADO_LABELS = {
  recibido:  "Recibido",
  preparando:"Preparando",
  listo:     "¡Listo!",
  entregado: "Entregado",
};

function Tabs({ usuario, abierto, onOrderPlaced }) {
  const MenuConUsuario        = () => <MenuScreen usuario={usuario} onOrderPlaced={onOrderPlaced} />;
  const PromocionesConUsuario = () => <PromocionesScreen usuario={usuario} />;
  const PedidosConUsuario     = () => <PedidosScreen usuario={usuario} />;
  const TarjetasConUsuario    = () => <TarjetasClienteScreen usuario={usuario} />;

  const badgeEstado = () => (
    abierto === null ? null : (
      <View style={[st.badge, abierto ? st.badgeAbierto : st.badgeCerrado]}>
        <Text style={st.badgeTxt}>{abierto ? "● Abierto" : "● Cerrado"}</Text>
      </View>
    )
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle:             { backgroundColor: "#532803" },
        headerTintColor:         "#fff",
        headerTitleStyle:        { fontWeight: "700" },
        headerRight:             badgeEstado,
        tabBarActiveTintColor:   "#d65f04",
        tabBarInactiveTintColor: "#a07850",
        tabBarStyle:             { backgroundColor: "#fff8f2", borderTopColor: "#e0c8b0" },
        tabBarLabelStyle:        { fontWeight: "700", fontSize: 12 },
      }}
    >
      <Tab.Screen name="Menu" component={MenuConUsuario}
        options={{ title: "Menú", tabBarLabel: "Menú",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🍕</Text> }} />
      <Tab.Screen name="Promociones" component={PromocionesConUsuario}
        options={{ title: "Promociones", tabBarLabel: "Promos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏷️</Text> }} />
      <Tab.Screen name="Pedidos" component={PedidosConUsuario}
        options={{ title: "Mis Pedidos", tabBarLabel: "Pedidos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text> }} />
      <Tab.Screen name="Tarjetas" component={TarjetasConUsuario}
        options={{ title: "Mis Tarjetas", tabBarLabel: "Tarjetas",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎴</Text> }} />
      <Tab.Screen name="Perfil"
        options={{ title: "Mi Perfil", tabBarLabel: "Perfil",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}>
        {() => <PerfilScreen usuario={usuario} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [usuario,         setUsuario]         = useState(null);
  const [cargando,        setCargando]        = useState(true);
  const [abierto,         setAbierto]         = useState(null);

  // Pedidos activos del usuario (array)
  const [activeOrdenes,   setActiveOrdenes]   = useState([]);
  // Para usuarios anónimos: guardar el id del pedido de la sesión
  const [anonOrdenId,     setAnonOrdenId]     = useState(null);
  const [anonOrden,       setAnonOrden]       = useState(null);

  const [selectedOrdenId, setSelectedOrdenId] = useState(null);
  const [trackingVisible, setTrackingVisible] = useState(false);
  const [pickerVisible,   setPickerVisible]   = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, user => { setUsuario(user); setCargando(false); });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, "config", "estado"), snap => {
      setAbierto(snap.exists() ? (snap.data().abierto ?? true) : true);
    });
  }, []);

  // Suscribirse a todos los pedidos activos del usuario logueado
  useEffect(() => {
    if (!usuario?.uid) { setActiveOrdenes([]); return; }
    const q = query(collection(db, "ordenesTienda"), where("uid", "==", usuario.uid));
    return onSnapshot(q, snap => {
      const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activas = todas
        .filter(o => o.estado !== "entregado")
        .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0));
      setActiveOrdenes(activas);
    });
  }, [usuario?.uid]);

  // Para usuario anónimo: escuchar el pedido de la sesión
  useEffect(() => {
    if (!anonOrdenId) { setAnonOrden(null); return; }
    return onSnapshot(doc(db, "ordenesTienda", anonOrdenId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setAnonOrden({ id: snap.id, ...data });
        if (data.estado === "entregado") setTimeout(() => setAnonOrdenId(null), 4000);
      }
    });
  }, [anonOrdenId]);

  const handleOrderPlaced = (id) => {
    if (usuario?.uid) {
      // Para usuarios logueados, Firestore lo detecta automáticamente
      // Abrir el tracking del pedido recién hecho
      setSelectedOrdenId(id);
      setTrackingVisible(true);
    } else {
      setAnonOrdenId(id);
      setSelectedOrdenId(id);
      setTrackingVisible(true);
    }
  };

  const abrirTracking = (id) => {
    setSelectedOrdenId(id);
    setPickerVisible(false);
    setTrackingVisible(true);
  };

  if (cargando) return <View style={{ flex: 1, backgroundColor: "#fff8f2" }} />;

  // Determinar qué mostrar en el botón flotante
  const ordenes         = usuario?.uid ? activeOrdenes : (anonOrden && anonOrden.estado !== "entregado" ? [anonOrden] : []);
  const hayOrdenes      = ordenes.length > 0;
  const hayListo        = ordenes.some(o => o.estado === "listo");
  const ordenDestacada  = ordenes.find(o => o.estado === "listo") ?? ordenes[0];

  const FloatingBtn = () => !hayOrdenes ? null : (
    <TouchableOpacity
      style={[st.flotante, hayListo && st.flotanteListo]}
      onPress={() => ordenes.length === 1 ? abrirTracking(ordenes[0].id) : setPickerVisible(true)}
      activeOpacity={0.85}
    >
      {hayListo && <Text style={st.flotanteAlerta}>!</Text>}
      {ordenes.length > 1
        ? <>
            <Text style={st.flotanteNumero}>{ordenes.length}</Text>
            <Text style={st.flotanteEstado}>pedidos{"\n"}activos</Text>
          </>
        : <>
            <Text style={st.flotanteNumero}>#{ordenDestacada.numero}</Text>
            <View style={[st.flotanteDot, { backgroundColor: estadoColor(ordenDestacada.estado) }]} />
            <Text style={st.flotanteEstado} numberOfLines={1}>
              {ESTADO_LABELS[ordenDestacada.estado] ?? ""}
            </Text>
          </>
      }
    </TouchableOpacity>
  );

  const ScreenContent = ({ conUsuario }) => (
    <View style={{ flex: 1, zIndex: 0 }}>
      <Tabs
        usuario={conUsuario ? usuario : null}
        abierto={abierto}
        onOrderPlaced={handleOrderPlaced}
      />
      <FloatingBtn />

      {/* Picker de pedidos cuando hay varios */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={st.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={st.pickerBox}>
            <Text style={st.pickerTitulo}>Tus pedidos activos</Text>
            <ScrollView>
              {ordenes.map(o => {
                const color = estadoColor(o.estado);
                const esL   = o.estado === "listo";
                return (
                  <TouchableOpacity key={o.id} style={[st.pickerCard, esL && st.pickerCardListo]} onPress={() => abrirTracking(o.id)}>
                    <View style={[st.pickerNum, { backgroundColor: esL ? "#2e7d32" : "#532803" }]}>
                      <Text style={st.pickerNumTxt}>#{o.numero}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.pickerNombre}>{o.nombreCliente}</Text>
                      <Text style={st.pickerItems} numberOfLines={1}>
                        {(o.items ?? []).map(i => `${i.cantidad}x ${i.nombre}`).join(" · ")}
                      </Text>
                    </View>
                    <View style={[st.pickerBadge, { backgroundColor: color + "22", borderColor: color }]}>
                      <Text style={[st.pickerBadgeTxt, { color }]}>{ESTADO_LABELS[o.estado]}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TrackingModal
        visible={trackingVisible}
        ordenId={selectedOrdenId}
        onClose={() => setTrackingVisible(false)}
      />
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {usuario
          ? <Stack.Screen name="Main">{() => <ScreenContent conUsuario />}</Stack.Screen>
          : <>
              <Stack.Screen name="Tabs">{() => <ScreenContent conUsuario={false} />}</Stack.Screen>
              <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: "modal" }} />
            </>
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const st = StyleSheet.create({
  badge:        { marginRight: 12, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeAbierto: { backgroundColor: "#2e7d32" },
  badgeCerrado: { backgroundColor: "#c62828" },
  badgeTxt:     { color: "#fff", fontWeight: "700", fontSize: 11 },

  flotante: {
    position: "absolute", right: 14, bottom: 90,
    backgroundColor: "#532803", borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 14,
    alignItems: "center", minWidth: 84,
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 10,
    elevation: 20, zIndex: 9999,
  },
  flotanteListo:  { backgroundColor: "#2e7d32" },
  flotanteAlerta: {
    position: "absolute", top: -6, right: -6,
    backgroundColor: "#d65f04", color: "#fff",
    fontWeight: "900", fontSize: 13,
    width: 20, height: 20, borderRadius: 10,
    textAlign: "center", lineHeight: 20, overflow: "hidden",
  },
  flotanteNumero: { color: "#fff", fontWeight: "900", fontSize: 20, lineHeight: 24 },
  flotanteDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginBottom: 2 },
  flotanteEstado: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700", maxWidth: 72, textAlign: "center" },

  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  pickerBox:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: "70%" },
  pickerTitulo:  { fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 16, textAlign: "center" },
  pickerCard:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e0c8b0", marginBottom: 10, backgroundColor: "#fff" },
  pickerCardListo:{ borderColor: "#2e7d32", backgroundColor: "#f0fff4" },
  pickerNum:     { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  pickerNumTxt:  { color: "#fff", fontWeight: "900", fontSize: 15 },
  pickerNombre:  { fontWeight: "800", color: "#421e02", fontSize: 15 },
  pickerItems:   { fontSize: 11, color: "#a07850", marginTop: 2 },
  pickerBadge:   { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  pickerBadgeTxt:{ fontSize: 11, fontWeight: "800" },
});
