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

const AUDIENCIAS = [
  { key: "todos",      ico: "🌐", label: "Público general",    desc: "Visible sin iniciar sesión" },
  { key: "cuenta",     ico: "👤", label: "Clientes con cuenta", desc: "Solo usuarios registrados" },
  { key: "especificos",ico: "🎯", label: "Clientes específicos",desc: "Solo los que tú elijas" },
];

const AUDIENCIA_LABELS = { todos: "🌐 Todos", cuenta: "👤 Con cuenta", especificos: "🎯 Específicos" };

function temaPorKey(key) { return TEMAS.find(t => t.key === key) ?? TEMAS[0]; }

/* ── editor de items ── */
function ItemsEditor({ items, onChange }) {
  const add    = () => onChange([...items, ""]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const edit   = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)));
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={ie.row}>
          <TextInput style={ie.input} value={item} onChangeText={v => edit(i, v)} placeholder={`Elemento ${i + 1}`} placeholderTextColor="#bbb" />
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
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  input: { flex: 1, backgroundColor: "#faf5ef", borderRadius: 8, padding: 10, fontSize: 13, color: "#421e02", borderWidth: 1, borderColor: "#e0c8b0" },
  del: { marginLeft: 8, padding: 6 },
  delTxt: { color: "#c62828", fontWeight: "700", fontSize: 16 },
  addBtn: { alignSelf: "flex-start", marginTop: 4 },
  addTxt: { color: "#d65f04", fontWeight: "700", fontSize: 13 },
});

