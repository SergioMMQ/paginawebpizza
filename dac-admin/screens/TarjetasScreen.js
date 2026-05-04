import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, where, getDocs, setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

/* ─── helpers ─────────────────────────────────────────── */
function genCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ─── Tabs internos ────────────────────────────────────── */
const TABS = ["Lealtad", "Regalos", "Sellos"];

export default function TarjetasScreen() {
  const [tab, setTab] = useState(0);

  return (
    <View style={s.root}>
      <View style={s.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === i && s.tabActivo]}
            onPress={() => setTab(i)}
          >
            <Text style={[s.tabTxt, tab === i && s.tabTxtActivo]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 0 && <LealtadTab />}
      {tab === 1 && <RegalosTab />}
      {tab === 2 && <SellosTab />}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 1 — TIPOS DE TARJETA DE LEALTAD
══════════════════════════════════════════════════════════ */
function LealtadTab() {
  const [tipos,     setTipos]     = useState([]);
  const [modal,     setModal]     = useState(false);
  const [editando,  setEditando]  = useState(null);
  const [nombre,    setNombre]    = useState("");
  const [desc,      setDesc]      = useState("");
  const [meta,      setMeta]      = useState("10");
  const [recompensa,setRecompensa]= useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tiposTarjeta"), snap =>
      setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const abrir = (tipo = null) => {
    setEditando(tipo);
    setNombre(tipo?.nombre ?? "");
    setDesc(tipo?.descripcion ?? "");
    setMeta(String(tipo?.meta ?? "10"));
    setRecompensa(tipo?.recompensa ?? "");
    setModal(true);
  };

  const guardar = async () => {
    if (!nombre.trim() || !recompensa.trim()) return;
    setGuardando(true);
    const data = {
      nombre: nombre.trim(),
      descripcion: desc.trim(),
      meta: parseInt(meta) || 10,
      recompensa: recompensa.trim(),
      activo: true,
    };
    if (editando) {
      await updateDoc(doc(db, "tiposTarjeta", editando.id), data);
    } else {
      await addDoc(collection(db, "tiposTarjeta"), data);
    }
    setGuardando(false);
    setModal(false);
  };

  const eliminar = (tipo) => {
    Alert.alert("Eliminar", `¿Eliminar "${tipo.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteDoc(doc(db, "tiposTarjeta", tipo.id)) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <TouchableOpacity style={s.btnCrear} onPress={() => abrir()}>
        <Text style={s.btnCrearTxt}>+ Nueva tarjeta de lealtad</Text>
      </TouchableOpacity>

      {tipos.length === 0 && <Text style={s.vacio}>Sin tarjetas de lealtad aún.</Text>}

      {tipos.map(tipo => (
        <View key={tipo.id} style={s.card}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitulo}>{tipo.nombre}</Text>
            <Text style={s.cardSub}>Meta: {tipo.meta} compras · Recompensa: {tipo.recompensa}</Text>
            {!!tipo.descripcion && <Text style={s.cardDesc}>{tipo.descripcion}</Text>}
          </View>
          <View style={s.cardAcciones}>
            <TouchableOpacity onPress={() => abrir(tipo)} style={s.btnIcono}>
              <Text>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => eliminar(tipo)} style={s.btnIcono}>
              <Text>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>{editando ? "Editar" : "Nueva"} tarjeta de lealtad</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nombre *</Text>
              <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Frappe Frecuente" />
              <Text style={s.label}>Descripción</Text>
              <TextInput style={s.input} value={desc} onChangeText={setDesc} placeholder="Breve descripción" />
              <Text style={s.label}>Compras necesarias *</Text>
              <TextInput style={s.input} value={meta} onChangeText={setMeta} keyboardType="numeric" placeholder="10" />
              <Text style={s.label}>Recompensa *</Text>
              <TextInput style={s.input} value={recompensa} onChangeText={setRecompensa} placeholder="Ej: 1 frappe gratis" />
            </ScrollView>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setModal(false)}>
                <Text style={s.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGuardar} onPress={guardar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnGuardarTxt}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 2 — TARJETAS DE REGALO
══════════════════════════════════════════════════════════ */
function RegalosTab() {
  const [tarjetas,  setTarjetas]  = useState([]);
  const [modal,     setModal]     = useState(false);
  const [valor,     setValor]     = useState("");
  const [nota,      setNota]      = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tarjetasRegalo"), snap =>
      setTarjetas(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.creadoEn ?? 0) - (a.creadoEn ?? 0))
      )
    );
    return unsub;
  }, []);

  const crear = async () => {
    if (!valor.trim()) return;
    setGuardando(true);
    await addDoc(collection(db, "tarjetasRegalo"), {
      codigo:   genCodigo(),
      valor:    parseFloat(valor) || 0,
      nota:     nota.trim(),
      canjeado: false,
      uid:      null,
      creadoEn: Date.now(),
    });
    setGuardando(false);
    setValor("");
    setNota("");
    setModal(false);
  };

  const eliminar = (t) => {
    Alert.alert("Eliminar", `¿Eliminar tarjeta ${t.codigo}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteDoc(doc(db, "tarjetasRegalo", t.id)) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <TouchableOpacity style={s.btnCrear} onPress={() => setModal(true)}>
        <Text style={s.btnCrearTxt}>+ Generar tarjeta de regalo</Text>
      </TouchableOpacity>

      {tarjetas.length === 0 && <Text style={s.vacio}>Sin tarjetas generadas aún.</Text>}

      {tarjetas.map(t => (
        <View key={t.id} style={[s.card, t.canjeado && s.cardCanjeado]}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardCodigo}>{t.codigo}</Text>
            <Text style={s.cardSub}>${t.valor} · {t.canjeado ? "✅ Canjeada" : "⏳ Sin canjear"}</Text>
            {!!t.nota && <Text style={s.cardDesc}>{t.nota}</Text>}
            {!!t.uid && <Text style={s.cardDesc}>Usuario: {t.uid.substring(0, 12)}…</Text>}
          </View>
          <TouchableOpacity onPress={() => eliminar(t)} style={s.btnIcono}>
            <Text>🗑</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={modal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Nueva tarjeta de regalo</Text>
            <Text style={s.label}>Valor ($) *</Text>
            <TextInput style={s.input} value={valor} onChangeText={setValor} keyboardType="numeric" placeholder="50" />
            <Text style={s.label}>Nota (opcional)</Text>
            <TextInput style={s.input} value={nota} onChangeText={setNota} placeholder="Ej: Regalo de cumpleaños" />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setModal(false)}>
                <Text style={s.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGuardar} onPress={crear} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnGuardarTxt}>Generar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 3 — AGREGAR SELLOS A USUARIOS
══════════════════════════════════════════════════════════ */
function SellosTab() {
  const [email,     setEmail]     = useState("");
  const [usuario,   setUsuario]   = useState(null);
  const [tipos,     setTipos]     = useState([]);
  const [sellos,    setSellos]    = useState({});
  const [buscando,  setBuscando]  = useState(false);
  const [guardando, setGuardando] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tiposTarjeta"), snap =>
      setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const buscar = async () => {
    if (!email.trim()) return;
    setBuscando(true);
    try {
      const q    = query(collection(db, "usuarios"), where("email", "==", email.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert("No encontrado", "No existe un usuario con ese correo.");
        setUsuario(null);
        setSellos({});
      } else {
        const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setUsuario(u);
        const sellosSnap = await getDocs(collection(db, "usuarios", u.id, "sellos"));
        const mapa = {};
        sellosSnap.docs.forEach(d => { mapa[d.id] = d.data(); });
        setSellos(mapa);
      }
    } catch {
      Alert.alert("Error", "No se pudo buscar el usuario.");
    } finally {
      setBuscando(false);
    }
  };

  const agregarSello = async (tipo) => {
    if (!usuario) return;
    setGuardando(tipo.id);
    const ref      = doc(db, "usuarios", usuario.id, "sellos", tipo.id);
    const actual   = sellos[tipo.id]?.cantidad ?? 0;
    const canjeado = sellos[tipo.id]?.canjeado ?? false;
    const nueva    = canjeado ? 1 : actual + 1;
    const data     = { cantidad: nueva, canjeado: false, meta: tipo.meta, recompensa: tipo.recompensa };
    await setDoc(ref, data);
    setSellos(prev => ({ ...prev, [tipo.id]: data }));
    setGuardando(null);

    if (nueva >= tipo.meta) {
      Alert.alert("🎉 ¡Meta alcanzada!", `${usuario.nombre ?? email} completó "${tipo.nombre}".\nRecompensa: ${tipo.recompensa}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Buscar cliente por correo</Text>
      <View style={s.searchRow}>
        <TextInput
          style={[s.input, { flex: 1, marginBottom: 0 }]}
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={s.btnBuscar} onPress={buscar} disabled={buscando}>
          {buscando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnBuscarTxt}>Buscar</Text>}
        </TouchableOpacity>
      </View>

      {usuario && (
        <>
          <View style={s.usuarioCard}>
            <Text style={s.usuarioNombre}>{usuario.nombre ?? "Sin nombre"}</Text>
            <Text style={s.usuarioEmail}>{usuario.email}</Text>
          </View>

          {tipos.length === 0 && <Text style={s.vacio}>No hay tipos de tarjeta creados.</Text>}

          {tipos.map(tipo => {
            const sello    = sellos[tipo.id];
            const cantidad = sello?.cantidad ?? 0;
            const meta     = tipo.meta ?? 10;
            const pct      = Math.min(cantidad / meta, 1);

            return (
              <View key={tipo.id} style={s.selloCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitulo}>{tipo.nombre}</Text>
                  <Text style={s.cardSub}>{cantidad}/{meta} · {tipo.recompensa}</Text>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <View style={s.sellosRow}>
                    {Array.from({ length: meta }).map((_, i) => (
                      <Text key={i} style={{ fontSize: 16 }}>{i < cantidad ? "🟠" : "⚪"}</Text>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  style={s.btnSello}
                  onPress={() => agregarSello(tipo)}
                  disabled={guardando === tipo.id}
                >
                  {guardando === tipo.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.btnSelloTxt}>+1 sello</Text>
                  }
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

/* ─── estilos ─────────────────────────────────────────── */
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#ffeee2" },
  tabs:          { flexDirection: "row", backgroundColor: "#532803" },
  tabBtn:        { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActivo:     { borderBottomWidth: 3, borderBottomColor: "#d65f04" },
  tabTxt:        { color: "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: 13 },
  tabTxtActivo:  { color: "#fff" },
  pad:           { padding: 16, paddingBottom: 40 },

  btnCrear:      { backgroundColor: "#d65f04", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
  btnCrearTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  vacio:         { color: "#aaa", textAlign: "center", marginTop: 20, fontStyle: "italic" },

  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#e0c8b0",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardCanjeado:  { opacity: 0.5 },
  cardTitulo:    { fontWeight: "800", color: "#421e02", fontSize: 14 },
  cardCodigo:    { fontWeight: "900", color: "#532803", fontSize: 20, letterSpacing: 2 },
  cardSub:       { fontSize: 12, color: "#d65f04", marginTop: 2 },
  cardDesc:      { fontSize: 11, color: "#a07850", marginTop: 3 },
  cardAcciones:  { flexDirection: "row", gap: 6 },
  btnIcono:      { padding: 6 },

  label:         { fontSize: 11, fontWeight: "700", color: "#934807", marginBottom: 4, marginTop: 12, textTransform: "uppercase" },
  input: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12,
    fontSize: 14, borderWidth: 1, borderColor: "#e0c8b0", color: "#421e02", marginBottom: 4,
  },

  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24, maxHeight: "85%",
  },
  modalTitulo:   { fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 12, textAlign: "center" },
  modalBtns:     { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancelar:   { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelarTxt:{ color: "#934807", fontWeight: "700" },
  btnGuardar:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnGuardarTxt: { color: "#fff", fontWeight: "700" },

  searchRow:     { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 4 },
  btnBuscar:     { backgroundColor: "#532803", borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  btnBuscarTxt:  { color: "#fff", fontWeight: "700" },

  usuarioCard:   { backgroundColor: "#fff5ec", borderRadius: 12, padding: 14, marginVertical: 12, borderWidth: 1, borderColor: "#d65f04" },
  usuarioNombre: { fontWeight: "800", color: "#532803", fontSize: 16 },
  usuarioEmail:  { color: "#a07850", fontSize: 12, marginTop: 2 },

  selloCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#e0c8b0",
  },
  barBg:         { height: 6, backgroundColor: "#f0e0d0", borderRadius: 3, marginTop: 8, marginBottom: 6 },
  barFill:       { height: 6, backgroundColor: "#d65f04", borderRadius: 3 },
  sellosRow:     { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  btnSello:      { backgroundColor: "#d65f04", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  btnSelloTxt:   { color: "#fff", fontWeight: "700", fontSize: 13 },
});
