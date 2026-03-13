const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.blockList = [
  new RegExp(path.resolve(__dirname, ".local") + "/.*"),
];

module.exports = config;
