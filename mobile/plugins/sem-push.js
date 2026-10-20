/**
 * Os lembretes do app são notificações locais (RF63): não precisam de push. O plugin do
 * expo-notifications adiciona o "aps-environment" (Push Notifications), que a conta gratuita da Apple
 * (Personal Team) não aceita e quebra a assinatura. Este plugin tira essa permissão.
 * Quando o app tiver push de verdade (servidor mandando avisos), é só remover este plugin.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function semPush(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
