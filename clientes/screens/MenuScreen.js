import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, doc, addDoc, runTransaction,
  serverTimestamp, getDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import TrackingModal from "../components/TrackingModal";

export default function MenuScreen({ usuario, onOrderPlaced }) {
  const [secciones,     setSecciones]     = useState([]);
  const [productos,     setProductos]     = useState({});
  const [cargando,      setCargando]      = useState(true);
  const [carrito,       setCarrito]       = useState([]);
  const [modalCarrito,  setModalCarrito]  = useState(false);
  const [modalTracking, setModalTracking] = useState(false);
  const [ordenId,       setOrdenId]       = useState(null);
  const [nombreInput,   setNombreInput]   = useState("");
  const [nombrePerfil,  setNombrePerfil]  = useState("");
  const [enviando,      setEnviando]      = useState(false);

  useEffect(() => {
    if (!usuario?.uid) return;
    getDoc(doc(db, "usuarios", usuario.uid)).then(snap => {
      if (snap.exists()) setNombrePerfil(snap.data().nombre ?? "");
    });
  }, [usuario?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "secciones"), snap => {
      const activas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.activo !== false)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setSecciones(activas);
      setCargando(false);
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

  const agregar = (prod) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === prod.id);
      if (existe) return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 }];
    });
  };

  const quitar = (id) => {
    setCarrito(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      if (item.cantidad === 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const cant = (id) => carrito.find(i => i.id === id)?.cantidad ?? 0;
  const totalItems  = carrito.reduce((s, i) => s + i.cantidad, 0);
  const totalPrecio = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const confirmarPedido = async () => {
    if (!nombreInput.trim()) {
      Alert.alert("Falta tu nombre", "Ingresa tu nombre para identificar tu pedido.");
      return;
    }
    setEnviando(true);
    try {
      const contadorRef = doc(db, "meta", "contadorOrdenes");
      let numero;
      await runTransaction(db, async (t) => {
        const snap = await t.get(contadorRef);
        numero = ((snap.exists() ? snap.data().ultimo : 0) ?? 0) + 1;
        t.set(contadorRef, { ultimo: numero }, { merge: true });
      });

      const ref = await addDoc(collection(db, "ordenesTienda"), {
        numero,
        uid:           usuario?.uid ?? null,
        nombreCliente: nombreInput.trim(),
        items:         carrito.map(i => ({
          nombre:   i.nombre,
          precio:   i.precio,
          cantidad: i.cantidad,
          subtotal: i.precio * i.cantidad,
        })),
        total:    totalPrecio,
        estado:   "recibido",
        creadoEn: serverTimestamp(),
      });

      setOrdenId(ref.id);
      onOrderPlaced?.(ref.id);
      setCarrito([]);
      setNombreInput("");
      setModalCarrito(false);
      setModalTracking(true);
    } catch {
      Alert.alert("Error", "No se pudo enviar el pedido. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#d65f04" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff8f2" }}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: totalItems > 0 ? 100 : 40 }}
      >
        <Text style={s.header}>D'Aruma Cafe</Text>

        {secciones.map(sec => (
          <View key={sec.id} style={s.seccion}>
            <Text style={s.seccionTitulo}>{sec.nombre}</Text>

            {(productos[sec.id] ?? []).length === 0
              ? <Text style={s.vacio}>Sin productos disponibles</Text>
              : (productos[sec.id] ?? []).map(prod => {
                  const c = cant(prod.id);
                  return (
                    <View key={prod.id} style={s.productoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.productoNombre}>{prod.nombre}</Text>
                        {!!prod.descripcion && (
                          <Text style={s.productoDesc} numberOfLines={1}>{prod.descripcion}</Text>
                        )}
                      </View>
                      <Text style={s.productoPrecio}>${prod.precio}</Text>
                      <View style={s.controles}>
                        {c > 0 && (
                          <>
                            <TouchableOpacity style={s.btnCtrl} onPress={() => quitar(prod.id)}>
                              <Text style={s.btnCtrlTxt}>−</Text>
                            </TouchableOpacity>
                            <Text style={s.cantTxt}>{c}</Text>
                          </>
                        )}
                        <TouchableOpacity style={[s.btnCtrl, s.btnAdd]} onPress={() => agregar(prod)}>
                          <Text style={[s.btnCtrlTxt, { color: "#fff" }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
            }
          </View>
        ))}
      </ScrollView>

      {/* Botón flotante del carrito */}
      {totalItems > 0 && (
        <TouchableOpacity style={s.carritoFloat} onPress={() => { setNombreInput(nombrePerfil); setModalCarrito(true); }}>
          <View style={s.carritoBadge}>
            <Text style={s.carritoBadgeTxt}>{totalItems}</Text>
          </View>
          <Text style={s.carritoFloatTxt}>Ver pedido</Text>
          <Text style={s.carritoFloatPrecio}>${totalPrecio}</Text>
        </TouchableOpacity>
      )}

      {/* Modal carrito */}
      <Modal visible={modalCarrito} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modal}>
            <Text style={s.modalTitulo}>Tu pedido</Text>

            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {carrito.map(item => (
                <View key={item.id} style={s.carritoItem}>
                  <View style={s.controles}>
                    <TouchableOpacity style={s.btnCtrl} onPress={() => quitar(item.id)}>
                      <Text style={s.btnCtrlTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.cantTxt}>{item.cantidad}</Text>
                    <TouchableOpacity style={[s.btnCtrl, s.btnAdd]} onPress={() => agregar(item)}>
                      <Text style={[s.btnCtrlTxt, { color: "#fff" }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.carritoItemNom} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={s.carritoItemPrecio}>${item.precio * item.cantidad}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalNum}>${totalPrecio}</Text>
            </View>

            <Text style={s.modalLabel}>
              {nombrePerfil ? "Nombre del pedido" : "¿Tu nombre? (para identificar tu pedido)"}
            </Text>
            <TextInput
              style={s.modalInput}
              placeholder="Ej: Juan"
              placeholderTextColor="#a07850"
              value={nombreInput}
              onChangeText={setNombreInput}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setModalCarrito(false)}>
                <Text style={s.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnConfirmar} onPress={confirmarPedido} disabled={enviando}>
                {enviando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnConfirmarTxt}>Hacer pedido →</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de seguimiento */}
      {ordenId && (
        <TrackingModal
          visible={modalTracking}
          ordenId={ordenId}
          onClose={() => setModalTracking(false)}
        />
      )}
    </View>
  );
}

/* ─── Estilos menú ──────────────────────────────────────── */
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#fff8f2" },
  center:         { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff8f2" },
  header:         { fontSize: 26, fontWeight: "800", color: "#532803", textAlign: "center", marginVertical: 20 },
  seccion:        { marginHorizontal: 16, marginBottom: 24 },
  seccionTitulo:  { fontSize: 17, fontWeight: "700", color: "#fff", backgroundColor: "#532803", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 8 },
  productoRow:    { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f0ddd0", gap: 8 },
  productoNombre: { fontSize: 15, color: "#421e02" },
  productoDesc:   { fontSize: 12, color: "#a07850", marginTop: 2 },
  productoPrecio: { fontSize: 15, fontWeight: "700", color: "#d65f04", marginRight: 4 },
  vacio:          { color: "#bbb", fontSize: 13, paddingHorizontal: 12 },

  controles:   { flexDirection: "row", alignItems: "center", gap: 4 },
  btnCtrl:     { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#d65f04", justifyContent: "center", alignItems: "center" },
  btnAdd:      { backgroundColor: "#d65f04", borderColor: "#d65f04" },
  btnCtrlTxt:  { fontSize: 16, color: "#d65f04", fontWeight: "700", lineHeight: 20 },
  cantTxt:     { fontSize: 14, fontWeight: "800", color: "#532803", minWidth: 20, textAlign: "center" },

  carritoFloat: {
    position: "absolute", bottom: 14, left: 16, right: 16,
    backgroundColor: "#532803", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  carritoBadge:    { backgroundColor: "#d65f04", borderRadius: 12, width: 24, height: 24, justifyContent: "center", alignItems: "center", marginRight: 10 },
  carritoBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },
  carritoFloatTxt: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 15 },
  carritoFloatPrecio: { color: "#ffd094", fontWeight: "900", fontSize: 16 },

  overlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modal:    { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  modalTitulo: { fontSize: 20, fontWeight: "900", color: "#532803", marginBottom: 14 },

  carritoItem:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  carritoItemNom:   { flex: 1, fontSize: 14, color: "#421e02" },
  carritoItemPrecio:{ fontSize: 14, fontWeight: "700", color: "#d65f04" },

  totalRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#e0c8b0", marginTop: 4, marginBottom: 12 },
  totalLabel: { fontWeight: "800", color: "#532803", fontSize: 15 },
  totalNum:   { fontWeight: "900", color: "#d65f04", fontSize: 18 },

  modalLabel: { fontSize: 11, fontWeight: "700", color: "#934807", marginBottom: 6, textTransform: "uppercase" },
  modalInput: { borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10, padding: 12, fontSize: 15, color: "#532803", backgroundColor: "#faf5ef", marginBottom: 16 },

  modalBtns:     { flexDirection: "row", gap: 12 },
  btnCancelar:   { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelarTxt:{ color: "#934807", fontWeight: "700" },
  btnConfirmar:  { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnConfirmarTxt:{ color: "#fff", fontWeight: "800", fontSize: 15 },
});