/* ── picker de usuarios ── */
function UserPickerModal({ visible, selectedUids, onConfirm, onClose }) {
  const [usuarios,  setUsuarios]  = useState([]);
  const [seleccion, setSeleccion] = useState(new Set());
  const [busqueda,  setBusqueda]  = useState("");

  useEffect(() => {
    if (!visible) return;
    setSeleccion(new Set(selectedUids));
    setBusqueda("");
    const unsub = onSnapshot(collection(db, "usuarios"), snap => {
      setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return unsub;
  }, [visible]);

  const toggle = (uid) => setSeleccion(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

  const filtrados = usuarios.filter(u =>
    !busqueda || (u.nombre + u.email).toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: "#fff8f2" }}>
        <View style={up.header}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Text style={up.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={up.titulo}>Seleccionar clientes</Text>
          <TouchableOpacity onPress={() => { onConfirm([...seleccion]); onClose(); }} style={up.confirmarBtn}>
            <Text style={up.confirmarTxt}>Confirmar ({seleccion.size})</Text>
          </TouchableOpacity>
        </View>

        <View style={up.searchRow}>
          <TextInput
            style={up.searchInput}
            placeholder="Buscar por nombre o correo..."
            placeholderTextColor="#a07850"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {filtrados.length === 0 && <Text style={up.vacio}>No se encontraron usuarios.</Text>}
          {filtrados.map(u => {
            const sel = seleccion.has(u.uid);
            return (
              <TouchableOpacity key={u.uid} style={[up.row, sel && up.rowSel]} onPress={() => toggle(u.uid)}>
                <View style={[up.check, sel && up.checkSel]}>
                  {sel && <Text style={up.checkMark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={up.nombre}>{u.nombre || "Sin nombre"}</Text>
                  <Text style={up.email}>{u.email}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
const up = StyleSheet.create({
  header:       { backgroundColor: "#532803", flexDirection: "row", alignItems: "center", padding: 14, paddingTop: Platform.OS === "ios" ? 54 : 14, gap: 10 },
  backTxt:      { color: "#fff", fontSize: 22, fontWeight: "700" },
  titulo:       { flex: 1, color: "#fff", fontWeight: "800", fontSize: 16 },
  confirmarBtn: { backgroundColor: "#d65f04", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  confirmarTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
  searchRow:    { padding: 12, backgroundColor: "#fff8f2", borderBottomWidth: 1, borderBottomColor: "#e0c8b0" },
  searchInput:  { backgroundColor: "#fff", borderRadius: 10, padding: 10, fontSize: 14, color: "#421e02", borderWidth: 1, borderColor: "#e0c8b0" },
  vacio:        { color: "#bbb", textAlign: "center", marginTop: 30, fontStyle: "italic" },
  row:          { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", backgroundColor: "#fff", marginBottom: 8 },
  rowSel:       { borderColor: "#d65f04", backgroundColor: "#fff5ec" },
  check:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  checkSel:     { backgroundColor: "#d65f04", borderColor: "#d65f04" },
  checkMark:    { color: "#fff", fontWeight: "900", fontSize: 13 },
  nombre:       { fontWeight: "700", color: "#421e02", fontSize: 14 },
  email:        { fontSize: 12, color: "#a07850", marginTop: 1 },
});

/* ── formulario ── */
function PromoForm({ form, setForm, onOpenUserPicker }) {
  const sf = (key, val) => setForm(f => ({ ...f, [key]: val }));
  return (
    <View>
      <Text style={fs.label}>Título *</Text>
      <TextInput style={fs.input} value={form.titulo} onChangeText={v => sf("titulo", v)} placeholder="Ej: CLASE LIBRE" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Badge / etiqueta</Text>
      <TextInput style={fs.input} value={form.badge} onChangeText={v => sf("badge", v)} placeholder="Ej: Promoción Estudiantes" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Subtítulo</Text>
      <TextInput style={fs.input} value={form.subtitulo} onChangeText={v => sf("subtitulo", v)} placeholder="Breve descripción" placeholderTextColor="#bbb" />

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

      {/* Audiencia */}
      <Text style={fs.label}>Audiencia</Text>
      <View style={{ gap: 8, marginTop: 4 }}>
        {AUDIENCIAS.map(a => {
          const sel = form.audiencia === a.key;
          return (
            <TouchableOpacity key={a.key} style={[fs.audienciaBtn, sel && fs.audienciaBtnSel]} onPress={() => sf("audiencia", a.key)}>
              <Text style={fs.audienciaIco}>{a.ico}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[fs.audienciaNom, sel && { color: "#532803" }]}>{a.label}</Text>
                <Text style={fs.audienciaDesc}>{a.desc}</Text>
              </View>
              <View style={[fs.radio, sel && fs.radioSel]}>
                {sel && <View style={fs.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {form.audiencia === "especificos" && (
        <TouchableOpacity style={fs.btnPickUsers} onPress={onOpenUserPicker}>
          <Text style={fs.btnPickUsersTxt}>
            {form.uidsEspecificos.length === 0
              ? "Seleccionar clientes →"
              : `${form.uidsEspecificos.length} cliente(s) seleccionado(s) — editar →`}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={fs.label}>Texto al pie</Text>
      <TextInput style={fs.input} value={form.footer} onChangeText={v => sf("footer", v)} placeholder="Condiciones breves" placeholderTextColor="#bbb" />

      <Text style={fs.label}>Condiciones completas</Text>
      <TextInput style={[fs.input, { minHeight: 64, textAlignVertical: "top" }]} value={form.condiciones} onChangeText={v => sf("condiciones", v)} placeholder="Horarios, restricciones, etc." placeholderTextColor="#bbb" multiline />

      <Text style={fs.label}>Color / tema</Text>
      <View style={fs.temas}>
        {TEMAS.map(t => (
          <TouchableOpacity key={t.key} style={[fs.temaChip, { backgroundColor: t.bg, opacity: form.tema === t.key ? 1 : 0.4 }]} onPress={() => sf("tema", t.key)}>
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

  audienciaBtn:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", backgroundColor: "#faf5ef" },
  audienciaBtnSel: { borderColor: "#d65f04", backgroundColor: "#fff5ec" },
  audienciaIco:    { fontSize: 20 },
  audienciaNom:    { fontSize: 13, fontWeight: "700", color: "#a07850" },
  audienciaDesc:   { fontSize: 11, color: "#bbb", marginTop: 1 },
  radio:           { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  radioSel:        { borderColor: "#d65f04" },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: "#d65f04" },

  btnPickUsers:    { marginTop: 10, padding: 12, backgroundColor: "#532803", borderRadius: 10, alignItems: "center" },
  btnPickUsersTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

/* ── pantalla principal ── */
const FORM_VACIO = {
  titulo: "", badge: "", subtitulo: "", vigencia: "",
  items: [""], precio: "", etiquetaPrecio: "Precio especial",
  footer: "", condiciones: "", tema: "escolar",
  audiencia: "todos", uidsEspecificos: [],
};

export default function PromocionesScreen() {
  const [promos,       setPromos]       = useState([]);
  const [modalCrear,   setModalCrear]   = useState(false);
  const [modalEditar,  setModalEditar]  = useState(false);
  const [modalPicker,  setModalPicker]  = useState(false);
  const [promoEdit,    setPromoEdit]    = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [guardando,    setGuardando]    = useState(false);
  const [draggingIdx,  setDraggingIdx]  = useState(null);

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
      setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    });
    return unsub;
  }, []);

  function makePan(idx) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => { dragStartY.current = e.nativeEvent.pageY; setDraggingIdx(idx); dragY.setValue(0); },
      onPanResponderMove: (e) => {
        const dy = e.nativeEvent.pageY - dragStartY.current;
        dragY.setValue(dy);
        const cur = draggingRef.current ?? idx;
        const newIdx = Math.max(0, Math.min(promosRef.current.length - 1, Math.round(cur + dy / PROMO_H)));
        if (newIdx !== cur) {
          const arr = [...promosRef.current];
          const [moved] = arr.splice(cur, 1);
          arr.splice(newIdx, 0, moved);
          setPromos(arr);
          setDraggingIdx(newIdx);
          draggingRef.current = newIdx;
          dragStartY.current = e.nativeEvent.pageY;
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

  const abrirCrear = () => { setForm(FORM_VACIO); setModalCrear(true); };

  const abrirEditar = (promo) => {
    setPromoEdit(promo);
    setForm({
      titulo:          promo.titulo         ?? "",
      badge:           promo.badge          ?? "",
      subtitulo:       promo.subtitulo      ?? "",
      vigencia:        promo.vigencia       ?? "",
      items:           promo.items?.length  ? promo.items : [""],
      precio:          String(promo.precio  ?? ""),
      etiquetaPrecio:  promo.etiquetaPrecio ?? "Precio especial",
      footer:          promo.footer         ?? "",
      condiciones:     promo.condiciones    ?? "",
      tema:            promo.tema           ?? "escolar",
      audiencia:       promo.audiencia      ?? (promo.exclusivo ? "cuenta" : "todos"),
      uidsEspecificos: promo.uidsEspecificos ?? [],
    });
    setModalEditar(true);
  };

  const camposGuardar = () => ({
    titulo:          form.titulo.trim(),
    badge:           form.badge.trim(),
    subtitulo:       form.subtitulo.trim(),
    vigencia:        form.vigencia.trim(),
    items:           form.items.filter(i => i.trim()),
    precio:          parseFloat(form.precio) || 0,
    etiquetaPrecio:  form.etiquetaPrecio.trim(),
    footer:          form.footer.trim(),
    condiciones:     form.condiciones.trim(),
    tema:            form.tema,
    audiencia:       form.audiencia,
    uidsEspecificos: form.audiencia === "especificos" ? form.uidsEspecificos : [],
  });

  const guardarCrear = async () => {
    if (!form.titulo.trim()) return;
    setGuardando(true);
    const orden = (promosRef.current[promosRef.current.length - 1]?.orden ?? 0) + 1;
    await addDoc(collection(db, "promociones"), { ...camposGuardar(), activo: true, orden });
    setGuardando(false);
    setModalCrear(false);
  };

  const guardarEditar = async () => {
    if (!promoEdit || !form.titulo.trim()) return;
    setGuardando(true);
    await updateDoc(doc(db, "promociones", promoEdit.id), camposGuardar());
    setGuardando(false);
    setModalEditar(false);
  };

  const eliminar = (promo) => Alert.alert("Eliminar", `¿Eliminar "${promo.titulo}"?`, [
    { text: "Cancelar", style: "cancel" },
    { text: "Eliminar", style: "destructive", onPress: () => deleteDoc(doc(db, "promociones", promo.id)) },
  ]);

  const toggle = (promo) => updateDoc(doc(db, "promociones", promo.id), { activo: !(promo.activo ?? true) });

  const FormModal = ({ visible, titulo, onClose, onGuardar }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>{titulo}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "82%" }}>
              <PromoForm form={form} setForm={setForm} onOpenUserPicker={() => setModalPicker(true)} />
            </ScrollView>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                <Text style={s.btnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={onGuardar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveTxt}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

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
          const aud    = promo.audiencia ?? (promo.exclusivo ? "cuenta" : "todos");

          return (
            <View key={promo.id} style={[s.promoRow, !activo && s.promoInactiva, draggingIdx === idx && s.promoDragging]}>
              <View {...pan.panHandlers} style={s.handle}>
                <Text style={s.handleIco}>☰</Text>
              </View>
              <View style={[s.temaStripe, { backgroundColor: tema.bg }]} />
              <View style={s.promoInfo}>
                <Text style={s.promoTitulo} numberOfLines={1}>{promo.titulo}</Text>
                <Text style={s.promoBadge} numberOfLines={1}>
                  {AUDIENCIA_LABELS[aud] ?? "🌐 Todos"}
                  {aud === "especificos" && promo.uidsEspecificos?.length
                    ? `  ·  ${promo.uidsEspecificos.length} cliente(s)` : ""}
                </Text>
                <Text style={s.promoDetalle} numberOfLines={1}>
                  {items.join(" · ") || "Sin elementos"}{promo.precio ? `  ·  $${promo.precio}` : ""}
                </Text>
              </View>
              <View style={s.acciones}>
                <TouchableOpacity style={[s.chip, activo ? s.chipOn : s.chipOff]} onPress={() => toggle(promo)}>
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

      <FormModal visible={modalCrear} titulo="Nueva promoción" onClose={() => setModalCrear(false)} onGuardar={guardarCrear} />
      <FormModal visible={modalEditar} titulo="Editar promoción" onClose={() => setModalEditar(false)} onGuardar={guardarEditar} />

      <UserPickerModal
        visible={modalPicker}
        selectedUids={form.uidsEspecificos}
        onConfirm={(uids) => setForm(f => ({ ...f, uidsEspecificos: uids }))}
        onClose={() => setModalPicker(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#ffeee2" },
  header:     { backgroundColor: "#532803", padding: 28, paddingTop: 36, alignItems: "center" },
  headerSub:  { color: "#f0c890", fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  headerTitle:{ color: "#fff", fontSize: 26, fontWeight: "900" },
  btnCrear:   { backgroundColor: "#d65f04", margin: 16, borderRadius: 12, padding: 14, alignItems: "center" },
  btnCrearTxt:{ color: "#fff", fontWeight: "700", fontSize: 14 },
  vacio:      { color: "#aaa", textAlign: "center", padding: 30, fontStyle: "italic", lineHeight: 22 },

  promoRow:     { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0c8b0", minHeight: PROMO_H, gap: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  promoInactiva:{ opacity: 0.45 },
  promoDragging:{ shadowOpacity: 0.2, elevation: 8, transform: [{ scale: 1.01 }] },
  handle:       { padding: 6 },
  handleIco:    { fontSize: 18, color: "#ccc" },
  temaStripe:   { width: 5, height: 46, borderRadius: 3 },
  promoInfo:    { flex: 1 },
  promoTitulo:  { fontWeight: "800", color: "#421e02", fontSize: 14 },
  promoBadge:   { fontSize: 11, color: "#d65f04", fontWeight: "600", marginTop: 1 },
  promoDetalle: { fontSize: 11, color: "#a07850", marginTop: 3 },
  acciones:     { flexDirection: "row", alignItems: "center", gap: 6 },
  chip:         { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  chipOn:       { backgroundColor: "#2e7d32" },
  chipOff:      { backgroundColor: "#bbb" },
  chipTxt:      { color: "#fff", fontSize: 10, fontWeight: "700" },
  btnEdit:      { padding: 6 },
  btnEditTxt:   { fontSize: 16 },
  btnDel:       { padding: 6 },
  btnDelTxt:    { fontSize: 16 },

  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox:    { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  modalTitulo: { fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 12, textAlign: "center" },
  modalBtns:   { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancel:   { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelTxt:{ color: "#934807", fontWeight: "700" },
  btnSave:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnSaveTxt:  { color: "#fff", fontWeight: "700" },
});
