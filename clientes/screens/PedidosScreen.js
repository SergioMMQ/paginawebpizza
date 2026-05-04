import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, addDoc, query, where,
  orderBy, serverTimestamp, updateDoc, doc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const ESTADOS = {
  pendiente:  { label: "Pendiente",         color: "#f39c12", bg: "#fef9e7" },
  revision:   { label: "Pide modificación", color: "#7b1fa2", bg: "#f3e5f5" },
  confirmado: { label: "Confirmado",        color: "#2e7d32", bg: "#e8f5e9" },
  listo:      { label: "¡Listo!",           color: "#1565c0", bg: "#e3f2fd" },
  cancelado:  { label: "Cancelado",         color: "#c62828", bg: "#ffebee" },
};

export default function PedidosScreen({ usuario }) {
  const [pedidos,  setPedidos]  = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(false);
  const [chat,     setChat]     = useState(null);

  // form
  const [descripcion, setDescripcion] = useState("");
  const [cantidad,    setCantidad]    = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [telefono,    setTelefono]    = useState("");
  const [notas,       setNotas]       = useState("");
  const [guardando,   setGuardando]   = useState(false);

  useEffect(() => {
    if (!usuario) return;
    const q = query(
      collection(db, "pedidos"),
      where("uid", "==", usuario.uid),
      orderBy("creadoEn", "desc")
    );
    return onSnapshot(q, snap => {
      setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
  }, [usuario]);

  const limpiar = () => {
    setDescripcion(""); setCantidad(""); setFechaEvento("");
    setTelefono(""); setNotas("");
  };

  const enviar = async () => {
    if (!descripcion.trim() || !fechaEvento.trim() || !telefono.trim()) {
      Alert.alert("Campos requeridos", "Descripción, fecha y teléfono son obligatorios.");
      return;
    }
    setGuardando(true);
    try {
      await addDoc(collection(db, "pedidos"), {
        uid:         usuario.uid,
        email:       usuario.email,
        descripcion: descripcion.trim(),
        cantidad:    cantidad.trim(),
        fechaEvento: fechaEvento.trim(),
        telefono:    telefono.trim(),
        notas:       notas.trim(),
        estado:      "pendiente",
        mensajesAdmin:   0,
        mensajesCliente: 0,
        creadoEn:    serverTimestamp(),
      });
      limpiar();
      setModal(false);
      Alert.alert("✅ Solicitud enviada", "Te avisaremos cuando el negocio responda.");
    } catch {
      Alert.alert("Error", "No se pudo enviar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) {
    return (
      <View style={s.center}>
        <Text style={s.lockIco}>🔒</Text>
        <Text style={s.lockTxt}>Inicia sesión para hacer pedidos</Text>
        <Text style={s.lockSub}>Ve a la pestaña Perfil para acceder</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <TouchableOpacity style={s.btnNuevo} onPress={() => setModal(true)}>
          <Text style={s.btnNuevoTxt}>+ Nueva solicitud de pedido</Text>
        </TouchableOpacity>

        {cargando && <ActivityIndicator color="#d65f04" style={{ marginTop: 20 }} />}

        {!cargando && pedidos.length === 0 && (
          <View style={s.vacio}>
            <Text style={s.vacioIco}>📋</Text>
            <Text style={s.vacioTxt}>Aún no tienes pedidos.</Text>
            <Text style={s.vacioSub}>Haz una solicitud para fechas especiales.</Text>
          </View>
        )}

        {pedidos.map(p => {
          const estado  = ESTADOS[p.estado] ?? ESTADOS.pendiente;
          const unread  = p.mensajesAdmin ?? 0;
          return (
            <TouchableOpacity key={p.id} style={s.card} onPress={() => setChat(p)}>
              <View style={s.cardTop}>
                <Text style={s.cardDesc} numberOfLines={2}>{p.descripcion}</Text>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[s.estadoBadge, { backgroundColor: estado.bg }]}>
                    <Text style={[s.estadoTxt, { color: estado.color }]}>{estado.label}</Text>
                  </View>
                  {unread > 0 && (
                    <View style={s.unreadBadge}>
                      <Text style={s.unreadTxt}>{unread} nuevo{unread > 1 ? "s" : ""}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={s.cardMeta}>
                <Text style={s.metaTxt}>📅 {p.fechaEvento}</Text>
                {!!p.cantidad && <Text style={s.metaTxt}>🔢 {p.cantidad}</Text>}
              </View>
              <Text style={s.verChat}>💬 Ver conversación →</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal nuevo pedido */}
      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Nueva solicitud</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "82%" }}>
              <Text style={s.label}>¿Qué quieres pedir? *</Text>
              <TextInput style={s.input} value={descripcion} onChangeText={setDescripcion}
                placeholder="Ej: 5 pizzas hawaianas" multiline />
              <Text style={s.label}>Cantidad</Text>
              <TextInput style={s.input} value={cantidad} onChangeText={setCantidad}
                placeholder="Ej: 5 piezas" />
              <Text style={s.label}>Fecha y hora del evento *</Text>
              <TextInput style={s.input} value={fechaEvento} onChangeText={setFechaEvento}
                placeholder="Ej: Domingo 20 de abril, 2pm" />
              <Text style={s.label}>Teléfono de contacto *</Text>
              <TextInput style={s.input} value={telefono} onChangeText={setTelefono}
                placeholder="Ej: 4471234567" keyboardType="phone-pad" />
              <Text style={s.label}>Notas adicionales</Text>
              <TextInput style={[s.input, { minHeight: 72, textAlignVertical: "top" }]}
                value={notas} onChangeText={setNotas}
                placeholder="Ingredientes, alergias, indicaciones..." multiline />
            </ScrollView>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => { setModal(false); limpiar(); }}>
                <Text style={s.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnEnviar} onPress={enviar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnEnviarTxt}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Chat modal */}
      {chat && <ChatModal pedido={chat} onClose={() => setChat(null)} />}
    </View>
  );
}

/* ── Chat por pedido ────────────────────────────────── */
function ChatModal({ pedido, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto,    setTexto]    = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef(null);

  const estado = ESTADOS[pedido.estado] ?? ESTADOS.pendiente;

  useEffect(() => {
    const q = query(
      collection(db, "pedidos", pedido.id, "mensajes"),
      orderBy("creadoEn", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    // Marcar mensajes del admin como leídos
    updateDoc(doc(db, "pedidos", pedido.id), { mensajesAdmin: 0 });
    return unsub;
  }, [pedido.id]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    await Promise.all([
      addDoc(collection(db, "pedidos", pedido.id, "mensajes"), {
        texto:    texto.trim(),
        autor:    "cliente",
        creadoEn: serverTimestamp(),
      }),
      updateDoc(doc(db, "pedidos", pedido.id), {
        mensajesCliente: (pedido.mensajesCliente ?? 0) + 1,
      }),
    ]);
    setTexto("");
    setEnviando(false);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={c.root}>

          {/* Header */}
          <View style={c.header}>
            <TouchableOpacity onPress={onClose} style={c.backBtn}>
              <Text style={c.backTxt}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={c.headerTitulo} numberOfLines={1}>{pedido.descripcion}</Text>
              <Text style={c.headerFecha}>📅 {pedido.fechaEvento}</Text>
            </View>
            <View style={[c.estadoBadge, { backgroundColor: estado.bg }]}>
              <Text style={[c.estadoTxt, { color: estado.color }]}>{estado.label}</Text>
            </View>
          </View>

          {/* Mensajes */}
          <ScrollView
            ref={scrollRef}
            style={c.mensajesScroll}
            contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {/* Mensaje inicial del sistema con datos del pedido */}
            <View style={c.sistemaRow}>
              <Text style={c.sistemaTxt}>Solicitud enviada</Text>
            </View>
            {!!pedido.notas && (
              <View style={c.sistemaRow}>
                <Text style={c.sistemaTxt}>📝 {pedido.notas}</Text>
              </View>
            )}

            {mensajes.length === 0 && (
              <Text style={c.sinMensajes}>El negocio responderá pronto.</Text>
            )}
            {mensajes.map(m => <BurbujaMensaje key={m.id} m={m} esCliente={m.autor === "cliente"} />)}
          </ScrollView>

          {/* Input — solo si no está cancelado o listo */}
          {pedido.estado !== "cancelado" && pedido.estado !== "listo" && (
            <View style={c.inputRow}>
              <TextInput
                style={c.input}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#a07850"
                value={texto}
                onChangeText={setTexto}
                multiline
              />
              <TouchableOpacity style={c.sendBtn} onPress={enviar} disabled={enviando || !texto.trim()}>
                {enviando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={c.sendTxt}>➤</Text>}
              </TouchableOpacity>
            </View>
          )}

          {(pedido.estado === "cancelado" || pedido.estado === "listo") && (
            <View style={c.cerradoBar}>
              <Text style={c.cerradoTxt}>
                {pedido.estado === "listo" ? "🎉 Pedido completado" : "Este pedido fue cancelado"}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BurbujaMensaje({ m, esCliente }) {
  if (m.autor === "sistema") {
    return (
      <View style={c.sistemaRow}>
        <Text style={c.sistemaTxt}>{m.texto}</Text>
      </View>
    );
  }
  return (
    <View style={[c.burbujaRow, esCliente ? c.burbujaRowDer : c.burbujaRowIzq]}>
      <View style={[c.burbuja, esCliente ? c.burbujaCliente : c.burbujaAdmin]}>
        <Text style={c.burbujaLabel}>{esCliente ? "Tú" : "D'Aruma Cafe"}</Text>
        <Text style={[c.burbujaTxt, !esCliente && { color: "#fff" }]}>{m.texto}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#fff8f2" },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff8f2", padding: 24 },
  lockIco:     { fontSize: 48, marginBottom: 12 },
  lockTxt:     { fontSize: 18, fontWeight: "800", color: "#532803", textAlign: "center" },
  lockSub:     { fontSize: 13, color: "#a07850", marginTop: 6, textAlign: "center" },
  btnNuevo:    { backgroundColor: "#d65f04", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 20 },
  btnNuevoTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  vacio:       { alignItems: "center", marginTop: 40 },
  vacioIco:    { fontSize: 48, marginBottom: 10 },
  vacioTxt:    { fontSize: 16, fontWeight: "700", color: "#532803" },
  vacioSub:    { fontSize: 13, color: "#a07850", marginTop: 4 },
  card:        { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e0c8b0", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardDesc:    { fontSize: 15, fontWeight: "700", color: "#421e02", flex: 1 },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTxt:   { fontSize: 11, fontWeight: "800" },
  unreadBadge: { backgroundColor: "#d65f04", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  unreadTxt:   { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardMeta:    { flexDirection: "row", gap: 16, marginTop: 8 },
  metaTxt:     { fontSize: 12, color: "#a07850" },
  verChat:     { fontSize: 12, color: "#d65f04", fontWeight: "700", marginTop: 8, textAlign: "right" },
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox:    { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  modalTitulo: { fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 12, textAlign: "center" },
  label:       { fontSize: 11, fontWeight: "700", color: "#934807", marginBottom: 4, marginTop: 12, textTransform: "uppercase" },
  input:       { backgroundColor: "#faf5ef", borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#e0c8b0", color: "#421e02" },
  modalBtns:   { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancelar: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelarTxt: { color: "#934807", fontWeight: "700" },
  btnEnviar:   { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnEnviarTxt:{ color: "#fff", fontWeight: "800" },
});

const c = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#fff8f2" },
  header:        { backgroundColor: "#532803", flexDirection: "row", alignItems: "center", padding: 14, paddingTop: Platform.OS === "ios" ? 52 : 14, gap: 10 },
  backBtn:       { padding: 4 },
  backTxt:       { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerTitulo:  { color: "#fff", fontWeight: "700", fontSize: 14 },
  headerFecha:   { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 },
  estadoBadge:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTxt:     { fontSize: 11, fontWeight: "800" },
  mensajesScroll:{ flex: 1 },
  sinMensajes:   { color: "#ccc", textAlign: "center", marginTop: 20, fontStyle: "italic" },
  burbujaRow:    { marginBottom: 8 },
  burbujaRowDer: { alignItems: "flex-end" },
  burbujaRowIzq: { alignItems: "flex-start" },
  burbuja:       { maxWidth: "80%", borderRadius: 14, padding: 10, paddingHorizontal: 12 },
  burbujaCliente:{ backgroundColor: "#d65f04", borderBottomRightRadius: 4 },
  burbujaAdmin:  { backgroundColor: "#532803", borderBottomLeftRadius: 4 },
  burbujaLabel:  { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700", marginBottom: 2 },
  burbujaTxt:    { fontSize: 14, color: "#fff" },
  sistemaRow:    { alignItems: "center", marginVertical: 6 },
  sistemaTxt:    { fontSize: 11, color: "#a07850", backgroundColor: "#f0e0d0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  inputRow:      { flexDirection: "row", padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: "#e0c8b0", backgroundColor: "#fff" },
  input:         { flex: 1, backgroundColor: "#faf5ef", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#421e02", borderWidth: 1, borderColor: "#e0c8b0", maxHeight: 100 },
  sendBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: "#d65f04", justifyContent: "center", alignItems: "center" },
  sendTxt:       { color: "#fff", fontSize: 18 },
  cerradoBar:    { padding: 14, backgroundColor: "#f5f5f5", alignItems: "center", borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  cerradoTxt:    { fontSize: 13, color: "#777", fontWeight: "700" },
});
