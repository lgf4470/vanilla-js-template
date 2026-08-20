const manifest = {
  id: 'apps',
  icon: 'package',
  order: 3,
  i18nNamespace: 'apps',
  loadRoot: () => import('./index.js'),
  submodules: [],
  title: { 'zh-CN': '应用', 'zh-TW': '應用', en: 'Apps' },
  route: '/apps',
  load: 'index.js',
  css: 'module.css',
  i18nFile: 'i18n.js',
};

window.App?.registerModule(manifest);
export default manifest;
