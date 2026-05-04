import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handle = async (action) => {
    setError("");
    setLoading(true);
    try {
      if (action === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>D'Aruma Cafe</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo"
        placeholderTextColor="#a07850"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#a07850"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading
        ? <ActivityIndicator color="#d65f04" />
        : <>
            <TouchableOpacity style={styles.btn} onPress={() => handle("login")}>
              <Text style={styles.btnText}>Iniciar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => handle("register")}>
              <Text style={[styles.btnText, { color: "#d65f04" }]}>Crear cuenta</Text>
            </TouchableOpacity>
          </>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff8f2", padding: 24, gap: 12 },
  title:       { fontSize: 28, fontWeight: "800", color: "#532803", marginBottom: 16 },
  input:       { width: "100%", borderWidth: 1, borderColor: "#e0c8b0", borderRadius: 8, padding: 12, fontSize: 16, color: "#532803", backgroundColor: "#fff" },
  error:       { color: "#c0392b", fontSize: 13 },
  btn:         { width: "100%", backgroundColor: "#d65f04", padding: 14, borderRadius: 8, alignItems: "center" },
  btnSecondary:{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#d65f04" },
  btnText:     { color: "#fff", fontWeight: "700", fontSize: 16 },
});
