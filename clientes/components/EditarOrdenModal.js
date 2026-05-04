import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, Alert, Platform,
} from "react-native";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export default function EditarOrdenModal({ visible, orden, onClose }) {
  const [items,     setItems]     = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [productos, setProductos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [verMenu,   setVerMenu]   = useState(false);

  // Cargar items actuales del pedido al abrir
  useEffect(() => {
    if (visible && orden) {
      setItems((orden.items ?? []).map(i => ({ ...i })));
      setVerMenu(false);
    }
  }, [visible, orden?.id]);

  // Cargar secciones y productos del menú
  useEffect(() => {
    if (!visible) return;
    const unsub = onSnapshot(collection(db, "secciones"), snap => {
      const activas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.activo !== false)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setSecciones(activas);
    });
    return unsub;
  }, [visible]);

  useEffect(() => {
    if (!visible || secciones.length === 0) return;
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
  }, [visible, secciones]);

  const cambiarCantidad = (nombre, delta) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.nombre === nombre);
      if (idx === -1) return prev;
      const nueva = prev[idx].cantidad + delta;
      if (nueva <= 0) {
        // Confirmar eliminación
        return prev.filter((_, i) => i !== idx);
      }
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
    if (items.length === 0) {
      Alert.alert("Pedido vacío", "Agrega al menos un producto.");
      return;
    }
    setGuardando(true);
    try {
      await updateDoc(doc(db, "ordenesTienda", orden.id), {
        items,
        total,
        editadoEn: serverTimestamp(),
      });
      onClose();
    } catch {
      Alert.alert("Error", "No se pudo guardar el pedido.");
    } finally {
      setGuardando(false);
    }
  };

  if (!orden) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={s.root}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn}>
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTxt}>Editar pedido #{orden.numero}</Text>
          <View style={s.editaBadge}>
            <Text style={s.editaBadgeTxt}>✏️ Editable</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Items actuales */}
          <Text style={s.seccion}>Tu pedido</Text>
          {items.length === 0
            ? <Text style={s.vacio}>No hay items. Agrega algo del menú.</Text>
            : items.map((item, idx) => (
                <View key={idx} style={s.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemNom}>{item.nombre}</Text>
                    <Text style={s.itemPrecioUnit}>${item.precio} c/u</Text>
                  </View>
                  <View style={s.controles}>
                    <TouchableOpacity style={s.btnCtrl} onPress={() => cambiarCantidad(item.nombre, -1)}>
                      <Text style={s.btnCtrlTxt}>{item.cantidad === 1 ? "🗑" : "−"}</Text>
                    </TouchableOpacity>
                    <Text style={s.cantTxt}>{item.cantidad}</Text>
                    <TouchableOpacity style={[s.btnCtrl, s.btnAdd]} onPress={() => cambiarCantidad(item.nombre, 1)}>
                      <Text style={[s.btnCtrlTxt, { color: "#fff" }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.itemSubtotal}>${item.precio * item.cantidad}</Text>
                </View>
              ))
          }

          {/* Total parcial */}
          {items.length > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalNum}>${total}</Text>
            </View>
          )}

          {/* Botón ver menú */}
          <TouchableOpacity style={s.btnVerMenu} onPress={() => setVerMenu(v => !v)}>
            <Text style={s.btnVerMenuTxt}>{verMenu ? "▲ Ocultar menú" : "➕ Agregar más items"}</Text>
          </TouchableOpacity>

          {/* Mini menú para agregar */}
          {verMenu && secciones.map(sec => (
            <View key={sec.id} style={s.seccionMenu}>
              <Text style={s.seccionMenuTitulo}>{sec.nombre}</Text>
              {(productos[sec.id] ?? []).map(prod => {
                const c = cantEnItems(prod.nombre);
                return (
                  <View key={prod.id} style={s.menuRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.menuNom}>{prod.nombre}</Text>
                      {!!prod.descripcion && <Text style={s.menuDesc} numberOfLines={1}>{prod.descripcion}</Text>}
                    </View>
                    <Text style={s.menuPrecio}>${prod.precio}</Text>
                    <View style={s.controles}>
                      {c > 0 && (
                        <>
                          <TouchableOpacity style={s.btnCtrl} onPress={() => cambiarCantidad(prod.nombre, -1)}>
                            <Text style={s.btnCtrlTxt}>−</Text>
                          </TouchableOpacity>
                          <Text style={s.cantTxt}>{c}</Text>
                        </>
                      )}
                      <TouchableOpacity style={[s.btnCtrl, s.btnAdd]} onPress={() => agregarProducto(prod)}>
                        <Text style={[s.btnCtrlTxt, { color: "#fff" }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Botones fijos en la parte inferior */}
        <View style={s.footer}>
          <TouchableOpacity style={s.btnCancelar} onPress={onClose}>
            <Text style={s.btnCancelarTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnGuardar} onPress={guardar} disabled={guardando}>
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnGuardarTxt}>Guardar cambios</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#fff8f2" },
  header: { backgroundColor: "#532803", flexDirection: "row", alignItems: "center", padding: 14, paddingTop: Platform.OS === "ios" ? 54 : 14, gap: 10 },
  backBtn:{ padding: 4 },
  backTxt:{ color: "#fff", fontSize: 22, fontWeight: "700" },
  headerTxt: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 },
  editaBadge:   { backgroundColor: "#fef9e7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  editaBadgeTxt:{ fontSize: 11, fontWeight: "800", color: "#f39c12" },

  seccion:  { fontSize: 15, fontWeight: "800", color: "#532803", marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  vacio:    { color: "#bbb", fontSize: 13, marginHorizontal: 16, fontStyle: "italic" },

  itemRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0ddd0" },
  itemNom:  { fontSize: 14, fontWeight: "700", color: "#421e02" },
  itemPrecioUnit: { fontSize: 11, color: "#a07850", marginTop: 2 },
  itemSubtotal:   { fontSize: 14, fontWeight: "800", color: "#d65f04", minWidth: 44, textAlign: "right" },

  controles: { flexDirection: "row", alignItems: "center", gap: 4 },
  btnCtrl:   { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#d65f04", justifyContent: "center", alignItems: "center" },
  btnAdd:    { backgroundColor: "#d65f04", borderColor: "#d65f04" },
  btnCtrlTxt:{ fontSize: 15, color: "#d65f04", fontWeight: "700", lineHeight: 20 },
  cantTxt:   { fontSize: 14, fontWeight: "800", color: "#532803", minWidth: 22, textAlign: "center" },

  totalRow:  { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e0c8b0" },
  totalLabel:{ fontWeight: "800", color: "#532803", fontSize: 15 },
  totalNum:  { fontWeight: "900", color: "#d65f04", fontSize: 17 },

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
