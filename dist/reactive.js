// packages/shared/src/utils.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}

// packages/reactive/src/effect.ts
function effect(fn, options = {}) {
  let _effect = new ReactiveEffect(
    fn,
    options.scheduler || (() => {
      _effect.run();
    })
  );
  _effect.run();
  let runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var activeEffect;
function preEffectClean(effect2) {
  effect2.trackId++;
  effect2.depsLength = 0;
}
function postCleanEffect(effect2) {
  const len = effect2.deps.length;
  if (effect2.depsLength < len) {
    for (let i = effect2.depsLength; i < len; i++) {
      cleanEffectDeps(effect2, effect2.deps[i]);
    }
    effect2.deps.length = effect2.depsLength;
  }
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
  }
  active = true;
  trackId = 0;
  deps = new Array();
  _isRunning = false;
  depsLength = 0;
  run() {
    if (!this.active) {
      return this.fn();
    }
    let lastEffect = activeEffect;
    activeEffect = this;
    preEffectClean(this);
    this._isRunning = true;
    const result = this.fn();
    this._isRunning = false;
    postCleanEffect(this);
    activeEffect = lastEffect;
    return result;
  }
};
function cleanEffectDeps(effect2, dep) {
  dep.delete(effect2);
  if (dep.size === 0) {
    dep.cleanup();
  }
}
function trackEffect(activeEffect2, dep) {
  if (dep.get(activeEffect2) === activeEffect2.trackId) {
    return;
  }
  activeEffect2.deps[activeEffect2.depsLength++] = dep;
  if (activeEffect2.deps[activeEffect2.depsLength] === dep) {
    activeEffect2.depsLength++;
  } else {
    let oldDep = activeEffect2.deps[activeEffect2.depsLength];
    if (oldDep) {
      cleanEffectDeps(activeEffect2, oldDep);
    }
  }
  dep.set(activeEffect2, activeEffect2.trackId);
}
function triggerEffects(dep) {
  dep.forEach((_, effect2) => {
    if (effect2._isRunning) {
      return;
    }
    if (effect2.scheduler) {
      effect2.scheduler();
    }
  });
}

// packages/reactive/src/activeEffect.ts
function creatDepMap(cleanup, _name) {
  let res = /* @__PURE__ */ new Map();
  res.cleanup = cleanup;
  res._name = _name;
  return res;
}
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = creatDepMap(() => {
        depsMap.delete(key);
      }, String(key)));
    }
    trackEffect(activeEffect, dep);
  }
}
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (!dep) return;
  triggerEffects(dep);
}

// packages/reactive/src/basehandler.ts
var mutableHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive") {
      return true;
    }
    track(target, key);
    let res = Reflect.get(target, key, receiver);
    if (isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    const result = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key);
    }
    return result;
  }
};

// packages/reactive/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  return creatReactiveObject(target);
}
function creatReactiveObject(target) {
  if (!isObject(target)) {
    console.warn(`reactive ${target} \u5FC5\u987B\u662F\u4E00\u4E2A\u5BF9\u8C61`);
    return target;
  }
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target);
  }
  if (target.__v_isReactive) {
    return target;
  }
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
export {
  effect,
  reactive
};
//# sourceMappingURL=reactive.js.map
