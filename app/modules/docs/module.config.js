const children = [
  {
    id: 'introduction',
    icon: 'book-open',
    order: 1,
    title: { 'zh-CN': '简介', 'zh-TW': '簡介', en: 'Introduction' },
    route: '/docs/introduction',
    load: 'sub/introduction.js',
    loadView: () => import('./sub/introduction.js'),
  },
  {
    id: 'get-started',
    icon: 'rocket',
    order: 2,
    title: { 'zh-CN': '快速开始', 'zh-TW': '快速開始', en: 'Get Started' },
    route: '/docs/get-started',
    load: 'sub/get-started.js',
    loadView: () => import('./sub/get-started.js'),
  },
  {
    id: 'tutorials',
    icon: 'graduation-cap',
    order: 3,
    title: { 'zh-CN': '教程', 'zh-TW': '教學', en: 'Tutorials' },
    route: '/docs/tutorials',
    load: 'sub/tutorials.js',
    loadView: () => import('./sub/tutorials.js'),
  },
  {
    id: 'changelog',
    icon: 'history',
    order: 4,
    title: { 'zh-CN': '更新日志', 'zh-TW': '更新日誌', en: 'Changelog' },
    route: '/docs/changelog',
    load: 'sub/changelog.js',
    loadView: () => import('./sub/changelog.js'),
  },
];

const manifest = {
  id: 'docs',
  icon: 'book-open',
  order: 5,
  i18nNamespace: 'docs',
  loadRoot: () => import('./index.js'),
  title: { 'zh-CN': '文档', 'zh-TW': '文件', en: 'Documentation' },
  route: '/docs',
  load: 'index.js',
  css: 'module.css',
  i18nFile: 'i18n.js',
  children,
};

window.App?.registerModule(manifest);
export default manifest;
