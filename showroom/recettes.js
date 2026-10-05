/*
 * Les recettes : des parcours qui montrent, étape par étape et sur la page
 * elle-même, quels composants assembler pour un besoin donné.
 */

import { t } from './langue.js?v=d92afbcf3f';

var RECIPES = [
  {
    id: 'form',
    titleKey: 'ui.recipe.form',
    steps: [
      {
        target: '#composants',
        titleKey: 'ui.recipe.form.s1.title',
        bodyKey: 'ui.recipe.form.s1.body',
        hot: '[data-snippet="LoginForm"]',
      },
      {
        target: '#composants',
        titleKey: 'ui.recipe.form.s2.title',
        bodyKey: 'ui.recipe.form.s2.body',
        hot: '#button-matrix',
      },
      {
        target: '#composants',
        titleKey: 'ui.recipe.form.s3.title',
        bodyKey: 'ui.recipe.form.s3.body',
        hot: '[data-snippet="ConfirmDialog"]',
      },
    ],
  },
  {
    id: 'empty',
    titleKey: 'ui.recipe.empty',
    steps: [
      {
        target: '#composants',
        titleKey: 'ui.recipe.empty.s1.title',
        bodyKey: 'ui.recipe.empty.s1.body',
        hot: '[data-dwc="empty-state"]',
      },
      {
        target: '#composants',
        titleKey: 'ui.recipe.empty.s2.title',
        bodyKey: 'ui.recipe.empty.s2.body',
        hot: '[data-snippet="ErrorBanner"]',
      },
    ],
  },
  {
    id: 'nav',
    titleKey: 'ui.recipe.nav',
    steps: [
      {
        target: '#composants',
        titleKey: 'ui.recipe.nav.s1.title',
        bodyKey: 'ui.recipe.nav.s1.body',
        hot: '[data-snippet="BottomNav"]',
      },
      {
        target: '#composants',
        titleKey: 'ui.recipe.nav.s2.title',
        bodyKey: 'ui.recipe.nav.s2.body',
        hot: '[data-snippet="PageContainer"]',
      },
      {
        target: '#composants',
        titleKey: 'ui.recipe.nav.s3.title',
        bodyKey: 'ui.recipe.nav.s3.body',
        hot: '[data-snippet="AppHeader"]',
      },
    ],
  },
  {
    id: 'toast',
    titleKey: 'ui.recipe.toast',
    steps: [
      {
        target: '#composants',
        titleKey: 'ui.recipe.toast.s1.title',
        bodyKey: 'ui.recipe.toast.s1.body',
        hot: '[data-snippet="Toast"]',
      },
      {
        target: '#composants',
        titleKey: 'ui.recipe.toast.s2.title',
        bodyKey: 'ui.recipe.toast.s2.body',
        hot: '[data-snippet="ErrorBanner"]',
      },
    ],
  },
];
var recipeId = '';
var recipeStep = 0;

function clearRecipeHot() {
  document.querySelectorAll('.sr-recipe-hot').forEach(function (el) {
    el.classList.remove('sr-recipe-hot');
  });
}

function recipeById(id) {
  for (var i = 0; i < RECIPES.length; i += 1) {
    if (RECIPES[i].id === id) return RECIPES[i];
  }
  return null;
}

function renderRecipe() {
  var panel = document.getElementById('sr-recipe');
  var rail = document.getElementById('sr-recipe-rail');
  var title = document.getElementById('sr-recipe-title');
  var body = document.getElementById('sr-recipe-body');
  var meta = document.getElementById('sr-recipe-meta');
  var next = document.getElementById('sr-recipe-next');
  if (!panel || !rail) return;
  rail.textContent = '';
  RECIPES.forEach(function (recipe) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'listitem');
    btn.textContent = t(recipe.titleKey, recipe.id);
    if (recipe.id === recipeId) btn.setAttribute('aria-current', 'true');
    btn.addEventListener('click', function () {
      startRecipe(recipe.id);
    });
    rail.appendChild(btn);
  });
  var recipe = recipeById(recipeId);
  if (!recipe) {
    panel.hidden = true;
    clearRecipeHot();
    return;
  }
  panel.hidden = false;
  var step = recipe.steps[recipeStep] || recipe.steps[0];
  if (title) title.textContent = t(step.titleKey, step.titleKey);
  if (body) body.textContent = t(step.bodyKey, step.bodyKey);
  if (meta)
    meta.textContent = t('ui.recipe.meta', 'Étape {n} / {total}')
      .replace('{n}', String(recipeStep + 1))
      .replace('{total}', String(recipe.steps.length));
  if (next)
    next.textContent =
      recipeStep >= recipe.steps.length - 1
        ? t('ui.recipe.finish', 'Terminer')
        : t('ui.recipe.next', 'Étape suivante');
  clearRecipeHot();
  var target = document.querySelector(step.target);
  if (target) target.scrollIntoView({ block: 'start' });
  var hot = document.querySelector(step.hot || step.target);
  if (hot) hot.classList.add('sr-recipe-hot');
}

function startRecipe(id) {
  recipeId = id || RECIPES[0].id;
  recipeStep = 0;
  renderRecipe();
}

function stopRecipe() {
  recipeId = '';
  recipeStep = 0;
  renderRecipe();
}

export function setupRecipes() {
  var start = document.getElementById('sr-recipe-start');
  var skip = document.getElementById('sr-recipe-skip');
  var next = document.getElementById('sr-recipe-next');
  if (start)
    start.addEventListener('click', function () {
      startRecipe(RECIPES[0].id);
    });
  if (skip) skip.addEventListener('click', stopRecipe);
  if (next)
    next.addEventListener('click', function () {
      var recipe = recipeById(recipeId);
      if (!recipe) return;
      if (recipeStep >= recipe.steps.length - 1) stopRecipe();
      else {
        recipeStep += 1;
        renderRecipe();
      }
    });
}
