const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Fuerza a Metro a resolver firebase/auth usando el bundle web
// en lugar del bundle React Native nativo (dist/rn/index.js)
// que requiere módulos nativos no disponibles en Expo Go
config.resolver.resolverMainFields = ["browser", "main"];

// Sobreescribe la resolución de @firebase/auth para apuntar
// explícitamente al bundle web y no al nativo
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@firebase/auth": path.resolve(
    __dirname,
    "node_modules/@firebase/auth"
  ),
};

// En Expo 54 / Metro 0.80+ se usa unstable_enablePackageExports
// desactivarlo evita que Metro use el campo "react-native" de exports
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
