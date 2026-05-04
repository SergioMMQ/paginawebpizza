import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, updateDoc, doc,
  orderBy, query, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const ESTADOS = [
  { key: "pendiente",   label: "Pendiente",        color: "#f39c12", bg: "#fef9e7" },
  { key: "revision",    label: "Pide modificación", color: "#7b1fa2", bg: "#f3e5f5" },
  { key: "confirmado",  label: "Confirmado",        color: "#2e7d32", bg: "#e8f5e9" },
  { key: "listo",       label: "¡Listo!",           color: "#1565c0", bg: "#e3f2fd" },
  { key: "cancelado",   label: "Cancelado",         color: "#c62828", bg: "#ffebee" },
];

function estadoInfo(key) {
  return ESTADOS.find(e => e.key === key) ?? ESTADOS[0];
}

export default function SolicitudesScreen() {
  const [pedidos,   setPedidos]   = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [seleccion, setSeleccion] = useState(null);
  const [filtro,    setFiltro]    = useState("todos");

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("creadoEn", "desc"));
    return onSnapshot(q, snap => {
      setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
  }, []);

  const pedidosFiltrados = filtro === "todos"
    ? pedidos
    : pedidos.filter(p => p.estado === filtro);

  return (
    <View style={s.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filtrosBar} contentContainerStyle={s.filtrosPad}>
        {[{ key: "todos", label: "Todos" }, ...ESTADOS].map(e => (
          <TouchableOpacity
            key={e.key}
            style={[s.filtroBtn, filtro === e.key && s.filtroBtnActivo]}
            onPress={() => setFiltro(e.key)}
          >
            <Text style={[s.filtroTxt, filtro === e.key && s.filtroTxtActivo]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cargando
        ? <ActivityIndicator color="#d65f04" style={{ marginTop: 30 }} />
        : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {pedidosFiltrados.length === 0 &&
              <Text style={s.vacio}>No hay solicitudes en esta categoría.</Text>}

            {pedidosFiltrados.map(p => {
              const e      = estadoInfo(p.estado);
              const unread = p.mensajesCliente ?? 0;
              return (
                <TouchableOpacity key={p.id} style={s.card} onPress={() => setSeleccion(p)}>
                  <View style={s.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardEmail}>{p.email}</Text>
                      <Text style={s.cardDesc} numberOfLines={2}>{p.descripcion}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={[s.badge, { backgroundColor: e.bg }]}>
                        <Text style={[s.badgeTxt, { color: e.color }]}>{e.label}</Text>
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
                    <Text style={s.metaTxt}>📞 {p.telefono}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      }

      {seleccion && (
        <ChatModal
          pedido={seleccion}
          onClose={() => setSeleccion(null)}
        />
      )}
    </View>
  );
}

/* ── Modal con chat ─────────────────────────────────── */
function ChatModal({ pedido, onClose }) {
  const [mensajes,  setMensajes]  = useState([]);
  const [texto,     setTexto]     = useState("");
  const [enviando,  setEnviando]  = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "pedidos", pedido.id, "mensajes"),
      orderBy("creadoEn", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    // Limpiar contador de mensajes no leídos del cliente
    updateDoc(doc(db, "pedidos", pedido.id), { mensajesCliente: 0 });
    return unsub;
  }, [pedido.id]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    await addDoc(collection(db, "pedidos", pedido.id, "mensajes"), {
      texto:    texto.trim(),
      autor:    "admin",
      creadoEn: serverTimestamp(),
    });
    setTexto("");
    setEnviando(false);
  };

  const cambiarEstado = async (nuevoEstado) => {
    setCambiando(nuevoEstado);
    const e = estadoInfo(nuevoEstado);
    await Promise.all([
      updateDoc(doc(db, "pedidos", pedido.id), {
        estado: nuevoEstado,
        mensajesAdmin: (pedido.mensajesAdmin ?? 0) + 1,
      }),
      addDoc(collection(db, "pedidos", pedido.id, "mensajes"), {
        texto:    `Estado actualizado: ${e.label}`,
        autor:    "sistema",
        creadoEn: serverTimestamp(),
      }),
    ]);
    setCambiando(false);
  };

  const estado = estadoInfo(pedido.estado);

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
              <Text style={c.headerEmail} numberOfLines={1}>{pedido.email}</Text>
              <Text style={c.headerDesc} numberOfLines={1}>{pedido.descripcion}</Text>
            </View>
            <View style={[c.estadoBadge, { backgroundColor: estado.bg }]}>
              <Text style={[c.estadoTxt, { color: estado.color }]}>{estado.label}</Text>
            </View>
          </View>

          {/* Info resumen */}
          <View style={c.resumen}>
            <Text style={c.resumenTxt}>📅 {pedido.fechaEvento}</Text>
            {!!pedido.cantidad && <Text style={c.resumenTxt}>🔢 {pedido.cantidad}</Text>}
            <Text style={c.resumenTxt}>📞 {pedido.telefono}</Text>
          </View>
          {!!pedido.notas && <Text style={c.notas}>📝 {pedido.notas}</Text>}

          {/* Mensajes */}
          <ScrollView
            ref={scrollRef}
            style={c.mensajesScroll}
            contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {mensajes.length === 0 && (
              <Text style={c.sinMensajes}>Inicia la conversación con el cliente.</Text>
            )}
            {mensajes.map(m => <BurbujaMensaje key={m.id} m={m} />)}
          </ScrollView>

          {/* Cambiar estado */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={c.estadosBar} contentContainerStyle={c.estadosPad}>
            {ESTADOS.map(e => (
              <TouchableOpacity
                key={e.key}
                style={[c.estadoBtn, { backgroundColor: e.bg, borderColor: e.color },
                  pedido.estado === e.key && { borderWidth: 2 }]}
                onPress={() => cambiarEstado(e.key)}
                disabled={cambiando === e.key || pedido.estado === e.key}
              >
                {cambiando === e.key
                  ? <ActivityIndicator color={e.color} size="small" />
                  : <Text style={[c.estadoBtnTxt, { color: e.color }]}>{e.label}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input */}
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

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BurbujaMensaje({ m }) {
  if (m.autor === "sistema") {
    return (
      <View style={c.sistemaRow}>
        <Text style={c.sistemaTxt}>{m.texto}</Text>
      </View>
    );
  }
  const esAdmin = m.autor === "admin";
  return (
    <View style={[c.burbujaRow, esAdmin ? c.burbujaRowAdmin : c.burbujaRowCliente]}>
      <View style={[c.burbuja, esAdmin ? c.burbujaAdmin : c.burbujaCliente]}>
        <Text style={c.burbujaLabel}>{esAdmin ? "Negocio" : "Cliente"}</Text>
        <Text style={[c.burbujaTxt, esAdmin && { color: "#fff" }]}>{m.texto}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#ffeee2" },
  filtrosBar:     { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: "#e0c8b0", backgroundColor: "#fff8f2" },
  filtrosPad:     { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filtroBtn:      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: "#e0c8b0", backgroundColor: "#fff" },
  filtroBtnActivo:{ backgroundColor: "#532803", borderColor: "#532803" },
  filtroTxt:      { fontSize: 12, fontWeight: "700", color: "#a07850" },
  filtroTxtActivo:{ color: "#fff" },
  vacio:          { color: "#aaa", textAlign: "center", marginTop: 30, fontStyle: "italic" },
  card:           { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e0c8b0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  cardEmail:      { fontSize: 11, color: "#a07850", marginBottom: 2 },
  cardDesc:       { fontSize: 14, fontWeight: "700", color: "#421e02" },
  badge:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:       { fontSize: 11, fontWeight: "800" },
  unreadBadge:    { backgroundColor: "#d65f04", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  unreadTxt:      { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardMeta:       { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaTxt:        { fontSize: 12, color: "#a07850" },
});

const c = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#fff8f2" },
  header:         { backgroundColor: "#532803", flexDirection: "row", alignItems: "center", padding: 14, paddingTop: Platform.OS === "ios" ? 52 : 14, gap: 10 },
  backBtn:        { padding: 4 },
  backTxt:        { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerEmail:    { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  headerDesc:     { color: "#fff", fontWeight: "700", fontSize: 14 },
  estadoBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTxt:      { fontSize: 11, fontWeight: "800" },
  resumen:        { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 10, paddingHorizontal: 14, backgroundColor: "#fff5ec", borderBottomWidth: 1, borderBottomColor: "#e0c8b0" },
  resumenTxt:     { fontSize: 12, color: "#a07850" },
  notas:          { fontSize: 12, color: "#934807", paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "#fff5ec", borderBottomWidth: 1, borderBottomColor: "#e0c8b0" },
  mensajesScroll: { flex: 1 },
  sinMensajes:    { color: "#ccc", textAlign: "center", marginTop: 20, fontStyle: "italic" },

  burbujaRow:       { marginBottom: 8 },
  burbujaRowAdmin:  { alignItems: "flex-end" },
  burbujaRowCliente:{ alignItems: "flex-start" },
  burbuja:          { maxWidth: "80%", borderRadius: 14, padding: 10, paddingHorizontal: 12 },
  burbujaAdmin:     { backgroundColor: "#532803", borderBottomRightRadius: 4 },
  burbujaCliente:   { backgroundColor: "#f0e0d0", borderBottomLeftRadius: 4 },
  burbujaLabel:     { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700", marginBottom: 2 },
  burbujaTxt:       { fontSize: 14, color: "#421e02" },
  sistemaRow:       { alignItems: "center", marginVertical: 6 },
  sistemaTxt:       { fontSize: 11, color: "#a07850", backgroundColor: "#f0e0d0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },

  estadosBar:     { maxHeight: 50, borderTopWidth: 1, borderTopColor: "#e0c8b0", backgroundColor: "#fff" },
  estadosPad:     { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  estadoBtn:      { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  estadoBtnTxt:   { fontSize: 12, fontWeight: "800" },

  inputRow:       { flexDirection: "row", padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: "#e0c8b0", backgroundColor: "#fff" },
  input:          { flex: 1, backgroundColor: "#faf5ef", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#421e02", borderWidth: 1, borderColor: "#e0c8b0", maxHeight: 100 },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: "#d65f04", justifyContent: "center", alignItems: "center" },
  sendTxt:        { color: "#fff", fontSize: 18 },
});
