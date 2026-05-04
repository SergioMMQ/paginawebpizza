import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import {
  signOut, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/config";

export default function PerfilAdminScreen({ usuario }) {
  const [modalPass,   setModalPass]   = useState(false);
  const [passActual,  setPassActual]  = useState("");
  const [passNueva,   setPassNueva]   = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState("");

  const iniciales = (usuario?.email ?? "A")[0].toUpperCase();

  const abrirCambioPass = () => {
    setPassActual(""); setPassNueva(""); setPassConfirm(""); setError("");
    setModalPass(true);
  };

  const cambiarPassword = async () => {
    setError("");
    if (!passActual) { setError("Ingresa tu contraseña actual."); return; }
    if (passNueva.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (passNueva !== passConfirm) { setError("Las contraseñas nuevas no coinciden."); return; }

    setGuardando(true);
    try {
      const credential = EmailAuthProvider.credential(usuario.email, passActual);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passNueva);
      setModalPass(false);
      Alert.alert("✅ Listo", "Contraseña actualizada correctamente.");
    } catch (e) {
      const msg = {
        "auth/wrong-password":       "Contraseña actual incorrecta.",
        "auth/invalid-credential":   "Contraseña actual incorrecta.",
        "auth/too-many-requests":    "Demasiados intentos. Espera un momento.",
        "auth/requires-recent-login":"Cierra sesión e inicia de nuevo para cambiar la contraseña.",
      }[e.code] ?? "Ocurrió un error. Intenta de nuevo.";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* Header avatar */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{iniciales}</Text>
        </View>
        <Text style={s.rol}>Administrador</Text>
        <Text style={s.email}>{usuario?.email}</Text>
      </View>

      {/* Tarjeta de datos */}
      <Text style={s.secTitulo}>Cuenta</Text>
      <View style={s.card}>
        <View style={s.fila}>
          <Text style={s.filaLabel}>Correo</Text>
          <Text style={s.filaVal} numberOfLines={1}>{usuario?.email}</Text>
        </View>
        <View style={[s.fila, s.filaBorder]}>
          <Text style={s.filaLabel}>Contraseña</Text>
          <Text style={s.filaVal}>••••••••</Text>
        </View>
        <View style={[s.fila, s.filaBorder]}>
          <Text style={s.filaLabel}>UID</Text>
          <Text style={[s.filaVal, s.filaUID]} numberOfLines={1}>{usuario?.uid}</Text>
        </View>
      </View>

      {/* Acciones */}
      <Text style={s.secTitulo}>Acciones</Text>
      <View style={s.card}>
        <TouchableOpacity style={s.accion} onPress={abrirCambioPass}>
          <Text style={s.accionIco}>🔑</Text>
          <Text style={s.accionTxt}>Cambiar contraseña</Text>
          <Text style={s.accionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.accion, s.accionBorder, s.accionPeligro]} onPress={() =>
          Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Salir", style: "destructive", onPress: () => signOut(auth) },
          ])
        }>
          <Text style={s.accionIco}>🚪</Text>
          <Text style={[s.accionTxt, { color: "#c62828" }]}>Cerrar sesión</Text>
          <Text style={s.accionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Modal cambiar contraseña */}
      <Modal visible={modalPass} animationType="slide" transparent>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>Cambiar contraseña</Text>

            <Text style={s.modalLabel}>Contraseña actual</Text>
            <TextInput
              style={s.modalInput}
              value={passActual}
              onChangeText={setPassActual}
              secureTextEntry
              placeholder="Tu contraseña actual"
              placeholderTextColor="#a07850"
            />

            <Text style={s.modalLabel}>Nueva contraseña</Text>
            <TextInput
              style={s.modalInput}
              value={passNueva}
              onChangeText={setPassNueva}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#a07850"
            />

            <Text style={s.modalLabel}>Confirmar nueva contraseña</Text>
            <TextInput
              style={s.modalInput}
              value={passConfirm}
              onChangeText={setPassConfirm}
              secureTextEntry
              placeholder="Repite la nueva contraseña"
              placeholderTextColor="#a07850"
            />

            {!!error && <Text style={s.errorTxt}>{error}</Text>}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => setModalPass(false)}>
                <Text style={s.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGuardar} onPress={cambiarPassword} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnGuardarTxt}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffeee2" },

  header:    { backgroundColor: "#532803", alignItems: "center", paddingTop: 48, paddingBottom: 32, paddingHorizontal: 20 },
  avatar:    { width: 76, height: 76, borderRadius: 38, backgroundColor: "#d65f04", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarTxt: { fontSize: 34, fontWeight: "900", color: "#fff" },
  rol:       { fontSize: 12, color: "#f0c890", letterSpacing: 2, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  email:     { fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: "600" },

  secTitulo: { fontSize: 13, fontWeight: "800", color: "#934807", marginHorizontal: 20, marginTop: 28, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  card:      { backgroundColor: "#fff", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: "#e0c8b0", overflow: "hidden" },

  fila:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  filaBorder: { borderTopWidth: 1, borderTopColor: "#f0e0d0" },
  filaLabel:  { fontSize: 13, color: "#a07850", fontWeight: "700", width: 90 },
  filaVal:    { flex: 1, fontSize: 14, color: "#421e02", fontWeight: "600" },
  filaUID:    { fontSize: 11, color: "#bbb", fontWeight: "400" },

  accion:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  accionBorder: { borderTopWidth: 1, borderTopColor: "#f0e0d0" },
  accionPeligro:{ },
  accionIco:    { fontSize: 20 },
  accionTxt:    { flex: 1, fontSize: 15, fontWeight: "700", color: "#421e02" },
  accionArrow:  { fontSize: 22, color: "#ccc", fontWeight: "300" },

  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox:   { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  modalTitulo:{ fontSize: 18, fontWeight: "900", color: "#532803", marginBottom: 16, textAlign: "center" },
  modalLabel: { fontSize: 11, fontWeight: "700", color: "#934807", marginBottom: 4, marginTop: 12, textTransform: "uppercase" },
  modalInput: { borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 10, padding: 12, fontSize: 15, color: "#532803", backgroundColor: "#faf5ef" },
  errorTxt:   { color: "#c0392b", fontSize: 13, marginTop: 10, textAlign: "center" },
  modalBtns:  { flexDirection: "row", gap: 12, marginTop: 20 },
  btnCancelar:    { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e0c8b0", alignItems: "center" },
  btnCancelarTxt: { color: "#934807", fontWeight: "700" },
  btnGuardar:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#d65f04", alignItems: "center" },
  btnGuardarTxt:  { color: "#fff", fontWeight: "800" },
});
