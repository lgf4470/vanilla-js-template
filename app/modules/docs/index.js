(function () {
  'use strict';

  function render(route, ctx) {
    var t = ctx.t;
    var first = '/docs/introduction';
    return (
      '<div class="mx-auto flex max-w-3xl flex-col gap-4 docs-page">' +
      '<div data-slot="card" class="' +
      App.ui.cardClass('') +
      '">' +
      '<div class="' +
      App.ui.cardContentClass('flex flex-col items-center gap-4 py-16 text-center') +
      '">' +
      '<div class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">' +
      App.icon.iconSvg('book-open', { class: 'size-8' }) +
      '</div>' +
      '<h1 class="font-heading text-2xl font-semibold tracking-tight">' +
      t('docs.introduction.title') +
      '</h1>' +
      '<p class="max-w-md text-sm text-muted-foreground">' +
      t('docs.introduction.desc') +
      '</p>' +
      '<a href="#' +
      first +
      '" data-link="' +
      first +
      '" class="' +
      App.ui.buttonClass('default') +
      '">' +
      t('placeholder.back') +
      '</a>' +
      '</div></div></div>'
    );
  }

  App.defineModule({ id: 'docs', render: render });
})();
