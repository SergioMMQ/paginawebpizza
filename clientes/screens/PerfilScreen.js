import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  PhoneAuthProvider, linkWithCredential, signOut,
} from "firebase/auth";
import { onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import Constants from "expo-constants";
import { auth, db, firebaseConfig } from "../firebase/config";

// En Expo Go no hay módulos nativos de Firebase → phone auth no funciona
const esExpoGo = Constants.appOwnership === "expo";

export default function PerfilScreen({ usuario }) {
  if (!usuario) return <LoginView />;
  return <ProfileView usuario={usuario} />;
}

/* ══════════════════════════════════════════════════════
   LOGIN — EMAIL + CONTRASEÑA
══════════════════════════════════════════════════════ */
function LoginView() {
  const [modo,     setModo]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [nombre,   setNombre]   = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const entrar = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Completa todos los campos."); return; }
    setLoading(true);
    try {
      if (modo === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        if (!nombre.trim()) { setError("Escribe tu nombre."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nombre:   nombre.trim(),
          email:    email.trim().toLowerCase(),
          creadoEn: Date.now(),
        });
      }
    } catch (e) {
      const msg = {
        "auth/user-not-found":      "No existe una cuenta con ese correo.",
        "auth/wrong-password":      "Contraseña incorrecta.",
        "auth/invalid-email":       "Correo inválido.",
        "auth/email-already-in-use":"Ese correo ya está registrado.",
        "auth/weak-password":       "La contraseña debe tener al menos 6 caracteres.",
        "auth/invalid-credential":  "Correo o contraseña incorrectos.",
      }[e.code] ?? "Ocurrió un error. Intenta de nuevo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={lv.container} keyboardShouldPersistTaps="handled">
      <Text style={lv.title}>D'Aruma Cafe</Text>
      <Text style={lv.sub}>
        {modo === "login" ? "Inicia sesión en tu cuenta" : "Crea tu cuenta gratis"}
      </Text>

      {modo === "registro" && (
        <TextInput
          style={lv.input}
          placeholder="Tu nombre"
          placeholderTextColor="#a07850"
          value={nombre}
          onChangeText={setNombre}
        />
      )}
      <TextInput
        style={lv.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#a07850"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={lv.input}
        placeholder="Contraseña"
        placeholderTextColor="#a07850"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {!!error && <Text style={lv.error}>{error}</Text>}

      {loading
        ? <ActivityIndicator color="#d65f04" style={{ marginTop: 16 }} />
        : <TouchableOpacity style={lv.btn} onPress={entrar}>
            <Text style={lv.btnTxt}>{modo === "login" ? "Entrar →" : "Crear cuenta →"}</Text>
          </TouchableOpacity>
      }

      <TouchableOpacity style={{ marginTop: 18 }} onPress={() => { setModo(modo === "login" ? "registro" : "login"); setError(""); }}>
        <Text style={lv.toggle}>
          {modo === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </Text>
      </TouchableOpacity>

      {modo === "login" && (
        <View style={lv.beneficios}>
          <Text style={lv.beneficiosTitulo}>¿Por qué registrarte?</Text>
          {["Acumula sellos y gana recompensas", "Accede a promociones exclusivas", "Recibe tarjetas de regalo", "Haz pedidos para fechas especiales"].map(b => (
            <Text key={b} style={lv.beneficioItem}>🟠 {b}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const lv = StyleSheet.create({
  container:  { flexGrow: 1, backgroundColor: "#fff8f2", alignItems: "center", padding: 24, paddingTop: 40 },
  title:      { fontSize: 28, fontWeight: "900", color: "#532803", marginBottom: 6 },
  sub:        { fontSize: 14, color: "#a07850", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  input:      { width: "100%", borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10, padding: 14, fontSize: 15, color: "#532803", backgroundColor: "#fff", marginBottom: 10 },
  error:      { color: "#c0392b", fontSize: 13, marginBottom: 8, textAlign: "center" },
  btn:        { width: "100%", backgroundColor: "#d65f04", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 4 },
  btnTxt:     { color: "#fff", fontWeight: "800", fontSize: 16 },
  toggle:     { color: "#d65f04", fontWeight: "700", fontSize: 14 },
  beneficios: { marginTop: 32, width: "100%", backgroundColor: "#fff5ec", borderRadius: 14, padding: 16 },
  beneficiosTitulo: { fontWeight: "800", color: "#532803", fontSize: 15, marginBottom: 10 },
  beneficioItem:    { fontSize: 14, color: "#421e02", marginBottom: 6 },
});

/* ══════════════════════════════════════════════════════
   PERFIL (usuario autenticado)
══════════════════════════════════════════════════════ */
function ProfileView({ usuario }) {
  const [perfil,        setPerfil]        = useState(null);
  const [modalConfig,   setModalConfig]   = useState(false);
  const [editNombre,    setEditNombre]    = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [guardando,     setGuardando]     = useState(false);

  const recaptchaRef = useRef(null);
  const [modalTel,   setModalTel]   = useState(false);
  const [passTel,    setPassTel]    = useState(1);
  const [numTel,     setNumTel]     = useState("");
  const [codigoTel,  setCodigoTel]  = useState("");
  const [confirmTel, setConfirmTel] = useState(null);
  const [errorTel,   setErrorTel]   = useState("");
  const [loadingTel, setLoadingTel] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "usuarios", usuario.uid), snap => {
      if (snap.exists()) {
        setPerfil(snap.data());
      } else {
        setDoc(doc(db, "usuarios", usuario.uid), {
          nombre:   "",
          email:    usuario.email ?? "",
          creadoEn: Date.now(),
        });
      }
    });
    return unsub;
  }, [usuario.uid]);

  const formatTel = (num) => {
    const limpio = num.replace(/\D/g, "");
    return limpio.startsWith("52") ? `+${limpio}` : `+52${limpio}`;
  };

  const enviarSmsTel = async () => {
    setErrorTel("");
    if (numTel.replace(/\D/g, "").length < 10) { setErrorTel("Ingresa un número de 10 dígitos."); return; }
    setLoadingTel(true);
    try {
      const provider       = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(formatTel(numTel), recaptchaRef.current);
      setConfirmTel(verificationId);
      setPassTel(2);
    } catch {
      setErrorTel("No se pudo enviar el SMS. Verifica el número.");
    } finally {
      setLoadingTel(false);
    }
  };

  const verificarSmsTel = async () => {
    setErrorTel("");
    if (codigoTel.trim().length < 6) { setErrorTel("El código tiene 6 dígitos."); return; }
    setLoadingTel(true);
    try {
      const credential = PhoneAuthProvider.credential(confirmTel, codigoTel.trim());
      await linkWithCredential(auth.currentUser, credential);
      await updateDoc(doc(db, "usuarios", usuario.uid), { telefono: formatTel(numTel), telefonoVerificado: true });
      setModalTel(false); setPassTel(1); setNumTel(""); setCodigoTel("");
      Alert.alert("✅ ¡Listo!", "Tu número fue verificado correctamente.");
    } catch (e) {
      if (e.code === "auth/invalid-verification-code") {
        setErrorTel("Código incorrecto. Intenta de nuevo.");
      } else if (e.code === "auth/provider-already-linked") {
        await updateDoc(doc(db, "usuarios", usuario.uid), { telefono: formatTel(numTel), telefonoVerificado: true });
        setModalTel(false);
        Alert.alert("✅ ¡Listo!", "Tu número fue verificado correctamente.");
      } else {
        setErrorTel("Error al verificar. Intenta de nuevo.");
      }
    } finally {
      setLoadingTel(false);
    }
  };

  const telefonoVerificado = perfil?.telefonoVerificado === true;

  return (
    <View style={{ flex: 1 }}>
      {/* El modal de recaptcha solo se monta en builds reales */}
      {!esExpoGo && (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaRef}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification
        />
      )}

      <ScrollView style={pv.container} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header avatar */}
        <View style={pv.header}>
          <TouchableOpacity style={pv.btnConfigIco} onPress={() => {
            setEditNombre(perfil?.nombre ?? "");
            setEditDireccion(perfil?.direccion ?? "");
            setModalConfig(true);
          }}>
            <Text style={pv.configIco}>⚙️</Text>
          </TouchableOpacity>
          <View style={pv.avatar}>
            <Text style={pv.avatarTxt}>
              {((perfil?.nombre || usuario.email || "?")[0]).toUpperCase()}
            </Text>
          </View>
          <Text style={pv.nombre}>{perfil?.nombre || "Sin nombre"}</Text>
          <Text style={pv.emailTxt}>{usuario.email}</Text>
          {!!perfil?.direccion && <Text style={pv.emailTxt}>📍 {perfil.direccion}</Text>}
          <TouchableOpacity style={pv.btnSalir} onPress={() => signOut(auth)}>
            <Text style={pv.btnSalirTxt}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Verificación de teléfono */}
        <Text style={pv.seccion}>Verificación de teléfono</Text>
        <View style={pv.telCard}>
          {telefonoVerificado ? (
            <View style={pv.telVerificado}>
              <Text style={pv.telVerifIco}>✅</Text>
              <View>
                <Text style={pv.telVerifTxt}>Teléfono verificado</Text>
                <Text style={pv.telVerifNum}>{perfil.telefono}</Text>
              </View>
            </View>
          ) : esExpoGo ? (
            <View style={pv.expoGoNotice}>
              <Text style={pv.expoGoIco}>📱</Text>
              <Text style={pv.expoGoTxt}>La verificación por SMS requiere la app instalada.</Text>
              <Text style={pv.expoGoSub}>Esta función no está disponible en Expo Go. Disponible en la versión final de la app.</Text>
            </View>
          ) : (
            <>
              <Text style={pv.telPendTxt}>Verifica tu número para poder hacer pedidos especiales.</Text>
              <TouchableOpacity style={pv.btnVerificar} onPress={() => { setModalTel(true); setPassTel(1); setErrorTel(""); }}>
                <Text style={pv.btnVerificarTxt}>📱 Verificar número</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Modal editar perfil */}
        <Modal visible={modalConfig} animationType="slide" transparent>
          <KeyboardAvoidingView style={pv.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={pv.modalBox}>
              <Text style={pv.modalTitulo}>Editar perfil</Text>

              <Text style={pv.modalLabel}>Nombre</Text>
              <TextInput style={pv.modalInput} value={editNombre} onChangeText={setEditNombre} placeholder="Tu nombre" placeholderTextColor="#a07850" />

              <Text style={pv.modalLabel}>Dirección</Text>
              <TextInput style={pv.modalInput} value={editDireccion} onChangeText={setEditDireccion} placeholder="Ej: Calle Reforma 123" placeholderTextColor="#a07850" />

              <Text style={pv.modalTelInfo}>✉️ Correo: {usuario.email}</Text>

              <View style={pv.modalBtns}>
                <TouchableOpacity style={pv.btnCancelar} onPress={() => setModalConfig(false)}>
                  <Text style={pv.btnCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pv.btnGuardar} disabled={guardando} onPress={async () => {
                  setGuardando(true);
                  await updateDoc(doc(db, "usuarios", usuario.uid), { nombre: editNombre.trim(), direccion: editDireccion.trim() });
                  setGuardando(false); setModalConfig(false);
                }}>
                  {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pv.btnGuardarTxt}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal verificar teléfono */}
        <Modal visible={modalTel} animationType="slide" transparent>
          <KeyboardAvoidingView style={pv.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={pv.modalBox}>
              <Text style={pv.modalTitulo}>Verificar teléfono</Text>

              {passTel === 1 && (
                <>
                  <Text style={pv.modalHint}>Recibirás un código SMS para confirmar tu número.</Text>
                  <View style={pv.telRow}>
                    <View style={pv.prefijo}><Text style={pv.prefijoTxt}>🇲🇽 +52</Text></View>
                    <TextInput style={pv.telInput} placeholder="10 dígitos" placeholderTextColor="#a07850" keyboardType="phone-pad" maxLength={10} value={numTel} onChangeText={setNumTel} />
                  </View>
                  {!!errorTel && <Text style={pv.errorTel}>{errorTel}</Text>}
                  <View style={pv.modalBtns}>
                    <TouchableOpacity style={pv.btnCancelar} onPress={() => setModalTel(false)}>
                      <Text style={pv.btnCancelarTxt}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={pv.btnGuardar} onPress={enviarSmsTel} disabled={loadingTel}>
                      {loadingTel ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pv.btnGuardarTxt}>Enviar SMS</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {passTel === 2 && (
                <>
                  <Text style={pv.modalHint}>Código de 6 dígitos enviado a +52 {numTel}</Text>
                  <TextInput
                    style={[pv.modalInput, { fontSize: 24, letterSpacing: 10, textAlign: "center", fontWeight: "900" }]}
                    placeholder="● ● ● ● ● ●" placeholderTextColor="#c0a890"
                    keyboardType="number-pad" maxLength={6}
                    value={codigoTel} onChangeText={setCodigoTel}
                  />
                  {!!errorTel && <Text style={pv.errorTel}>{errorTel}</Text>}
                  <View style={pv.modalBtns}>
                    <TouchableOpacity style={pv.btnCancelar} onPress={() => { setPassTel(1); setErrorTel(""); setCodigoTel(""); }}>
                      <Text style={pv.btnCancelarTxt}>← Cambiar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={pv.btnGuardar} onPress={verificarSmsTel} disabled={loadingTel}>
                      {loadingTel ? <ActivityIndicator color="#fff" size="small" /> : <Text style={pv.btnGuardarTxt}>Verificar</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </ScrollView>
    </View>
  );
}

const pv = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff8f2" },
  header:    { backgroundColor: "#532803", alignItems: "center", paddingTop: 50, paddingBottom: 28, paddingHorizontal: 20 },
  avatar:    { width: 72, height: 72, borderRadius: 36, backgroundColor: "#d65f04", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  avatarTxt: { fontSize: 32, fontWeight: "900", color: "#fff" },
  nombre:    { fontSize: 20, fontWeight: "800", color: "#fff" },
  emailTxt:  { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  btnSalir:  { marginTop: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 6 },
  btnSalirTxt:{ color: "#fff", fontSize: 13, fontWeight: "700" },
  btnConfigIco:{ position: "absolute", top: Platform.OS === "ios" ? 52 : 14, right: 14 },
  configIco: { fontSize: 22 },

  seccion:   { fontSize: 16, fontWeight: "800", color: "#532803", marginHorizontal: 16, marginTop: 24, marginBottom: 10 },

  telCard:        { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginHorizontal: 16, borderWidth: 1, borderColor: "#e0c8b0" },
  telVerificado:  { flexDirection: "row", alignItems: "center", gap: 12 },
  telVerifIco:    { fontSize: 28 },
  telVerifTxt:    { fontWeight: "800", color: "#2e7d32", fontSize: 14 },
  telVerifNum:    { color: "#532803", fontSize: 13, marginTop: 2 },
  telPendTxt:     { color: "#a07850", fontSize: 13, marginBottom: 12, lineHeight: 18 },
  btnVerificar:   { backgroundColor: "#532803", borderRadius: 10, padding: 12, alignItems: "center" },
  btnVerificarTxt:{ color: "#fff", fontWeight: "800", fontSize: 14 },

  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox:     { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  modalTitulo:  { fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 16, textAlign: "center" },
  modalLabel:   { fontSize: 11, fontWeight: "700", color: "#934807", marginBottom: 4, marginTop: 12, textTransform: "uppercase" },
  modalInput:   { borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10, padding: 12, fontSize: 15, color: "#532803", backgroundColor: "#faf5ef" },
  modalTelInfo: { fontSize: 14, color: "#532803", fontWeight: "700", marginTop: 16, marginBottom: 4 },
  modalHint:    { fontSize: 13, color: "#a07850", marginBottom: 14, lineHeight: 18 },
  errorTel:     { color: "#c0392b", fontSize: 13, marginBottom: 8 },
  modalBtns:    { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancelar:  { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelarTxt:{ color: "#934807", fontWeight: "700" },
  btnGuardar:   { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnGuardarTxt:{ color: "#fff", fontWeight: "800" },

  telRow:    { flexDirection: "row", marginBottom: 10, gap: 8 },
  prefijo:   { backgroundColor: "#faf5ef", borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10, padding: 12, justifyContent: "center" },
  prefijoTxt:{ fontSize: 14, color: "#532803", fontWeight: "700" },
  telInput:  { flex: 1, borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10, padding: 12, fontSize: 18, color: "#532803", backgroundColor: "#faf5ef", letterSpacing: 2 },

  expoGoNotice: { alignItems: "center", paddingVertical: 8, gap: 6 },
  expoGoIco:    { fontSize: 32, marginBottom: 4 },
  expoGoTxt:    { fontWeight: "800", color: "#532803", fontSize: 14, textAlign: "center" },
  expoGoSub:    { fontSize: 12, color: "#a07850", textAlign: "center", lineHeight: 18 },
});
