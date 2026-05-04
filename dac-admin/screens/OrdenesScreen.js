import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Alert, Platform,
} from "react-native";
import {
  collection, onSnapshot, updateDoc, doc, query, orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const ESTADOS = [
  { key: "recibido",  label: "Recibido",   color: "#f39c12", bg: "#fef9e7", next: "preparando", nextLabel: "Preparar" },
  { key: "preparando",label: "Preparando", color: "#1565c0", bg: "#e3f2fd", next: "listo",      nextLabel: "¡Listo!"  },
  { key: "listo",     label: "¡Listo!",    color: "#2e7d32", bg: "#e8f5e9", next: "entregado",  nextLabel: "Entregado"},
  { key: "entregado", label: "Entregado",  color: "#666",    bg: "#f5f5f5", next: null,         nextLabel: null       },
];

function estadoInfo(key) {
  return ESTADOS.find(e => e.key === key) ?? ESTADOS[0];
}

function tiempoEspera(creadoEn) {
  if (!creadoEn?.toMillis) return null;
  const mins = Math.floor((Date.now() - creadoEn.toMillis()) / 60000);
  return mins < 1 ? "< 1 min" : `${mins} min`;
}

export default function OrdenesScreen() {
  const [ordenes,     setOrdenes]     = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [filtro,      setFiltro]      = useState("activos");
  const [avanzando,   setAvanzando]   = useState(null);
  const [editarOrden, setEditarOrden] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "ordenesTienda"), orderBy("creadoEn", "asc"));
    return onSnapshot(q, snap => {
      setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
  }, []);

  const activos   = ordenes.filter(o => o.estado !== "entregado");
  const historial = [...ordenes.filter(o => o.estado === "entregado")].reverse();
  const lista     = filtro === "activos" ? activos : historial;

  const avanzar = async (orden) => {
    const info = estadoInfo(orden.estado);
    if (!info.next) return;
    setAvanzando(orden.id);
    await updateDoc(doc(db, "ordenesTienda", orden.id), { estado: info.next });
    setAvanzando(null);
  };

  return (
    <View style={s.root}>
      {/* Tabs activos / historial */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, filtro === "activos" && s.tabActivo]}
          onPress={() => setFiltro("activos")}
        >
          <Text style={[s.tabTxt, filtro === "activos" && s.tabTxtActivo]}>
            En curso{activos.length > 0 ? `  (${activos.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, filtro === "historial" && s.tabActivo]}
          onPress={() => setFiltro("historial")}
        >
          <Text style={[s.tabTxt, filtro === "historial" && s.tabTxtActivo]}>Historial</Text>
        </TouchableOpacity>
      </View>

      {editarOrden && (
        <EditarOrdenAdminModal
          orden={editarOrden}
          onClose={() => setEditarOrden(null)}
        />
      )}

      {cargando ? (
        <ActivityIndicator color="#d65f04" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {lista.length === 0 && (
            <Text style={s.vacio}>
              {filtro === "activos" ? "No hay órdenes activas." : "Sin historial aún."}
            </Text>
          )}

          {lista.map((orden) => {
            const info = estadoInfo(orden.estado);
            const mins = tiempoEspera(orden.creadoEn);
            return (
              <View key={orden.id} style={s.card}>

                {/* Cabecera */}
                <View style={s.cardTop}>
                  <View style={s.numCircle}>
                    <Text style={s.numTxt}>#{orden.numero}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clienteNombre}>{orden.nombreCliente}</Text>
                    <Text style={s.itemsResumen} numberOfLines={1}>
                      {(orden.items ?? []).map(i => `${i.cantidad}x ${i.nombre}`).join("  ·  ")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={[s.badge, { backgroundColor: info.bg }]}>
                      <Text style={[s.badgeTxt, { color: info.color }]}>{info.label}</Text>
                    </View>
                    {!!mins && <Text style={s.timeTxt}>⏱ {mins}</Text>}
                  </View>
                </View>

                {/* Items */}
                <View style={s.itemsList}>
                  {(orden.items ?? []).map((item, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemCant}>{item.cantidad}x</Text>
                      <Text style={s.itemNom}>{item.nombre}</Text>
                      <Text style={s.itemPrecio}>${item.subtotal}</Text>
                    </View>
                  ))}
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalNum}>${orden.total}</Text>
                  </View>
                </View>

                {/* Botones de acción */}
                <View style={s.botonesRow}>
                  <TouchableOpacity
                    style={s.btnEditar}
                    onPress={() => setEditarOrden(orden)}
                  >
                    <Text style={s.btnEditarTxt}>✏️ Editar</Text>
                  </TouchableOpacity>
                  {info.next && (
                    <TouchableOpacity
                      style={[s.btnAvanzar, { backgroundColor: estadoInfo(info.next).color }]}
                      onPress={() => avanzar(orden)}
                      disabled={avanzando === orden.id}
                    >
                      {avanzando === orden.id
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.btnAvanzarTxt}>→  {info.nextLabel}</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/* ── Modal edición admin ─────────────────────────────── */
function EditarOrdenAdminModal({ orden, onClose }) {
  const [items,     setItems]     = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [productos, setProductos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [verMenu,   setVerMenu]   = useState(false);

  useEffect(() => {
    if (orden) setItems((orden.items ?? []).map(i => ({ ...i })));
    setVerMenu(false);
  }, [orden?.id]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), snap => {
      const activas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.activo !== false)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setSecciones(activas);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (secciones.length === 0) return;
    const unsubs = secciones.map(sec =>
      onSnapshot(collection(db, "secciones", sec.id, "productos"), snap => {
        const prods = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.activo !== false)
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        setProductos(prev => ({ ...prev, [sec.id]: prods }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [secciones]);

  const cambiarCantidad = (nombre, delta) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.nombre === nombre);
      if (idx === -1) return prev;
      const nueva = prev[idx].cantidad + delta;
      if (nueva <= 0) return prev.filter((_, i) => i !== idx);
      return prev.map((item, i) =>
        i === idx ? { ...item, cantidad: nueva, subtotal: item.precio * nueva } : item
      );
    });
  };

  const agregarProducto = (prod) => {
    setItems(prev => {
      const existe = prev.find(i => i.nombre === prod.nombre);
      if (existe) {
        return prev.map(i =>
          i.nombre === prod.nombre
            ? { ...i, cantidad: i.cantidad + 1, subtotal: i.precio * (i.cantidad + 1) }
            : i
        );
      }
      return [...prev, { nombre: prod.nombre, precio: prod.precio, cantidad: 1, subtotal: prod.precio }];
    });
  };

  const cantEnItems = (nombre) => items.find(i => i.nombre === nombre)?.cantidad ?? 0;
  const total = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  const guardar = async () => {
    if (items.length === 0) { Alert.alert("Pedido vacío", "Agrega al menos un producto."); return; }
    setGuardando(true);
    try {
      await updateDoc(doc(db, "ordenesTienda", orden.id), {
        items, total, editadoEn: serverTimestamp(),
      });
      onClose();
    } catch {
      Alert.alert("Error", "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible animationType="slide">
      <View style={e.root}>
        <View style={e.header}>
          <TouchableOpacity onPress={onClose} style={e.backBtn}>
            <Text style={e.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={e.headerTxt}>Editar #{orden.numero} — {orden.nombreCliente}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={e.seccion}>Items del pedido</Text>
          {items.length === 0
            ? <Text style={e.vacio}>Sin items. Agrega del menú.</Text>
            : items.map((item, idx) => (
                <View key={idx} style={e.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={e.itemNom}>{item.nombre}</Text>
                    <Text style={e.itemUnit}>${item.precio} c/u</Text>
                  </View>
                  <View style={e.controles}>
                    <TouchableOpacity style={e.btnCtrl} onPress={() => cambiarCantidad(item.nombre, -1)}>
                      <Text style={e.btnCtrlTxt}>{item.cantidad === 1 ? "🗑" : "−"}</Text>
                    </TouchableOpacity>
                    <Text style={e.cantTxt}>{item.cantidad}</Text>
                    <TouchableOpacity style={[e.btnCtrl, e.btnAdd]} onPress={() => cambiarCantidad(item.nombre, 1)}>
                      <Text style={[e.btnCtrlTxt, { color: "#fff" }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={e.itemSub}>${item.precio * item.cantidad}</Text>
                </View>
              ))
          }

          {items.length > 0 && (
            <View style={e.totalRow}>
              <Text style={e.totalLabel}>Total</Text>
              <Text style={e.totalNum}>${total}</Text>
            </View>
          )}

          <TouchableOpacity style={e.btnVerMenu} onPress={() => setVerMenu(v => !v)}>
            <Text style={e.btnVerMenuTxt}>{verMenu ? "▲ Ocultar menú" : "➕ Agregar items"}</Text>
          </TouchableOpacity>

          {verMenu && secciones.map(sec => (
            <View key={sec.id} style={e.seccionMenu}>
              <Text style={e.seccionMenuTitulo}>{sec.nombre}</Text>
              {(productos[sec.id] ?? []).map(prod => {
                const c = cantEnItems(prod.nombre);
                return (
                  <View key={prod.id} style={e.menuRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={e.menuNom}>{prod.nombre}</Text>
                      {!!prod.descripcion && <Text style={e.menuDesc} numberOfLines={1}>{prod.descripcion}</Text>}
                    </View>
                    <Text style={e.menuPrecio}>${prod.precio}</Text>
                    <View style={e.controles}>
                      {c > 0 && (
                        <>
                          <TouchableOpacity style={e.btnCtrl} onPress={() => cambiarCantidad(prod.nombre, -1)}>
                            <Text style={e.btnCtrlTxt}>−</Text>
                          </TouchableOpacity>
                          <Text style={e.cantTxt}>{c}</Text>
                        </>
                      )}
                      <TouchableOpacity style={[e.btnCtrl, e.btnAdd]} onPress={() => agregarProducto(prod)}>
                        <Text style={[e.btnCtrlTxt, { color: "#fff" }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={e.footer}>
          <TouchableOpacity style={e.btnCancelar} onPress={onClose}>
            <Text style={e.btnCancelarTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={e.btnGuardar} onPress={guardar} disabled={guardando}>
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={e.btnGuardarTxt}>Guardar cambios</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const e = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#fff8f2" },
  header: { backgroundColor: "#532803", flexDirection: "row", alignItems: "center", padding: 14, paddingTop: Platform.OS === "ios" ? 54 : 14, gap: 10 },
  backBtn:{ padding: 4 },
  backTxt:{ color: "#fff", fontSize: 22, fontWeight: "700" },
  headerTxt: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 },

  seccion:  { fontSize: 15, fontWeight: "800", color: "#532803", marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  vacio:    { color: "#bbb", fontSize: 13, marginHorizontal: 16, fontStyle: "italic" },

  itemRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0ddd0" },
  itemNom:  { fontSize: 14, fontWeight: "700", color: "#421e02" },
  itemUnit: { fontSize: 11, color: "#a07850", marginTop: 2 },
  itemSub:  { fontSize: 14, fontWeight: "800", color: "#d65f04", minWidth: 44, textAlign: "right" },

  controles:{ flexDirection: "row", alignItems: "center", gap: 4 },
  btnCtrl:  { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#d65f04", justifyContent: "center", alignItems: "center" },
  btnAdd:   { backgroundColor: "#d65f04", borderColor: "#d65f04" },
  btnCtrlTxt:{ fontSize: 15, color: "#d65f04", fontWeight: "700", lineHeight: 20 },
  cantTxt:  { fontSize: 14, fontWeight: "800", color: "#532803", minWidth: 22, textAlign: "center" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e0c8b0" },
  totalLabel:{ fontWeight: "800", color: "#532803", fontSize: 15 },
  totalNum: { fontWeight: "900", color: "#d65f04", fontSize: 17 },

  btnVerMenu:    { margin: 16, marginTop: 14, backgroundColor: "#fff5ec", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e0c8b0" },
  btnVerMenuTxt: { color: "#532803", fontWeight: "800", fontSize: 14 },

  seccionMenu:       { marginHorizontal: 16, marginBottom: 20 },
  seccionMenuTitulo: { fontSize: 14, fontWeight: "700", color: "#fff", backgroundColor: "#532803", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 6 },
  menuRow:    { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0ddd0" },
  menuNom:    { fontSize: 14, color: "#421e02" },
  menuDesc:   { fontSize: 11, color: "#a07850", marginTop: 1 },
  menuPrecio: { fontSize: 14, fontWeight: "700", color: "#d65f04" },

  footer:      { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: 14, paddingBottom: Platform.OS === "ios" ? 30 : 14, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e0c8b0" },
  btnCancelar: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelarTxt: { color: "#934807", fontWeight: "700" },
  btnGuardar:  { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnGuardarTxt:  { color: "#fff", fontWeight: "800", fontSize: 15 },
});

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#ffeee2" },
  tabs:       { flexDirection: "row", backgroundColor: "#fff8f2", borderBottomWidth: 1, borderBottomColor: "#e0c8b0" },
  tab:        { flex: 1, paddingVertical: 13, alignItems: "center" },
  tabActivo:  { borderBottomWidth: 3, borderBottomColor: "#d65f04" },
  tabTxt:     { fontSize: 13, fontWeight: "700", color: "#a07850" },
  tabTxtActivo:{ color: "#532803" },
  vacio:      { color: "#aaa", textAlign: "center", marginTop: 30, fontStyle: "italic" },

  card:       { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#e0c8b0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop:    { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  numCircle:  { width: 48, height: 48, borderRadius: 24, backgroundColor: "#532803", justifyContent: "center", alignItems: "center" },
  numTxt:     { color: "#fff", fontWeight: "900", fontSize: 14 },
  clienteNombre: { fontWeight: "800", color: "#421e02", fontSize: 16 },
  itemsResumen:  { fontSize: 11, color: "#a07850", marginTop: 3 },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt:   { fontSize: 11, fontWeight: "800" },
  timeTxt:    { fontSize: 11, color: "#a07850" },

  itemsList:  { borderTopWidth: 1, borderTopColor: "#f0e0d0", paddingTop: 10, gap: 6 },
  itemRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  itemCant:   { fontSize: 13, fontWeight: "700", color: "#532803", width: 26 },
  itemNom:    { flex: 1, fontSize: 13, color: "#421e02" },
  itemPrecio: { fontSize: 13, fontWeight: "700", color: "#d65f04" },
  totalRow:   { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0e0d0", marginTop: 6 },
  totalLabel: { fontWeight: "800", color: "#532803", fontSize: 14 },
  totalNum:   { fontWeight: "900", color: "#d65f04", fontSize: 17 },

  botonesRow:   { flexDirection: "row", gap: 8, marginTop: 12 },
  btnEditar:    { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#d65f04", alignItems: "center" },
  btnEditarTxt: { color: "#d65f04", fontWeight: "800", fontSize: 13 },
  btnAvanzar:   { flex: 2, padding: 13, borderRadius: 10, alignItems: "center" },
  btnAvanzarTxt:{ color: "#fff", fontWeight: "800", fontSize: 14 },
});
