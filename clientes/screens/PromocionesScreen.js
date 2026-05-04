import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const TEMAS = {
  escolar: "#1f3a5f",
  clasico: "#b11226",
  verde:   "#2e7d32",
  naranja: "#d65f04",
};

export default function PromocionesScreen({ usuario }) {
  const [promos,      setPromos]      = useState([]);
  const [hayOcultas,  setHayOcultas]  = useState(false);
  const [cargando,    setCargando]    = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "promociones"), snap => {
      const todas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.activo !== false);

      const visibles = todas
        .filter(p => {
          const aud = p.audiencia ?? (p.exclusivo ? "cuenta" : "todos");
          if (aud === "todos") return true;
          if (aud === "cuenta") return !!usuario;
          if (aud === "especificos") return !!usuario && (p.uidsEspecificos ?? []).includes(usuario?.uid);
          return true;
        })
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

      const ocultas = !usuario && todas.some(p => {
        const aud = p.audiencia ?? (p.exclusivo ? "cuenta" : "todos");
        return aud !== "todos";
      });

      setPromos(visibles);
      setHayOcultas(ocultas);
      setCargando(false);
    });
    return unsub;
  }, [usuario]);

  if (cargando) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#d65f04" />
      </View>
    );
  }

  if (promos.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.vacio}>No hay promociones activas por el momento.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
      {hayOcultas && (
        <View style={s.bannerExclusivo}>
          <Text style={s.bannerTxt}>🔒 Regístrate para ver promociones exclusivas</Text>
        </View>
      )}
      {promos.map(promo => {
        const color = TEMAS[promo.tema] ?? TEMAS.naranja;
        const items = (promo.items ?? []).filter(i => i.trim());

        return (
          <View key={promo.id} style={[s.card, { borderTopColor: color }]}>

            {/* Header de la tarjeta */}
            <View style={[s.cardHeader, { backgroundColor: color }]}>
              {!!promo.badge && <Text style={s.badge}>{promo.badge}</Text>}
              <Text style={s.titulo}>{promo.titulo}</Text>
              {!!promo.subtitulo && <Text style={s.subtitulo}>{promo.subtitulo}</Text>}
            </View>

            {/* Contenido */}
            <View style={s.cardBody}>
              {items.map((item, i) => (
                <View key={i} style={s.itemRow}>
                  <Text style={[s.dot, { color }]}>●</Text>
                  <Text style={s.itemTxt}>{item}</Text>
                </View>
              ))}

              {!!promo.precio && (
                <View style={s.precioRow}>
                  {!!promo.etiquetaPrecio && (
                    <Text style={s.etiquetaPrecio}>{promo.etiquetaPrecio}</Text>
                  )}
                  <Text style={[s.precio, { color }]}>${promo.precio}</Text>
                </View>
              )}

              {!!promo.vigencia && (
                <Text style={s.vigencia}>🗓 {promo.vigencia}</Text>
              )}

              {!!promo.footer && (
                <Text style={s.footer}>{promo.footer}</Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#fff8f2" },
  center:        { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff8f2", padding: 24 },
  pageTitle:     { fontSize: 22, fontWeight: "800", color: "#532803", textAlign: "center", marginVertical: 20 },
  vacio:         { color: "#aaa", textAlign: "center", fontSize: 15 },
  bannerExclusivo: { backgroundColor: "#532803", marginHorizontal: 16, marginBottom: 12, borderRadius: 10, padding: 12 },
  bannerTxt:       { color: "#fff", fontWeight: "700", fontSize: 13, textAlign: "center" },

  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader:    { padding: 16, paddingBottom: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  badge:         { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.8)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  titulo:        { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  subtitulo:     { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 },

  cardBody:      { padding: 16 },
  itemRow:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 6, gap: 8 },
  dot:           { fontSize: 8, marginTop: 5 },
  itemTxt:       { fontSize: 14, color: "#421e02", flex: 1 },

  precioRow:     { marginTop: 12, alignItems: "flex-start" },
  etiquetaPrecio:{ fontSize: 11, color: "#a07850", textTransform: "uppercase", letterSpacing: 0.5 },
  precio:        { fontSize: 28, fontWeight: "900", marginTop: 2 },

  vigencia:      { fontSize: 12, color: "#a07850", marginTop: 10 },
  footer:        { fontSize: 11, color: "#bbb", marginTop: 6, fontStyle: "italic" },
});
