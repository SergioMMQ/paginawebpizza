import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function DashboardScreen({ navigation }) {
  const [secciones,     setSecciones]     = useState([]);
  const [conteos,       setConteos]       = useState({});
  const [abierto,       setAbierto]       = useState(null);
  const [savingEstado,  setSavingEstado]  = useState(false);

  const [usuarios,   setUsuarios]   = useState([]);
  const [ordenes,    setOrdenes]    = useState([]);

  // Estado abierto/cerrado
  useEffect(() => {
    return onSnapshot(doc(db, "config", "estado"), snap => {
      setAbierto(snap.exists() ? (snap.data().abierto ?? true) : true);
    });
  }, []);

  const toggleEstado = async () => {
    setSavingEstado(true);
    await setDoc(doc(db, "config", "estado"), { abierto: !abierto });
    setSavingEstado(false);
  };

  useEffect(() => {
    return onSnapshot(collection(db, "secciones"), snap => {
      setSecciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

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

  // Usuarios y órdenes para rankings
  useEffect(() => {
    return onSnapshot(collection(db, "usuarios"), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "ordenesTienda"), snap => {
      setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const seccionesActivas = secciones.filter(s => s.activo !== false).length;
  const totalProductos   = Object.values(conteos).reduce((a, c) => a + c.total,   0);
  const productosActivos = Object.values(conteos).reduce((a, c) => a + c.activos, 0);

  // Top 10 nuevos usuarios
  const top10Nuevos = [...usuarios]
    .sort((a, b) => (b.creadoEn?.seconds ?? 0) - (a.creadoEn?.seconds ?? 0))
    .slice(0, 10);

  // Agrupar órdenes por uid (solo usuarios con cuenta)
  const porUid = {};
  for (const o of ordenes) {
    if (!o.uid) continue;
    if (!porUid[o.uid]) porUid[o.uid] = { compras: 0, gasto: 0 };
    porUid[o.uid].compras += 1;
    porUid[o.uid].gasto   += Number(o.total) || 0;
  }

  const nombreUsuario = (uid) => {
    const u = usuarios.find(u => u.id === uid);
    return u?.nombre || u?.email || uid.slice(0, 8) + "…";
  };

  const top5Compras = Object.entries(porUid)
    .sort((a, b) => b[1].compras - a[1].compras)
    .slice(0, 5);

  const top5Gasto = Object.entries(porUid)
    .sort((a, b) => b[1].gasto - a[1].gasto)
    .slice(0, 5);

  return (
    <ScrollView style={d.container} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* Encabezado */}
      <View style={d.header}>
        <Text style={d.headerSub}>Panel de administración</Text>
        <Text style={d.headerTitle}>D'Aruma Café</Text>
      </View>

      {/* Botón ABIERTO / CERRADO */}
      <TouchableOpacity
        style={[d.estadoBtn, abierto ? d.estadoAbierto : d.estadoCerrado]}
        onPress={toggleEstado}
        disabled={savingEstado || abierto === null}
      >
        {savingEstado || abierto === null
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={d.estadoPunto}>●</Text>
              <Text style={d.estadoTxt}>{abierto ? "ABIERTO" : "CERRADO"}</Text>
              <Text style={d.estadoHint}>Toca para {abierto ? "cerrar" : "abrir"}</Text>
            </>
        }
      </TouchableOpacity>

      {/* Tarjetas de resumen */}
      <View style={d.cards}>
        <View style={[d.card, { borderTopColor: "#d65f04" }]}>
          <Text style={d.cardNum}>{secciones.length}</Text>
          <Text style={d.cardLabel}>Secciones</Text>
        </View>
        <View style={[d.card, { borderTopColor: "#4caf50" }]}>
          <Text style={d.cardNum}>{seccionesActivas}</Text>
          <Text style={d.cardLabel}>Activas</Text>
        </View>
        <View style={[d.card, { borderTopColor: "#d65f04" }]}>
          <Text style={d.cardNum}>{totalProductos}</Text>
          <Text style={d.cardLabel}>Productos</Text>
        </View>
        <View style={[d.card, { borderTopColor: "#4caf50" }]}>
          <Text style={d.cardNum}>{productosActivos}</Text>
          <Text style={d.cardLabel}>Visibles</Text>
        </View>
      </View>

      <TouchableOpacity style={d.btnMenu} onPress={() => navigation.navigate("Menu")}>
        <Text style={d.btnMenuTxt}>Administrar menú →</Text>
      </TouchableOpacity>

      {/* ── TOP 10 NUEVOS USUARIOS ── */}
      <Text style={d.secTitulo}>🆕 Nuevos usuarios</Text>
      <View style={d.rankingBox}>
        {top10Nuevos.length === 0
          ? <Text style={d.vacio}>Sin usuarios registrados.</Text>
          : top10Nuevos.map((u, i) => (
              <View key={u.id} style={[d.rankRow, i < top10Nuevos.length - 1 && d.rankRowBorder]}>
                <View style={d.rankNum}>
                  <Text style={d.rankNumTxt}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={d.rankNombre} numberOfLines={1}>{u.nombre || "Sin nombre"}</Text>
                  <Text style={d.rankSub} numberOfLines={1}>{u.email ?? ""}</Text>
                </View>
                <Text style={d.rankFecha}>
                  {u.creadoEn?.toDate
                    ? u.creadoEn.toDate().toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
                    : "—"}
                </Text>
              </View>
            ))
        }
      </View>

      {/* ── TOP 5 MÁS COMPRAS ── */}
      <Text style={d.secTitulo}>🛒 Top compras</Text>
      <View style={d.rankingBox}>
        {top5Compras.length === 0
          ? <Text style={d.vacio}>Sin pedidos con cuenta.</Text>
          : top5Compras.map(([uid, stats], i) => (
              <View key={uid} style={[d.rankRow, i < top5Compras.length - 1 && d.rankRowBorder]}>
                <View style={[d.rankNum, i === 0 && d.rankNum1]}>
                  <Text style={d.rankNumTxt}>{i + 1}</Text>
                </View>
                <Text style={[d.rankNombre, { flex: 1 }]} numberOfLines={1}>{nombreUsuario(uid)}</Text>
                <View style={d.pillNaranja}>
                  <Text style={d.pillTxt}>{stats.compras} pedido{stats.compras !== 1 ? "s" : ""}</Text>
                </View>
              </View>
            ))
        }
      </View>

      {/* ── TOP 5 MAYOR GASTO ── */}
      <Text style={d.secTitulo}>💰 Top gasto</Text>
      <View style={d.rankingBox}>
        {top5Gasto.length === 0
          ? <Text style={d.vacio}>Sin pedidos con cuenta.</Text>
          : top5Gasto.map(([uid, stats], i) => (
              <View key={uid} style={[d.rankRow, i < top5Gasto.length - 1 && d.rankRowBorder]}>
                <View style={[d.rankNum, i === 0 && d.rankNum1]}>
                  <Text style={d.rankNumTxt}>{i + 1}</Text>
                </View>
                <Text style={[d.rankNombre, { flex: 1 }]} numberOfLines={1}>{nombreUsuario(uid)}</Text>
                <View style={d.pillVerde}>
                  <Text style={d.pillTxt}>${stats.gasto.toLocaleString("es-MX")}</Text>
                </View>
              </View>
            ))
        }
      </View>

    </ScrollView>
  );
}

const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffeee2" },

  header:      { backgroundColor: "#532803", padding: 28, paddingTop: 36, alignItems: "center" },
  headerSub:   { color: "#f0c890", fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "900" },

  estadoBtn:     { marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  estadoAbierto: { backgroundColor: "#2e7d32" },
  estadoCerrado: { backgroundColor: "#c62828" },
  estadoPunto:   { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  estadoTxt:     { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  estadoHint:    { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 },

  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 20 },
  card:  { flex: 1, minWidth: "40%", backgroundColor: "#fff", borderRadius: 12, padding: 18, alignItems: "center", borderTopWidth: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardNum:   { fontSize: 32, fontWeight: "900", color: "#532803" },
  cardLabel: { fontSize: 12, color: "#934807", marginTop: 2, fontWeight: "600" },

  btnMenu:    { backgroundColor: "#d65f04", marginHorizontal: 20, borderRadius: 12, padding: 16, alignItems: "center" },
  btnMenuTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },

  secTitulo:  { fontSize: 15, fontWeight: "800", color: "#532803", marginHorizontal: 20, marginTop: 28, marginBottom: 10 },

  rankingBox: { backgroundColor: "#fff", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: "#e0c8b0", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  rankRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  rankRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0e0d0" },
  rankNum:    { width: 28, height: 28, borderRadius: 14, backgroundColor: "#e0c8b0", justifyContent: "center", alignItems: "center" },
  rankNum1:   { backgroundColor: "#d65f04" },
  rankNumTxt: { fontSize: 12, fontWeight: "900", color: "#532803" },
  rankNombre: { fontSize: 14, fontWeight: "700", color: "#421e02" },
  rankSub:    { fontSize: 11, color: "#a07850", marginTop: 1 },
  rankFecha:  { fontSize: 11, color: "#a07850", fontWeight: "600" },

  pillNaranja: { backgroundColor: "#fff5ec", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#d65f04" },
  pillVerde:   { backgroundColor: "#e8f5e9", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#2e7d32" },
  pillTxt:     { fontSize: 12, fontWeight: "800", color: "#421e02" },

  vacio: { color: "#bbb", fontSize: 13, textAlign: "center", padding: 20, fontStyle: "italic" },
});
