import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, PanResponder, Animated, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const PROMO_H = 84;

const TEMAS = [
  { key: "escolar",  label: "Azul",    bg: "#1f3a5f" },
  { key: "clasico",  label: "Rojo",    bg: "#b11226" },
  { key: "verde",    label: "Verde",   bg: "#2e7d32" },
  { key: "naranja",  label: "Naranja", bg: "#d65f04" },
];

function temaPorKey(key) {
  return TEMAS.find(t => t.key === key) ?? TEMAS[0];
}

/* ── editor de items ── */
function ItemsEditor({ items, onChange }) {
  const add    = () => onChange([...items, ""]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const edit   = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)));

  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={ie.row}>
          <TextInput
            style={ie.input}
            value={item}
            onChangeText={v => edit(i, v)}
            placeholder={`Elemento ${i + 1}`}
            placeholderTextColor="#bbb"
          />
          {items.length > 1 && (
            <TouchableOpacity onPress={() => remove(i)} style={ie.del}>
              <Text style={ie.delTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity onPress={add} style={ie.addBtn}>
        <Text style={ie.addTxt}>+ Agregar elemento</Text>
      </TouchableOpacity>
    </View>
  );
}

const ie = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  input:  { flex: 1, backgroundColor: "#faf5ef", borderRadius: 8, padding: 10, fontSize: 13, color: "#421e02", borderWidth: 1, borderColor: "#e0c8b0" },
  del:    { marginLeft: 8, padding: 6 },
  delTxt: { color: "#c62828", fontWeight: "700", fontSize: 16 },
  addBtn: { alignSelf: "flex-start", marginTop: 4 },
  addTxt: { color: "#d65f04", fontWeight: "700", fontSize: 13 },
});

