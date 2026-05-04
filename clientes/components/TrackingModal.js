import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, Platform,
} from "react-native";
import { collection, onSnapshot, doc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import EditarOrdenModal from "./EditarOrdenModal";

const ESTADOS_INFO = {
  recibido:  { label: "Recibido",   color: "#f39c12", icon: "📋" },
  preparando:{ label: "Preparando", color: "#1565c0", icon: "👨‍🍳" },
  listo:     { label: "¡Listo!",    color: "#2e7d32", icon: "✅" },
  entregado: { label: "Entregado",  color: "#666",    icon: "🎉" },
};

export function estadoColor(key) {
  return ESTADOS_INFO[key]?.color ?? "#f39c12";
}

export default function TrackingModal({ visible, ordenId, onClose }) {
  const [orden,        setOrden]        = useState(null);
  const [enFila,       setEnFila]       = useState(null);
  const [editarVisible,setEditarVisible]= useState(false);

  useEffect(() => {
    if (!visible || !ordenId) return;
    const unsub = onSnapshot(doc(db, "ordenesTienda", ordenId), snap => {
      if (snap.exists()) setOrden({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [visible, ordenId]);

  useEffect(() => {
    if (!visible || !ordenId) return;
    const q = query(collection(db, "ordenesTienda"), orderBy("creadoEn", "asc"));
    const unsub = onSnapshot(q, snap => {
      const activos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(o => ["recibido", "preparando"].includes(o.estado));
      const idx = activos.findIndex(o => o.id === ordenId);
      setEnFila(idx);
    });
    return unsub;
  }, [visible, ordenId]);

  const info      = ESTADOS_INFO[orden?.estado] ?? ESTADOS_INFO.recibido;
  const esListo   = orden?.estado === "listo";
  const entregado = orden?.estado === "entregado";

  return (
    <Modal visible={visible} animationType="slide">
      <View style={t.root}>
        <View style={t.header}>
          <Text style={t.headerTxt}>Seguimiento de pedido</Text>
        </View>

        {!orden ? (
          <ActivityIndicator color="#d65f04" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={t.body}>

            <View style={[t.numeroBubble, esListo && t.numeroBubbleListo]}>
              <Text style={t.numeroLabel}>Tu número de pedido</Text>
              <Text style={t.numeroNum}>#{orden.numero}</Text>
              <Text style={t.numeroNombre}>{orden.nombreCliente}</Text>
            </View>

            <View style={[t.estadoCard, { borderColor: info.color }]}>
              <Text style={t.estadoIco}>{info.icon}</Text>
              <Text style={[t.estadoTxt, { color: info.color }]}>{info.label}</Text>
            </View>

            {!entregado && !esListo && enFila !== null && (
              <View style={t.filaCard}>
                {enFila === 0
                  ? <Text style={t.filaTxtDestacado}>🔥 ¡Eres el siguiente!</Text>
                  : enFila > 0
                    ? <>
                        <Text style={t.filaNum}>{enFila}</Text>
                        <Text style={t.filaLabel}>pedido{enFila > 1 ? "s" : ""} antes que el tuyo</Text>
                      </>
                    : <Text style={t.filaTxt}>Calculando posición...</Text>
                }
              </View>
            )}

            {esListo && (
              <View style={t.listoCard}>
                <Text style={t.listoTxt}>🎉 ¡Tu pedido está listo para recoger!</Text>
              </View>
            )}

            {/* Botón editar — recibido + dentro de 24 h */}
            {(() => {
              const creado = orden.creadoEn?.toMillis?.() ?? 0;
              const dentroDeVentana = creado > 0 && (Date.now() - creado) < 24 * 60 * 60 * 1000;
              if (orden.estado === "recibido" && dentroDeVentana) {
                return (
                  <TouchableOpacity style={t.btnEditar} onPress={() => setEditarVisible(true)}>
                    <Text style={t.btnEditarTxt}>✏️  Modificar pedido</Text>
                  </TouchableOpacity>
                );
              }
              if (orden.estado === "recibido" && !dentroDeVentana) {
                return (
                  <View style={t.noEditCard}>
                    <Text style={t.noEditTxt}>⏰ El tiempo para modificar el pedido ha expirado (24 h).</Text>
                  </View>
                );
              }
              return (
                <View style={t.noEditCard}>
                  <Text style={t.noEditTxt}>🔒 El pedido ya está en preparación y no se puede modificar.</Text>
                </View>
              );
            })()}

            <Text style={t.resumenTitulo}>Detalle del pedido</Text>
            {(orden.items ?? []).map((item, i) => (
              <View key={i} style={t.itemRow}>
                <Text style={t.itemCant}>{item.cantidad}x</Text>
                <Text style={t.itemNom}>{item.nombre}</Text>
                <Text style={t.itemPrecio}>${item.subtotal}</Text>
              </View>
            ))}
            <View style={t.totalRow}>
              <Text style={t.totalLabel}>Total</Text>
              <Text style={t.totalNum}>${orden.total}</Text>
            </View>

          </ScrollView>
        )}

        <TouchableOpacity style={t.cerrarBtn} onPress={onClose}>
          <Text style={t.cerrarTxt}>
            {entregado ? "¡Gracias! Cerrar" : "Cerrar  (el pedido sigue activo)"}
          </Text>
        </TouchableOpacity>
      </View>

      <EditarOrdenModal
        visible={editarVisible}
        orden={orden}
        onClose={() => setEditarVisible(false)}
      />
    </Modal>
  );
}

const t = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#fff8f2" },
  header:  { backgroundColor: "#532803", padding: 16, paddingTop: Platform.OS === "ios" ? 54 : 16, alignItems: "center" },
  headerTxt: { color: "#fff", fontWeight: "800", fontSize: 17 },
  body:    { padding: 20, paddingBottom: 20 },

  numeroBubble:      { backgroundColor: "#532803", borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 14 },
  numeroBubbleListo: { backgroundColor: "#2e7d32" },
  numeroLabel:       { color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 4 },
  numeroNum:         { color: "#fff", fontSize: 64, fontWeight: "900", lineHeight: 70 },
  numeroNombre:      { color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: 4, fontWeight: "700" },

  estadoCard: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 12, gap: 14, backgroundColor: "#fff" },
  estadoIco:  { fontSize: 30 },
  estadoTxt:  { fontSize: 20, fontWeight: "800" },

  filaCard:        { backgroundColor: "#fff5ec", borderRadius: 14, padding: 20, marginBottom: 12, alignItems: "center" },
  filaNum:         { fontSize: 52, fontWeight: "900", color: "#d65f04", lineHeight: 58 },
  filaLabel:       { fontSize: 14, color: "#a07850", marginTop: 4 },
  filaTxt:         { fontSize: 14, color: "#a07850" },
  filaTxtDestacado:{ fontSize: 18, fontWeight: "800", color: "#d65f04" },

  listoCard: { backgroundColor: "#e8f5e9", borderRadius: 14, padding: 18, marginBottom: 12 },
  listoTxt:  { fontSize: 16, fontWeight: "800", color: "#2e7d32", textAlign: "center" },

  resumenTitulo: { fontSize: 15, fontWeight: "800", color: "#532803", marginBottom: 10, marginTop: 6 },
  itemRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  itemCant:  { fontSize: 13, fontWeight: "700", color: "#532803", width: 28 },
  itemNom:   { flex: 1, fontSize: 13, color: "#421e02" },
  itemPrecio:{ fontSize: 13, fontWeight: "700", color: "#d65f04" },
  totalRow:  { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e0c8b0", marginTop: 4 },
  totalLabel:{ fontWeight: "800", color: "#532803", fontSize: 15 },
  totalNum:  { fontWeight: "900", color: "#d65f04", fontSize: 17 },

  cerrarBtn: { margin: 16, marginTop: 8, padding: 16, backgroundColor: "#532803", borderRadius: 14, alignItems: "center" },
  cerrarTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },

  btnEditar:    { backgroundColor: "#fff5ec", borderWidth: 1, borderColor: "#d65f04", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12 },
  btnEditarTxt: { color: "#d65f04", fontWeight: "800", fontSize: 14 },
  noEditCard:   { backgroundColor: "#f5f5f5", borderRadius: 12, padding: 12, marginBottom: 12 },
  noEditTxt:    { color: "#888", fontSize: 13, textAlign: "center" },
});
