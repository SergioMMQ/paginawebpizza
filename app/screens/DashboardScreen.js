import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function DashboardScreen({ navigation }) {
  const [secciones,     setSecciones]     = useState([]);
  const [conteos,       setConteos]       = useState({});
  const [abierto,       setAbierto]       = useState(null);
  const [savingEstado,  setSavingEstado]  = useState(false);
  const [promosActivas, setPromosActivas] = useState(0);

  // Estado abierto/cerrado
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "estado"), snap => {
      setAbierto(snap.exists() ? (snap.data().abierto ?? true) : true);
    });
    return unsub;
  }, []);

  const toggleEstado = async () => {
    setSavingEstado(true);
    await setDoc(doc(db, "config", "estado"), { abierto: !abierto });
    setSavingEstado(false);
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), snap => {
      setSecciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Escucha productos de cada sección para obtener conteos
  useEffect(() => {
    if (secciones.length === 0) return;

    const unsubs = secciones.map(sec =>
      onSnapshot(collection(db, "secciones", sec.id, "productos"), snap => {
        const prods = snap.docs.map(d => d.data());
        setConteos(prev => ({
          ...prev,
          [sec.id]: {
            total:   prods.length,
            activos: prods.filter(p => p.activo !== false).length,
          },
        }));
      })
    );

    return () => unsubs.forEach(u => u());
  }, [secciones]);

  const seccionesActivas = secciones.filter(s => s.activo !== false).length;
  const totalProductos   = Object.values(conteos).reduce((a, c) => a + c.total,   0);
  const productosActivos = Object.values(conteos).reduce((a, c) => a + c.activos, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>Panel de administración</Text>
        <Text style={styles.headerTitle}>D" Aruma Café</Text>
      </View>

      {/* ── Botón ABIERTO / CERRADO ── */}
      <TouchableOpacity
        style={[styles.estadoBtn, abierto ? styles.estadoAbierto : styles.estadoCerrado]}
        onPress={toggleEstado}
        disabled={savingEstado || abierto === null}
      >
        {savingEstado || abierto === null
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.estadoPunto}>{abierto ? "●" : "●"}</Text>
              <Text style={styles.estadoTxt}>{abierto ? "ABIERTO" : "CERRADO"}</Text>
              <Text style={styles.estadoHint}>Toca para {abierto ? "cerrar" : "abrir"}</Text>
            </>
        }
      </TouchableOpacity>

      {/* Tarjetas de resumen */}
      <View style={styles.cards}>
        <View style={[styles.card, { borderTopColor: "#d65f04" }]}>
          <Text style={styles.cardNum}>{secciones.length}</Text>
          <Text style={styles.cardLabel}>Secciones</Text>
        </View>
        <View style={[styles.card, { borderTopColor: "#4caf50" }]}>
          <Text style={styles.cardNum}>{seccionesActivas}</Text>
          <Text style={styles.cardLabel}>Activas</Text>
        </View>
        <View style={[styles.card, { borderTopColor: "#d65f04" }]}>
          <Text style={styles.cardNum}>{totalProductos}</Text>
          <Text style={styles.cardLabel}>Productos</Text>
        </View>
        <View style={[styles.card, { borderTopColor: "#4caf50" }]}>
          <Text style={styles.cardNum}>{productosActivos}</Text>
          <Text style={styles.cardLabel}>Visibles</Text>
        </View>
      </View>

      {/* Acceso rápido al menú */}
      <TouchableOpacity style={styles.btnMenu} onPress={() => navigation.navigate("Menu")}>
        <Text style={styles.btnMenuTxt}>Administrar menú →</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffeee2" },

  header: {
    backgroundColor: "#532803",
    padding: 28,
    paddingTop: 36,
    alignItems: "center",
  },
  headerSub:   { color: "#f0c890", fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "900" },

  estadoBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  estadoAbierto:  { backgroundColor: "#2e7d32" },
  estadoCerrado:  { backgroundColor: "#c62828" },
  estadoPunto:    { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  estadoTxt:      { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  estadoHint:     { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 },

  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 20,
  },
  card: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardNum:   { fontSize: 32, fontWeight: "900", color: "#532803" },
  cardLabel: { fontSize: 12, color: "#934807", marginTop: 2, fontWeight: "600" },

  seccionTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#532803",
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  seccionRow: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0c8b0",
  },
  seccionRowInactiva: { opacity: 0.5 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  seccionNombre:  { fontWeight: "700", color: "#421e02", fontSize: 14 },
  seccionDetalle: { fontSize: 12, color: "#934807", marginTop: 2 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt: { fontSize: 11, fontWeight: "700" },

  btnMenu: {
    backgroundColor: "#d65f04",
    margin: 20,
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnMenuTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },

  vacio: { color: "#aaa", textAlign: "center", padding: 20 },
});
