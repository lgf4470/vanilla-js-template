const manifest = {
  id: 'dashboard',
  icon: 'layout-dashboard',
  order: 1,
  i18nNamespace: 'dashboard',
  loadRoot: () => import('./index.js'),
  submodules: [],
  title: { 'zh-CN': '仪表盘', 'zh-TW': '儀表板', en: 'Dashboard' },
  route: '/',
  load: 'index.js',
  css: 'module.css',
  deps: ['app/lib/chart.umd.js'],
  i18nFile: 'i18n.js',
};

window.App?.registerModule(manifest);
export default manifest;
