import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { collection, onSnapshot, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function TarjetasClienteScreen({ usuario }) {
  if (!usuario) return <PantallaBloqueo />;
  return <Contenido usuario={usuario} />;
}

function PantallaBloqueo() {
  return (
    <View style={s.bloqueo}>
      <Text style={s.bloqueoIco}>🎴</Text>
      <Text style={s.bloqueoTitulo}>Inicia sesión</Text>
      <Text style={s.bloqueoSub}>Ve a tu perfil para acceder a tus tarjetas de lealtad, regalo y cupones.</Text>
    </View>
  );
}

function Contenido({ usuario }) {
  const [tipos,          setTipos]          = useState([]);
  const [sellos,         setSellos]         = useState({});
  const [tarjetasRegalo, setTarjetasRegalo] = useState([]);
  const [codigoInput,    setCodigoInput]    = useState("");
  const [canjeando,      setCanjeando]      = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tiposTarjeta"), snap =>
      setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.activo !== false))
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios", usuario.uid, "sellos"), snap => {
      const mapa = {};
      snap.docs.forEach(d => { mapa[d.id] = d.data(); });
      setSellos(mapa);
    });
    return unsub;
  }, [usuario.uid]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tarjetasRegalo"), snap => {
      setTarjetasRegalo(
        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.uid === usuario.uid)
      );
    });
    return unsub;
  }, [usuario.uid]);

  const canjearCodigo = async () => {
    if (!codigoInput.trim()) return;
    setCanjeando(true);
    try {
      const snap = await getDocs(
        query(collection(db, "tarjetasRegalo"), where("codigo", "==", codigoInput.trim().toUpperCase()))
      );
      if (snap.empty) { Alert.alert("Código inválido", "No se encontró ese código."); return; }
      const docRef = snap.docs[0];
      const data   = docRef.data();
      if (data.canjeado)                             { Alert.alert("Ya canjeado", "Este código ya fue utilizado."); return; }
      if (data.uid && data.uid !== usuario.uid)      { Alert.alert("No disponible", "Este código pertenece a otro usuario."); return; }
      await updateDoc(doc(db, "tarjetasRegalo", docRef.id), { uid: usuario.uid, canjeado: false });
      Alert.alert("🎁 ¡Tarjeta agregada!", `Se agregó una tarjeta de $${data.valor} a tu cuenta.`);
      setCodigoInput("");
    } catch {
      Alert.alert("Error", "No se pudo canjear el código.");
    } finally {
      setCanjeando(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Tarjetas de lealtad ── */}
      <Text style={s.seccion}>Mis tarjetas de lealtad</Text>

      {tipos.length === 0
        ? <Text style={s.vacio}>No hay tarjetas disponibles aún.</Text>
        : tipos.map(tipo => {
            const sello    = sellos[tipo.id];
            const cantidad = sello?.cantidad ?? 0;
            const meta     = tipo.meta ?? 10;
            const pct      = Math.min(cantidad / meta, 1);
            const completa = cantidad >= meta;
            return (
              <View key={tipo.id} style={[s.tarjetaLealtad, completa && s.tarjetaCompleta]}>
                <View style={s.tarjetaHeader}>
                  <Text style={s.tarjetaNombre}>{tipo.nombre}</Text>
                  {completa && <Text style={s.badge}>🎉 ¡Lista para canjear!</Text>}
                </View>
                {!!tipo.descripcion && <Text style={s.tarjetaDesc}>{tipo.descripcion}</Text>}
                <Text style={s.recompensa}>Recompensa: {tipo.recompensa}</Text>

                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${pct * 100}%` }]} />
                </View>

                <View style={s.sellosGrid}>
                  {Array.from({ length: meta }).map((_, i) => (
                    <Text key={i} style={s.selloIco}>{i < cantidad ? "🟠" : "⚪"}</Text>
                  ))}
                </View>
                <Text style={s.sellosConteo}>{cantidad} de {meta} compras</Text>
              </View>
            );
          })
      }

      {/* ── Cupones / tarjetas de regalo ── */}
      <Text style={s.seccion}>Cupones y tarjetas de regalo</Text>

      <View style={s.codigoRow}>
        <TextInput
          style={s.codigoInput}
          placeholder="Ingresa un código"
          placeholderTextColor="#a07850"
          value={codigoInput}
          onChangeText={setCodigoInput}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={s.btnCanjear} onPress={canjearCodigo} disabled={canjeando}>
          {canjeando
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.btnCanjearTxt}>Canjear</Text>
          }
        </TouchableOpacity>
      </View>

      {tarjetasRegalo.length === 0
        ? <Text style={s.vacio}>No tienes cupones ni tarjetas de regalo aún.</Text>
        : tarjetasRegalo.map(t => (
            <View key={t.id} style={[s.tarjetaRegalo, t.canjeado && s.tarjetaUsada]}>
              <View style={{ flex: 1 }}>
                <Text style={s.codigoTxt}>{t.codigo}</Text>
                {!!t.nota && <Text style={s.notaTxt}>{t.nota}</Text>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.valorTxt}>${t.valor}</Text>
                <Text style={s.estadoTxt}>{t.canjeado ? "✅ Utilizada" : "⏳ Disponible"}</Text>
              </View>
            </View>
          ))
      }

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff8f2" },

  bloqueo:       { flex: 1, backgroundColor: "#fff8f2", justifyContent: "center", alignItems: "center", padding: 32 },
  bloqueoIco:    { fontSize: 52, marginBottom: 14 },
  bloqueoTitulo: { fontSize: 20, fontWeight: "900", color: "#532803", marginBottom: 8 },
  bloqueoSub:    { fontSize: 14, color: "#a07850", textAlign: "center", lineHeight: 20 },

  seccion:  { fontSize: 16, fontWeight: "800", color: "#532803", marginHorizontal: 16, marginTop: 24, marginBottom: 10 },
  vacio:    { color: "#bbb", fontSize: 13, marginHorizontal: 16, fontStyle: "italic", marginBottom: 8 },

  tarjetaLealtad: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#e0c8b0",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  tarjetaCompleta: { borderColor: "#d65f04", borderWidth: 2 },
  tarjetaHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tarjetaNombre:   { fontWeight: "800", color: "#532803", fontSize: 15 },
  badge:           { fontSize: 12, color: "#d65f04", fontWeight: "700" },
  tarjetaDesc:     { fontSize: 12, color: "#a07850", marginTop: 3 },
  recompensa:      { fontSize: 13, color: "#d65f04", fontWeight: "700", marginTop: 6 },
  barBg:           { height: 8, backgroundColor: "#f0e0d0", borderRadius: 4, marginTop: 10, marginBottom: 8 },
  barFill:         { height: 8, backgroundColor: "#d65f04", borderRadius: 4 },
  sellosGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  selloIco:        { fontSize: 18 },
  sellosConteo:    { fontSize: 11, color: "#a07850", marginTop: 6, textAlign: "right" },

  codigoRow:   { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, gap: 8 },
  codigoInput: {
    flex: 1, borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10,
    padding: 12, fontSize: 15, color: "#532803", backgroundColor: "#fff",
    letterSpacing: 2, fontWeight: "700",
  },
  btnCanjear:    { backgroundColor: "#532803", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  btnCanjearTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  tarjetaRegalo: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#e0c8b0",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  tarjetaUsada:  { opacity: 0.5 },
  codigoTxt:     { fontSize: 18, fontWeight: "900", color: "#532803", letterSpacing: 2 },
  valorTxt:      { fontSize: 18, fontWeight: "900", color: "#d65f04" },
  estadoTxt:     { fontSize: 12, color: "#a07850", marginTop: 4 },
  notaTxt:       { fontSize: 11, color: "#a07850", marginTop: 2 },
});
