/**
 * app/modules/registry.js
 * 模板业务模块唯一登记点；每行对应一个侧边栏一级菜单。
 */

export const moduleLoaders = {
  dashboard: () => import('./dashboard/module.config.js'),
  tasks: () => import('./tasks/module.config.js'),
  apps: () => import('./apps/module.config.js'),
  chats: () => import('./chats/module.config.js'),
  docs: () => import('./docs/module.config.js'),
  apihub: () => import('./apihub/module.config.js'),
  settings: () => import('./settings/module.config.js'),
};

export async function loadModuleConfigs() {
  const entries = Object.entries(moduleLoaders);
  const configs = await Promise.all(entries.map(([, load]) => load().then((module) => module.default)));
  for (const [index, [id]] of entries.entries()) {
    const config = configs[index];
    if (!config || config.id !== id || typeof config.loadRoot !== 'function') {
      throw new Error(`[registry] 模块 "${id}" 的 module.config.js 不符合 ModuleManifest 契约`);
    }
  }
  return configs;
}
