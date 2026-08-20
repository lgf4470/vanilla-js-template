const manifest = {
  id: 'tasks',
  icon: 'list-todo',
  order: 2,
  i18nNamespace: 'tasks',
  loadRoot: () => import('./index.js'),
  submodules: [],
  title: { 'zh-CN': '任务', 'zh-TW': '任務', en: 'Tasks' },
  route: '/tasks',
  load: 'index.js',
  css: 'module.css',
  i18nFile: 'i18n.js',
};

window.App?.registerModule(manifest);
export default manifest;
