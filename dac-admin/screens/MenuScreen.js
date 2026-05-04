import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Modal,
  KeyboardAvoidingView, Platform, PanResponder, Animated
} from "react-native";
import {
  collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

const SECTION_HEIGHT = 70;
const ITEM_HEIGHT    = 76;

export default function MenuScreen() {

  // ── Secciones ──────────────────────────────────────────────────────────────
  const [secciones,          setSecciones]          = useState([]);
  const [seccionesOrdenadas, setSeccionesOrdenadas] = useState([]);
  const [nuevaSeccion,       setNuevaSeccion]       = useState("");
  const [seccionSeleccionada,setSeccionSeleccionada]= useState(null);
  const [loadingSeccion,     setLoadingSeccion]     = useState(false);

  // Modal crear sección
  const [modalCrearSeccion, setModalCrearSeccion] = useState(false);

  // Modal edición de sección
  const [modalSeccion,      setModalSeccion]      = useState(false);
  const [seccionEditando,   setSeccionEditando]   = useState(null);
  const [nombreSeccionEdit, setNombreSeccionEdit] = useState("");

  // ── Productos ──────────────────────────────────────────────────────────────
  const [productos,        setProductos]        = useState([]);
  const [productosOrdenados,setProductosOrdenados]=useState([]);
  const [nombreProducto,   setNombreProducto]   = useState("");
  const [precioProducto,   setPrecioProducto]   = useState("");
  const [loadingProducto,  setLoadingProducto]  = useState(false);

  // Modal crear producto
  const [modalCrearProducto, setModalCrearProducto] = useState(false);

  // Modal editar producto
  const [modalProducto,  setModalProducto]  = useState(false);
  const [prodEditando,   setProdEditando]   = useState(null);
  const [nombreEdit,     setNombreEdit]     = useState("");
  const [precioEdit,     setPrecioEdit]     = useState("");

  // ── Refs compartidos ───────────────────────────────────────────────────────
  const scrollRef = useRef(null);

  // ── Drag secciones ─────────────────────────────────────────────────────────
  const [draggingSecIdx, setDraggingSecIdx] = useState(null);
  const [hoverSecIdx,    setHoverSecIdx]    = useState(null);
  const secAnimY        = useRef(new Animated.Value(0)).current;
  const draggingSecRef  = useRef(null);
  const hoverSecRef     = useRef(null);
  const isSavingSecRef  = useRef(false);
  const seccionesRef    = useRef([]);

  // ── Drag productos ─────────────────────────────────────────────────────────
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [hoverIdx,    setHoverIdx]    = useState(null);
  const animY        = useRef(new Animated.Value(0)).current;
  const draggingRef  = useRef(null);
  const hoverRef     = useRef(null);
  const isSavingRef  = useRef(false);
  const productosRef = useRef([]);
  const seccionRef   = useRef(null);

  // ── Sync refs ──────────────────────────────────────────────────────────────
  useEffect(() => { seccionesRef.current = seccionesOrdenadas; }, [seccionesOrdenadas]);
  useEffect(() => { productosRef.current = productosOrdenados; }, [productosOrdenados]);
  useEffect(() => { seccionRef.current   = seccionSeleccionada; }, [seccionSeleccionada]);

  // ── PanResponder — secciones ───────────────────────────────────────────────
  const panSecciones = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        () => false,
    onMoveShouldSetPanResponder:         () => draggingSecRef.current !== null,
    onMoveShouldSetPanResponderCapture:  () => draggingSecRef.current !== null,
    onPanResponderMove: (_, { dy }) => {
      secAnimY.setValue(dy);
      const total    = seccionesRef.current.length;
      const newHover = Math.max(0, Math.min(total - 1,
        draggingSecRef.current + Math.round(dy / SECTION_HEIGHT)
      ));
      if (newHover !== hoverSecRef.current) {
        hoverSecRef.current = newHover;
        setHoverSecIdx(newHover);
      }
    },
    onPanResponderRelease: (_, { dy }) => {
      const fromIdx = draggingSecRef.current;
      const secs    = seccionesRef.current;
      const toIdx   = Math.max(0, Math.min(secs.length - 1,
        fromIdx + Math.round(dy / SECTION_HEIGHT)
      ));

      secAnimY.setValue(0);
      draggingSecRef.current = null;
      hoverSecRef.current    = null;
      setDraggingSecIdx(null);
      setHoverSecIdx(null);
      scrollRef.current?.setNativeProps({ scrollEnabled: true });

      if (toIdx !== fromIdx) {
        const newOrder = [...secs];
        const [moved]  = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, moved);
        isSavingSecRef.current = true;
        setSeccionesOrdenadas(newOrder);
        Promise.all(
          newOrder.map((sec, idx) =>
            updateDoc(doc(db, "secciones", sec.id), { orden: idx + 1 })
          )
        ).finally(() => { isSavingSecRef.current = false; });
      }
    },
    onPanResponderTerminate: () => {
      secAnimY.setValue(0);
      draggingSecRef.current = null;
      hoverSecRef.current    = null;
      isSavingSecRef.current = false;
      setDraggingSecIdx(null);
      setHoverSecIdx(null);
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
    },
  })).current;

  // ── PanResponder — productos ───────────────────────────────────────────────
  const panProductos = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        () => false,
    onMoveShouldSetPanResponder:         () => draggingRef.current !== null,
    onMoveShouldSetPanResponderCapture:  () => draggingRef.current !== null,
    onPanResponderMove: (_, { dy }) => {
      animY.setValue(dy);
      const total    = productosRef.current.length;
      const newHover = Math.max(0, Math.min(total - 1,
        draggingRef.current + Math.round(dy / ITEM_HEIGHT)
      ));
      if (newHover !== hoverRef.current) {
        hoverRef.current = newHover;
        setHoverIdx(newHover);
      }
    },
    onPanResponderRelease: (_, { dy }) => {
      const fromIdx = draggingRef.current;
      const prods   = productosRef.current;
      const seccion = seccionRef.current;
      const toIdx   = Math.max(0, Math.min(prods.length - 1,
        fromIdx + Math.round(dy / ITEM_HEIGHT)
      ));

      animY.setValue(0);
      draggingRef.current = null;
      hoverRef.current    = null;
      setDraggingIdx(null);
      setHoverIdx(null);
      scrollRef.current?.setNativeProps({ scrollEnabled: true });

      if (toIdx !== fromIdx && seccion) {
        const newOrder = [...prods];
        const [moved]  = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, moved);
        isSavingRef.current = true;
        setProductosOrdenados(newOrder);
        Promise.all(
          newOrder.map((prod, idx) =>
            updateDoc(
              doc(db, "secciones", seccion.id, "productos", prod.id),
              { orden: idx + 1 }
            )
          )
        ).finally(() => { isSavingRef.current = false; });
      }
    },
    onPanResponderTerminate: () => {
      animY.setValue(0);
      draggingRef.current = null;
      hoverRef.current    = null;
      isSavingRef.current = false;
      setDraggingIdx(null);
      setHoverIdx(null);
      scrollRef.current?.setNativeProps({ scrollEnabled: true });
    },
  })).current;

  const activarDragSeccion = (idx) => {
    draggingSecRef.current = idx;
    hoverSecRef.current    = idx;
    secAnimY.setValue(0);
    setDraggingSecIdx(idx);
    setHoverSecIdx(idx);
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
  };

  const activarDrag = (idx) => {
    draggingRef.current = idx;
    hoverRef.current    = idx;
    animY.setValue(0);
    setDraggingIdx(idx);
    setHoverIdx(idx);
    scrollRef.current?.setNativeProps({ scrollEnabled: false });
  };

  // ── Firestore listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "secciones"),
      snap => setSecciones(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => Alert.alert("Error Firestore", err.message)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (draggingSecRef.current === null && !isSavingSecRef.current) {
      setSeccionesOrdenadas([...secciones].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    }
  }, [secciones]);

  useEffect(() => {
    if (!seccionSeleccionada) return;
    const unsub = onSnapshot(
      collection(db, "secciones", seccionSeleccionada.id, "productos"),
      snap => setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [seccionSeleccionada]);

  useEffect(() => {
    if (draggingRef.current === null && !isSavingRef.current) {
      setProductosOrdenados([...productos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    }
  }, [productos]);

  // ── CRUD secciones ─────────────────────────────────────────────────────────
  const agregarSeccion = async () => {
    if (!nuevaSeccion.trim()) return;
    setLoadingSeccion(true);
    try {
      await addDoc(collection(db, "secciones"), {
        nombre: nuevaSeccion.trim(),
        orden: 0,
        activo: true,
      });
      setNuevaSeccion("");
      setModalCrearSeccion(false);
    } catch {
      Alert.alert("Error", "No se pudo crear la sección.");
    } finally {
      setLoadingSeccion(false);
    }
  };

  const eliminarSeccion = (id) => {
    Alert.alert("Eliminar sección", "¿Estás seguro? Se eliminarán todos sus productos.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteDoc(doc(db, "secciones", id)) },
    ]);
  };

  const abrirEdicionSeccion = (sec) => {
    setSeccionEditando(sec);
    setNombreSeccionEdit(sec.nombre);
    setModalSeccion(true);
  };

  const guardarEdicionSeccion = async () => {
    if (!nombreSeccionEdit.trim()) return;
    await updateDoc(doc(db, "secciones", seccionEditando.id), { nombre: nombreSeccionEdit.trim() });
    setModalSeccion(false);
    setSeccionEditando(null);
  };

  // ── CRUD productos ─────────────────────────────────────────────────────────
  const agregarProducto = async () => {
    if (!nombreProducto.trim() || !precioProducto.trim()) return;
    setLoadingProducto(true);
    try {
      await addDoc(collection(db, "secciones", seccionSeleccionada.id, "productos"), {
        nombre: nombreProducto.trim(),
        precio: precioProducto.trim(),
        orden: 0,
        activo: true,
      });
      setNombreProducto("");
      setPrecioProducto("");
      setModalCrearProducto(false);
    } catch {
      Alert.alert("Error", "No se pudo agregar el producto.");
    } finally {
      setLoadingProducto(false);
    }
  };

  const eliminarProducto = (id) => {
    Alert.alert("Eliminar producto", "¿Confirmas eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: () => deleteDoc(doc(db, "secciones", seccionSeleccionada.id, "productos", id))
      },
    ]);
  };

  const abrirEdicion = (prod) => {
    setProdEditando(prod);
    setNombreEdit(prod.nombre);
    setPrecioEdit(prod.precio);
    setModalProducto(true);
  };

  const guardarEdicion = async () => {
    if (!nombreEdit.trim() || !precioEdit.trim()) return;
    await updateDoc(
      doc(db, "secciones", seccionSeleccionada.id, "productos", prodEditando.id),
      { nombre: nombreEdit.trim(), precio: precioEdit.trim() }
    );
    setModalProducto(false);
    setProdEditando(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── SECCIONES ── */}
        <Text style={styles.titulo}>Secciones del menú</Text>
        <TouchableOpacity
          style={styles.btnNuevoProducto}
          onPress={() => setModalCrearSeccion(true)}
        >
          <Text style={styles.btnNuevoProductoTxt}>+ Nueva sección</Text>
        </TouchableOpacity>

        <View {...panSecciones.panHandlers}>
          {seccionesOrdenadas.map((sec, idx) => {
            const secActiva   = sec.activo ?? true;
            const isDragging  = draggingSecIdx === idx;
            const isTarget    = hoverSecIdx === idx && draggingSecIdx !== null && draggingSecIdx !== idx;
            return (
              <Animated.View
                key={sec.id}
                style={[
                  styles.seccionItem,
                  seccionSeleccionada?.id === sec.id && styles.seccionActiva,
                  !secActiva && styles.itemInactivo,
                  isTarget  && styles.productoTarget,
                  isDragging && styles.productoArrastrando,
                  isDragging && { transform: [{ translateY: secAnimY }], zIndex: 10 },
                ]}
              >
                {/* Drag handle */}
                <TouchableOpacity
                  style={styles.dragHandle}
                  onLongPress={() => activarDragSeccion(idx)}
                  delayLongPress={250}
                >
                  <Text style={styles.dragIcon}>☰</Text>
                </TouchableOpacity>

                {/* Nombre — tap para seleccionar */}
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setSeccionSeleccionada(sec)}>
                  <Text style={styles.seccionTexto}>{sec.nombre}</Text>
                  {seccionSeleccionada?.id === sec.id &&
                    <Text style={styles.seccionHint}>✓ Seleccionada</Text>}
                </TouchableOpacity>

                {/* Acciones */}
                <View style={styles.acciones}>
                  <TouchableOpacity
                    onPress={() => updateDoc(doc(db, "secciones", sec.id), { activo: !secActiva })}
                    style={[styles.toggleBtn, secActiva ? styles.toggleOn : styles.toggleOff]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.toggleTxt}>{secActiva ? "ON" : "OFF"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => abrirEdicionSeccion(sec)} style={styles.btnIcono}>
                    <Text style={styles.editar}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarSeccion(sec.id)} style={styles.btnIcono}>
                    <Text style={styles.eliminar}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── PRODUCTOS ── */}
        {seccionSeleccionada && (
          <>
            <Text style={[styles.titulo, { marginTop: 28 }]}>
              Productos — {seccionSeleccionada.nombre}
            </Text>

            <TouchableOpacity
              style={styles.btnNuevoProducto}
              onPress={() => setModalCrearProducto(true)}
            >
              <Text style={styles.btnNuevoProductoTxt}>+ Nuevo producto</Text>
            </TouchableOpacity>

            {productosOrdenados.length === 0
              ? <Text style={styles.vacio}>Sin productos aún</Text>
              : (
                <View {...panProductos.panHandlers}>
                  {productosOrdenados.map((prod, idx) => {
                    const prodActivo = prod.activo ?? true;
                    const isDragging = draggingIdx === idx;
                    const isTarget   = hoverIdx === idx && draggingIdx !== null && draggingIdx !== idx;
                    return (
                      <Animated.View
                        key={prod.id}
                        style={[
                          styles.productoItem,
                          isDragging && styles.productoArrastrando,
                          isTarget   && styles.productoTarget,
                          !prodActivo && styles.itemInactivo,
                          isDragging && { transform: [{ translateY: animY }], zIndex: 10 },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.dragHandle}
                          onLongPress={() => activarDrag(idx)}
                          delayLongPress={250}
                        >
                          <Text style={styles.dragIcon}>☰</Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.productoNombre}>{prod.nombre}</Text>
                          <Text style={styles.productoPrecio}>${prod.precio}</Text>
                        </View>

                        <View style={styles.acciones}>
                          <TouchableOpacity
                            onPress={() => updateDoc(
                              doc(db, "secciones", seccionSeleccionada.id, "productos", prod.id),
                              { activo: !prodActivo }
                            )}
                            style={[styles.toggleBtn, prodActivo ? styles.toggleOn : styles.toggleOff]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.toggleTxt}>{prodActivo ? "ON" : "OFF"}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => abrirEdicion(prod)} style={styles.btnIcono}>
                            <Text style={styles.editar}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => eliminarProducto(prod.id)} style={styles.btnIcono}>
                            <Text style={styles.eliminar}>🗑</Text>
                          </TouchableOpacity>
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              )
            }
          </>
        )}

        {/* ── MODAL crear sección ── */}
        <Modal visible={modalCrearSeccion} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitulo}>Nueva sección</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la sección (ej. Bebidas)"
                value={nuevaSeccion}
                onChangeText={setNuevaSeccion}
                autoFocus
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#eee" }]}
                  onPress={() => { setModalCrearSeccion(false); setNuevaSeccion(""); }}
                >
                  <Text style={{ color: "#555", fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#d65f04" }]}
                  onPress={agregarSeccion}
                >
                  {loadingSeccion
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: "#fff", fontWeight: "600" }}>Crear</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL crear producto ── */}
        <Modal visible={modalCrearProducto} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitulo}>Nuevo producto</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del producto"
                value={nombreProducto}
                onChangeText={setNombreProducto}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Precio"
                value={precioProducto}
                onChangeText={setPrecioProducto}
                keyboardType="numeric"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#eee" }]}
                  onPress={() => { setModalCrearProducto(false); setNombreProducto(""); setPrecioProducto(""); }}
                >
                  <Text style={{ color: "#555", fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#d65f04" }]}
                  onPress={agregarProducto}
                >
                  {loadingProducto
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: "#fff", fontWeight: "600" }}>Crear</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL editar sección ── */}
        <Modal visible={modalSeccion} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitulo}>Editar sección</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la sección"
                value={nombreSeccionEdit}
                onChangeText={setNombreSeccionEdit}
                autoFocus
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#eee" }]} onPress={() => setModalSeccion(false)}>
                  <Text style={{ color: "#555", fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#d65f04" }]} onPress={guardarEdicionSeccion}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL editar producto ── */}
        <Modal visible={modalProducto} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitulo}>Editar producto</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                value={nombreEdit}
                onChangeText={setNombreEdit}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="Precio"
                value={precioEdit}
                onChangeText={setPrecioEdit}
                keyboardType="numeric"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#eee" }]} onPress={() => setModalProducto(false)}>
                  <Text style={{ color: "#555", fontWeight: "600" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#d65f04" }]} onPress={guardarEdicion}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#ffeee2", padding: 20 },
  titulo:         { fontSize: 18, fontWeight: "700", color: "#532803", marginBottom: 12 },
  row:            { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12,
    fontSize: 14, borderWidth: 1, borderColor: "#e0c8b0", color: "#421e02",
  },
  btnAdd:         { backgroundColor: "#d65f04", borderRadius: 10, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  btnAddText:     { color: "#fff", fontSize: 24, fontWeight: "700", lineHeight: 28 },

  seccionItem: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: "#e0c8b0",
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  seccionActiva:  { borderColor: "#d65f04", backgroundColor: "#fff5ec" },
  seccionTexto:   { fontWeight: "700", color: "#532803", fontSize: 15 },
  seccionHint:    { fontSize: 11, color: "#d65f04", marginTop: 2 },

  productoItem: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#e0c8b0",
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  productoArrastrando: {
    borderColor: "#d65f04", backgroundColor: "#fff5ec",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  productoTarget:  { borderColor: "#d65f04", borderStyle: "dashed", opacity: 0.6 },
  itemInactivo:    { opacity: 0.4 },

  dragHandle:     { padding: 6, justifyContent: "center", alignItems: "center" },
  dragIcon:       { fontSize: 18, color: "#c0a890" },

  productoNombre: { fontWeight: "600", color: "#421e02", fontSize: 14 },
  productoPrecio: { color: "#d65f04", fontSize: 13, marginTop: 2 },

  acciones:       { flexDirection: "row", gap: 6, alignItems: "center" },
  btnIcono:       { padding: 4 },
  editar:         { fontSize: 18 },
  eliminar:       { fontSize: 18 },

  toggleBtn:      { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, justifyContent: "center", alignItems: "center" },
  toggleOn:       { backgroundColor: "#4caf50" },
  toggleOff:      { backgroundColor: "#bbb" },
  toggleTxt:      { color: "#fff", fontSize: 11, fontWeight: "700" },

  vacio:          { color: "#aaa", textAlign: "center", marginTop: 10 },
  btnNuevoProducto: {
    backgroundColor: "#d65f04", borderRadius: 10,
    padding: 13, alignItems: "center", marginBottom: 14,
  },
  btnNuevoProductoTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },

  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox:       { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "85%" },
  modalTitulo:    { fontSize: 17, fontWeight: "700", color: "#532803", marginBottom: 16, textAlign: "center" },
  modalBtns:      { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn:       { flex: 1, borderRadius: 10, padding: 12, alignItems: "center" },
});