/* ── formulario ── */
function PromoForm({ form, setForm }) {
  const sf = (key, val) => setForm(f => ({ ...f, [key]: val }));
  return (
    <View>
      <Text style={fs.label}>Título *</Text>
      <TextInput style={fs.input} value={form.titulo} onChangeText={v => sf("titulo", v)} placeholder="Ej: CLASE LIBRE" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Badge / etiqueta</Text>
      <TextInput style={fs.input} value={form.badge} onChangeText={v => sf("badge", v)} placeholder="Ej: Promoción Estudiantes" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Subtítulo</Text>
      <TextInput style={fs.input} value={form.subtitulo} onChangeText={v => sf("subtitulo", v)} placeholder="Breve descripción del paquete" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Vigencia</Text>
      <TextInput style={fs.input} value={form.vigencia} onChangeText={v => sf("vigencia", v)} placeholder="Ej: Válida durante 2026" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Elementos incluidos</Text>
      <ItemsEditor items={form.items} onChange={v => sf("items", v)} />

      <View style={fs.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={fs.label}>Etiqueta de precio</Text>
          <TextInput style={fs.input} value={form.etiquetaPrecio} onChangeText={v => sf("etiquetaPrecio", v)} placeholder="Precio especial" placeholderTextColor="#bbb" />
        </View>
        <View style={{ width: 90 }}>
          <Text style={fs.label}>Precio $</Text>
          <TextInput style={fs.input} value={form.precio} onChangeText={v => sf("precio", v)} placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" />
        </View>
      </View>

      <Text style={fs.label}>Texto al pie</Text>
      <TextInput style={fs.input} value={form.footer} onChangeText={v => sf("footer", v)} placeholder="Condiciones breves visibles" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Condiciones completas (tooltip ⓘ)</Text>
      <TextInput
        style={[fs.input, { minHeight: 64, textAlignVertical: "top" }]}
        value={form.condiciones} onChangeText={v => sf("condiciones", v)}
        placeholder="Horarios, restricciones, etc." placeholderTextColor="#bbb"
        multiline
      />

      <Text style={fs.label}>Color / tema</Text>
      <View style={fs.temas}>
        {TEMAS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[fs.temaChip, { backgroundColor: t.bg, opacity: form.tema === t.key ? 1 : 0.4 }]}
            onPress={() => sf("tema", t.key)}
          >
            <Text style={fs.temaChipTxt}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const fs = StyleSheet.create({
  label:       { fontSize: 11, fontWeight: "700", color: "#934807", marginBottom: 4, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  input:       { backgroundColor: "#faf5ef", borderRadius: 10, padding: 12, fontSize: 13, color: "#421e02", borderWidth: 1, borderColor: "#e0c8b0" },
  row:         { flexDirection: "row" },
  temas:       { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  temaChip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  temaChipTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

/* ─────────────────────── pantalla principal ─────────────────────── */
const FORM_VACIO = {
  titulo: "", badge: "", subtitulo: "", vigencia: "",
  items: [""], precio: "", etiquetaPrecio: "Precio especial",
  footer: "", condiciones: "", tema: "escolar",
};

export default function PromocionesScreen() {
  const [promos,      setPromos]      = useState([]);
  const [modalCrear,  setModalCrear]  = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [promoEdit,   setPromoEdit]   = useState(null);
  const [form,        setForm]        = useState(FORM_VACIO);
  const [guardando,   setGuardando]   = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(null);

  const promosRef   = useRef([]);
  const draggingRef = useRef(null);
  const isSavingRef = useRef(false);
  const dragY       = useRef(new Animated.Value(0)).current;
  const dragStartY  = useRef(0);

  useEffect(() => { promosRef.current = promos; }, [promos]);
  useEffect(() => { draggingRef.current = draggingIdx; }, [draggingIdx]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "promociones"), snap => {
      if (isSavingRef.current) return;
      setPromos(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      );
    });
    return unsub;
  }, []);

  /* drag */
  function makePan(idx) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        dragStartY.current = e.nativeEvent.pageY;
        setDraggingIdx(idx);
        dragY.setValue(0);
      },
      onPanResponderMove: (e) => {
        const dy     = e.nativeEvent.pageY - dragStartY.current;
        dragY.setValue(dy);
        const cur    = draggingRef.current ?? idx;
        const newIdx = Math.max(0, Math.min(promosRef.current.length - 1, Math.round(cur + dy / PROMO_H)));
        if (newIdx !== cur) {
          const arr = [...promosRef.current];
          const [moved] = arr.splice(cur, 1);
          arr.splice(newIdx, 0, moved);
          setPromos(arr);
          setDraggingIdx(newIdx);
          draggingRef.current = newIdx;
          dragStartY.current  = e.nativeEvent.pageY;
          dragY.setValue(0);
        }
      },
      onPanResponderRelease: async () => {
        setDraggingIdx(null);
        dragY.setValue(0);
        const arr = promosRef.current;
        isSavingRef.current = true;
        await Promise.all(arr.map((p, i) => updateDoc(doc(db, "promociones", p.id), { orden: i + 1 })));
        isSavingRef.current = false;
      },
    });
  }

  /* acciones */
  const abrirCrear = () => { setForm(FORM_VACIO); setModalCrear(true); };

  const abrirEditar = (promo) => {
    setPromoEdit(promo);
    setForm({
      titulo:         promo.titulo         ?? "",
      badge:          promo.badge          ?? "",
      subtitulo:      promo.subtitulo      ?? "",
      vigencia:       promo.vigencia       ?? "",
      items:          promo.items?.length  ? promo.items : [""],
      precio:         String(promo.precio  ?? ""),
      etiquetaPrecio: promo.etiquetaPrecio ?? "Precio especial",
      footer:         promo.footer         ?? "",
      condiciones:    promo.condiciones    ?? "",
      tema:           promo.tema           ?? "escolar",
    });
    setModalEditar(true);
  };

  const guardarCrear = async () => {
    if (!form.titulo.trim()) return;
    setGuardando(true);
    const orden = (promosRef.current[promosRef.current.length - 1]?.orden ?? 0) + 1;
    await addDoc(collection(db, "promociones"), {
      titulo:         form.titulo.trim(),
      badge:          form.badge.trim(),
      subtitulo:      form.subtitulo.trim(),
      vigencia:       form.vigencia.trim(),
      items:          form.items.filter(i => i.trim()),
      precio:         parseFloat(form.precio) || 0,
      etiquetaPrecio: form.etiquetaPrecio.trim(),
      footer:         form.footer.trim(),
      condiciones:    form.condiciones.trim(),
      tema:           form.tema,
      activo:         true,
      orden,
    });
    setGuardando(false);
    setModalCrear(false);
  };

  const guardarEditar = async () => {
    if (!promoEdit || !form.titulo.trim()) return;
    setGuardando(true);
    await updateDoc(doc(db, "promociones", promoEdit.id), {
      titulo:         form.titulo.trim(),
      badge:          form.badge.trim(),
      subtitulo:      form.subtitulo.trim(),
      vigencia:       form.vigencia.trim(),
      items:          form.items.filter(i => i.trim()),
      precio:         parseFloat(form.precio) || 0,
      etiquetaPrecio: form.etiquetaPrecio.trim(),
      footer:         form.footer.trim(),
      condiciones:    form.condiciones.trim(),
      tema:           form.tema,
    });
    setGuardando(false);
    setModalEditar(false);
  };

  const eliminar = (promo) => {
    Alert.alert("Eliminar", `¿Eliminar "${promo.titulo}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteDoc(doc(db, "promociones", promo.id)) },
    ]);
  };

  const toggle = (promo) => {
    updateDoc(doc(db, "promociones", promo.id), { activo: !(promo.activo ?? true) });
  };

  /* render */
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={s.header}>
          <Text style={s.headerSub}>Gestión de</Text>
          <Text style={s.headerTitle}>Promociones</Text>
        </View>

        <TouchableOpacity style={s.btnCrear} onPress={abrirCrear}>
          <Text style={s.btnCrearTxt}>+ Nueva promoción</Text>
        </TouchableOpacity>

        {promos.length === 0 && (
          <Text style={s.vacio}>No hay promociones aún.{"\n"}Toca el botón para crear la primera.</Text>
        )}

        {promos.map((promo, idx) => {
          const tema   = temaPorKey(promo.tema);
          const pan    = makePan(idx);
          const activo = promo.activo ?? true;
          const items  = (promo.items ?? []).filter(i => i && i !== "+");

          return (
            <View
              key={promo.id}
              style={[s.promoRow, !activo && s.promoInactiva, draggingIdx === idx && s.promoDragging]}
            >
              <View {...pan.panHandlers} style={s.handle}>
                <Text style={s.handleIco}>☰</Text>
              </View>

              <View style={[s.temaStripe, { backgroundColor: tema.bg }]} />

              <View style={s.promoInfo}>
                <Text style={s.promoTitulo} numberOfLines={1}>{promo.titulo}</Text>
                {!!promo.badge && <Text style={s.promoBadge} numberOfLines={1}>{promo.badge}</Text>}
                <Text style={s.promoDetalle} numberOfLines={1}>
                  {items.join(" · ") || "Sin elementos"}
                  {promo.precio ? `  ·  $${promo.precio}` : ""}
                </Text>
              </View>

              <View style={s.acciones}>
                <TouchableOpacity
                  style={[s.chip, activo ? s.chipOn : s.chipOff]}
                  onPress={() => toggle(promo)}
                >
                  <Text style={s.chipTxt}>{activo ? "ON" : "OFF"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnEdit} onPress={() => abrirEditar(promo)}>
                  <Text style={s.btnEditTxt}>✏</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnDel} onPress={() => eliminar(promo)}>
                  <Text style={s.btnDelTxt}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal crear */}
      <Modal visible={modalCrear} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitulo}>Nueva promoción</Text>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "82%" }}>
                <PromoForm form={form} setForm={setForm} />
              </ScrollView>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setModalCrear(false)}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSave} onPress={guardarCrear} disabled={guardando}>
                  {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveTxt}>Crear</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal editar */}
      <Modal visible={modalEditar} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitulo}>Editar promoción</Text>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "82%" }}>
                <PromoForm form={form} setForm={setForm} />
              </ScrollView>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setModalEditar(false)}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSave} onPress={guardarEditar} disabled={guardando}>
                  {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveTxt}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#ffeee2" },

  header: {
    backgroundColor: "#532803",
    padding: 28,
    paddingTop: 36,
    alignItems: "center",
  },
  headerSub:   { color: "#f0c890", fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "900" },

  btnCrear:    { backgroundColor: "#d65f04", margin: 16, borderRadius: 12, padding: 14, alignItems: "center" },
  btnCrearTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  vacio: { color: "#aaa", textAlign: "center", padding: 30, fontStyle: "italic", lineHeight: 22 },

  promoRow: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0c8b0",
    minHeight: PROMO_H,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  promoInactiva: { opacity: 0.45 },
  promoDragging: { shadowOpacity: 0.2, elevation: 8, transform: [{ scale: 1.01 }] },

  handle:    { padding: 6 },
  handleIco: { fontSize: 18, color: "#ccc" },

  temaStripe: { width: 5, height: 46, borderRadius: 3 },

  promoInfo:    { flex: 1 },
  promoTitulo:  { fontWeight: "800", color: "#421e02", fontSize: 14 },
  promoBadge:   { fontSize: 11, color: "#d65f04", fontWeight: "600", marginTop: 1 },
  promoDetalle: { fontSize: 11, color: "#a07850", marginTop: 3 },

  acciones: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip:     { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  chipOn:   { backgroundColor: "#2e7d32" },
  chipOff:  { backgroundColor: "#bbb" },
  chipTxt:  { color: "#fff", fontSize: 10, fontWeight: "700" },
  btnEdit:    { padding: 6 },
  btnEditTxt: { fontSize: 16 },
  btnDel:     { padding: 6 },
  btnDelTxt:  { fontSize: 16 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalTitulo: { fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 12, textAlign: "center" },
  modalBtns:   { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancel:    { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelTxt: { color: "#934807", fontWeight: "700" },
  btnSave:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnSaveTxt:   { color: "#fff", fontWeight: "700" },
});
