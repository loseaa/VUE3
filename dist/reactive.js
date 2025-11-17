// packages/shared/src/utils.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}
function isFunction(value) {
  return typeof value === "function";
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
  stop() {
    if (this.active) {
      this.active = false;
      preEffectClean(this);
      postCleanEffect(this);
    }
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

// packages/reactive/src/ref.ts
function ref(value) {
  return createRef(value);
}
function createRef(value) {
  return new RefImpl(value);
}
function createReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref2) {
  if (activeEffect) {
    trackEffect(activeEffect, ref2.dep);
  }
}
function triggerRefValue(ref2) {
  triggerEffects(ref2.dep);
}
var RefImpl = class {
  __v_isRef = true;
  _rawValue;
  dep = /* @__PURE__ */ new Map();
  constructor(value) {
    this._rawValue = value;
  }
  get value() {
    trackRefValue(this);
    return createReactive(this._rawValue);
  }
  set value(newValue) {
    if (newValue === this._rawValue) return;
    if (isObject(newValue)) {
      this._rawValue = reactive(newValue);
    } else {
      this._rawValue = newValue;
    }
    triggerRefValue(this);
  }
};
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
  }
  __v_isRef = true;
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function toRefs(object) {
  const result = {};
  for (let key in object) {
    result[key] = toRef(object, key);
  }
  return result;
}
function proxyRef(value) {
  return new Proxy(value, {
    get(target, key, receiver) {
      const r = Reflect.get(target, key, receiver);
      return isRef(r) ? r.value : r;
    },
    set(target, key, value2, receiver) {
      const r = Reflect.get(target, key, receiver);
      if (isRef(r)) {
        r.value = value2;
        return true;
      } else {
        return Reflect.set(target, key, value2, receiver);
      }
    }
  });
}
function isRef(r) {
  return r ? r.__v_isRef === true : false;
}

// packages/reactive/src/computed.ts
function computed(getter) {
  return creatComputedRef(getter);
}
function creatComputedRef(getter) {
  if (isFunction(getter)) {
    return new ComputedRefImpl(getter, void 0);
  } else {
    return new ComputedRefImpl(getter.get, getter.set);
  }
}
var ComputedRefImpl = class {
  constructor(_getter, _setter) {
    this._getter = _getter;
    this._setter = _setter;
    this._effect = new ReactiveEffect(_getter, () => {
      this._dirty = true;
      triggerRefValue(this);
    });
  }
  __v_isRef = true;
  _value;
  _dirty = true;
  _effect;
  dep = /* @__PURE__ */ new Map();
  set value(newValue) {
    if (this._setter) {
      this._setter(newValue);
    } else {
      console.warn("computed is readonly");
    }
  }
  get value() {
    trackRefValue(this);
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
};

// packages/reactive/src/watchAPI.ts
function traverse(value, deep, seen = /* @__PURE__ */ new Set()) {
  if (value.__v_isRef)
    return traverse(value.value, deep, seen);
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (!deep) {
    for (const key in value) {
      value[key];
    }
  }
  for (const key in value) {
    traverse(value[key], deep, seen);
  }
  return value;
}
function watch(state, cb, options) {
  let getter;
  if (typeof state === "function") {
    getter = state;
  } else {
    getter = () => traverse(state, options?.deep);
  }
  let effect2 = new ReactiveEffect(getter, () => {
    const newValue = effect2.run();
    cb(newValue, oldValue);
    oldValue = newValue;
  });
  let oldValue = effect2.run();
  if (options?.immediate) {
    cb(oldValue, void 0);
    oldValue = getter();
  }
  let unwatch = () => {
    effect2.stop();
  };
  return unwatch;
}
function watchEffect(cb, options) {
  let effect2 = new ReactiveEffect(cb, () => {
    cb();
  });
  effect2.run();
  let unwatch = () => {
    effect2.stop();
  };
  return unwatch;
}
export {
  computed,
  effect,
  proxyRef,
  reactive,
  ref,
  toRef,
  toRefs,
  watch,
  watchEffect
};
//# sourceMappingURL=reactive.js.map
