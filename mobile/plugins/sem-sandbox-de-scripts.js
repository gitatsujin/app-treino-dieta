/**
 * O Xcode novo liga ENABLE_USER_SCRIPT_SANDBOXING, que impede o script do React Native
 * ("Bundle React Native code and images") de gravar o ip.txt e quebra o build no aparelho.
 * Este plugin desliga a opção sempre que a pasta ios/ é gerada (npx expo prebuild / run:ios).
 */
const { withXcodeProject } = require('expo/config-plugins');

module.exports = function semSandboxDeScripts(config) {
  return withXcodeProject(config, (cfg) => {
    const secoes = cfg.modResults.pbxXCBuildConfigurationSection();
    for (const chave of Object.keys(secoes)) {
      const item = secoes[chave];
      if (item && typeof item === 'object' && item.buildSettings) item.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }
    return cfg;
  });
};
