// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  createElement(tag) {
    return document.createElement(tag);
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor);
  },
  remove(node) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(node, text) {
    node.nodeValue = text;
  },
  parentNode(node) {
    return node.parentNode;
  },
  nextSibling(node) {
    return node.nextSibling;
  }
};

// packages/runtime-dom/src/patchProps.ts
function patchStyle(el, prevValue, nextValue) {
  for (let key in nextValue) {
    el.style[key] = nextValue[key];
  }
  for (let key in prevValue) {
    if (!nextValue[key]) {
      el.style[key] = null;
    }
  }
}
function patchClass(el, prevValue, nextValue) {
  if (prevValue !== nextValue) {
    el.className = nextValue;
  }
}
function createInvoker(fn) {
  const invoker = (e) => {
    invoker.value(e);
  };
  invoker.value = fn;
  return invoker;
}
function patchEvent(el, key, prevValue, nextValue) {
  let invokers = el._ve_invoke || (el._ve_invoke = {});
  let eventName = key.slice(2).toLowerCase();
  if (nextValue) {
    if (!invokers[eventName]) {
      invokers[eventName] = createInvoker(nextValue);
    } else {
      invokers[eventName].value = nextValue;
    }
    el.addEventListener(eventName, invokers[eventName]);
  } else {
    el.removeEventListener(eventName, invokers[eventName]);
    invokers[eventName] = null;
  }
}
function patchProp(el, key, prevValue, nextValue) {
  if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  } else if (key === "class") {
    patchClass(el, prevValue, nextValue);
  } else if (/^on/.test(key)) {
    patchEvent(el, key, prevValue, nextValue);
  } else {
    if (nextValue === null || nextValue === void 0) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextValue);
    }
  }
}

// packages/runtime-core/src/Teleport.ts
var Teleport = {
  __is_Teleport: true,
  process(n1, n2, container, anchor, context) {
    const { patchChildren, mountChildren, move } = context;
    const TPTarget = document.querySelector(n2.props.to);
    if (!n1) {
      mountChildren(n2.children, TPTarget);
    } else {
      patchChildren(n1, n2, TPTarget);
      if (n1.props.to !== n2.props.to) {
        if (n2.children instanceof Array) {
          n2.children.forEach((child) => {
            move(child, TPTarget, anchor);
          });
        } else {
          move(n2.children, TPTarget, anchor);
        }
      }
    }
  }
};
function isTeleport(val) {
  return val?.__is_Teleport;
}

// packages/shared/src/utils.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}
function isFunction(value) {
  return typeof value === "function";
}
function isString(value) {
  return typeof value === "string";
}
var oldHasOwn = Object.prototype.hasOwnProperty;
function hasOwn(target, key) {
  return oldHasOwn.call(target, key);
}

// packages/runtime-core/src/getLIS.ts
function getLIS(arr) {
  let res = [0];
  let parents = [void 0];
  for (let i = 1; i < arr.length; i++) {
    let val = arr[i];
    if (val != void 0 && val > -1) {
      let lastOldVal = arr[res[res.length - 1]];
      if (lastOldVal !== void 0) {
        if (val > lastOldVal) {
          parents[i] = res[res.length - 1];
          res.push(i);
        } else {
          let target;
          let l = 0;
          let r2 = res.length - 1;
          while (l <= r2) {
            let mid = (l + r2) / 2 | 0;
            let _val = arr[res[mid]];
            if (_val !== void 0 && val > _val) {
              l = mid + 1;
            } else {
              target = mid;
              r2 = mid - 1;
            }
          }
          parents[i] = parents[res[target]];
          res[target] = i;
        }
      }
    }
  }
  if (res.length === 1) return [];
  let r = [res[res.length - 1]];
  while (true) {
    if (r[0] == void 0 || parents[r[0]] == void 0) {
      break;
    } else {
      r.unshift(parents[r[0]]);
    }
  }
  return r;
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

// packages/runtime-core/src/schedule.ts
var queue = [];
var flushing = false;
var p = Promise.resolve();
function queueJob(job) {
  if (queue.indexOf(job) < 0) queue.push(job);
  if (!flushing) {
    flushing = true;
    p.then(() => {
      flushing = false;
      let copy = queue.slice(0);
      queue.length = 0;
      copy.forEach((job2) => {
        job2();
      });
    });
  }
}

// packages/runtime-core/src/lifeCycle.ts
function createHook(type) {
  return function(fn, target = currentInstance) {
    if (target) {
      (target.hooks[type] || (target.hooks[type] = [])).push((t = target) => {
        fn(t);
      });
    }
  };
}
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeMount = createHook("bm" /* BEFOREMOUNTED */);
var onUpdated = createHook("u" /* UPDATED */);
var onBeforeUpdated = createHook("bu" /* BEFOREUPDTATED */);

// packages/reactive/src/components.ts
function creatInstance(vnode) {
  const { data = () => ({}) } = vnode.type;
  return {
    data: reactive(data()),
    vnode,
    isMounted: false,
    update: null,
    subTree: null,
    props: null,
    attrs: null,
    proxy: {},
    render: null,
    slots: {},
    exposed: null,
    hooks: {
      ["m" /* MOUNTED */]: [],
      ["u" /* UPDATED */]: [],
      ["bm" /* BEFOREMOUNTED */]: [],
      ["bu" /* BEFOREUPDTATED */]: []
    }
  };
}
var publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
};
function setProxy(instance) {
  instance.proxy = new Proxy(instance, {
    get(target, key) {
      const { data, props, setupProps } = target;
      if (setupProps && hasOwn(setupProps, key)) {
        return setupProps[key];
      }
      if (hasOwn(publicProperty, key)) {
        return publicProperty[key](target);
      }
      if (data && hasOwn(data, key)) {
        return data[key];
      }
      if (props && hasOwn(props, key)) {
        return props[key];
      }
    },
    set(target, key, newValue) {
      const { data, props } = target;
      if (data && hasOwn(data, key)) {
        data[key] = newValue;
        return true;
      }
      if (props && hasOwn(props, key)) {
        console.warn("props are readOnly");
        return true;
      }
      return true;
    }
  });
}
function setComponentEffct(instance, container, anchor, patch) {
  const componentUpdateFn = () => {
    const { render: render2 } = instance;
    if (!instance.isMounted) {
      const subTree = render2.call(instance.proxy, instance.proxy);
      instance.subTree = subTree;
      instance.hooks["bm" /* BEFOREMOUNTED */].forEach((fn) => fn());
      patch(null, subTree, container, anchor);
      instance.hooks["m" /* MOUNTED */].forEach((fn) => fn());
      instance.isMounted = true;
    } else {
      const subTree = render2.call(instance.proxy, instance.proxy);
      instance.hooks["bu" /* BEFOREUPDTATED */].forEach((fn) => fn());
      patch(instance.subTree, subTree, container, anchor);
      instance.subTree = subTree;
      instance.hooks["u" /* UPDATED */].forEach((fn) => fn());
    }
  };
  const effect2 = new ReactiveEffect(componentUpdateFn, () => {
    queueJob(update);
  });
  const update = () => {
    effect2.run();
  };
  instance.update = update;
  update();
}
var currentInstance = null;
function setCurrentInstance(instance) {
  currentInstance = instance;
}
function clearCurrentInstance() {
  currentInstance = null;
}

// packages/runtime-core/src/createRenderer.ts
var Fragment = Symbol("Fragment");
function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    insert: hostInsert,
    remove: hostRemove,
    createText: hostCreateText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = options;
  function mountChildren(children, container) {
    if (!(children instanceof Array)) {
      patch(null, children, container);
    }
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container);
    }
  }
  function mountElement(vnode, container, anchor) {
    const { type, children, props, shapeFlag } = vnode;
    if (type === "text") {
      const el2 = hostCreateText(children);
      vnode.el = el2;
      hostInsert(el2, container, anchor);
      return el2;
    }
    const el = hostCreateElement(type);
    vnode.el = el;
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      mountElement(children, el);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  }
  function isSameVnodeType(oldVnode, vnode) {
    return oldVnode && vnode && oldVnode.type === vnode.type && oldVnode.key === vnode.key;
  }
  function processFragment(oldVnode, vnode, container, anchor) {
    if (!oldVnode) {
      mountChildren(vnode.children, container);
    } else {
      patchChildren(oldVnode, vnode, container);
    }
  }
  function processText(oldVnode, vnode, container, anchor) {
    if (!oldVnode) {
      vnode.el = hostCreateText(vnode.children);
      hostInsert(vnode.el, container, anchor);
    } else {
      vnode.el = oldVnode.el;
      hostSetText(vnode.el, vnode.children);
    }
  }
  function setRef(vnode) {
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      if (vnode.component?.exposed) {
        vnode.ref.value = vnode.component.exposed;
      } else {
        vnode.ref.value = vnode.component.proxy;
      }
    } else {
      vnode.ref.value = vnode.el;
    }
  }
  function patch(oldVnode, vnode, container, anchor) {
    if (vnode === oldVnode) {
      return;
    }
    if (!vnode) {
      return hostRemove(oldVnode.el);
    }
    if (!oldVnode) {
      if (vnode.shapeFlag & 1 /* ELEMENT */) {
        mountElement(vnode, container, anchor);
        if (vnode.ref) {
          setRef(vnode);
        }
        return;
      }
    }
    if (vnode.type === "text") {
      processText(oldVnode, vnode, container, anchor);
      if (vnode.ref) {
        setRef(vnode);
      }
      return;
    }
    if (vnode.type === Fragment) {
      processFragment(oldVnode, vnode, container, anchor);
      if (vnode.ref) {
        setRef(vnode);
      }
      return;
    }
    if (vnode.shapeFlag & 64 /* TELEPORT */) {
      vnode.type.process(oldVnode, vnode, container, anchor, {
        mountChildren,
        patchChildren,
        move(vnode2, container2, anchor2) {
          hostInsert(vnode2.component ? vnode2.component.subTree.el : vnode2.el, container2, anchor2);
        }
      });
      if (vnode.ref) {
        setRef(vnode);
      }
      return;
    }
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      processComponents(oldVnode, vnode, container, anchor);
      if (vnode.ref) {
        setRef(vnode);
      }
    } else {
      if (!isSameVnodeType(oldVnode, vnode)) {
        if (oldVnode) unmount(oldVnode);
        mountElement(vnode, container, anchor);
        if (vnode.ref) {
          setRef(vnode);
        }
        return;
      } else {
        patchElement(oldVnode, vnode);
        if (vnode.ref) {
          setRef(vnode);
        }
      }
    }
  }
  function processComponents(oldVnode, vnode, container, anchor) {
    if (!oldVnode) {
      mountComponent(vnode, container, anchor);
    } else {
      updateComponent(oldVnode, vnode, container, anchor);
    }
  }
  function propsHasChanged(oldProps, newProps) {
    if (Object.keys(oldProps).length !== Object.keys(newProps).length) return false;
    for (let key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        return true;
      }
    }
    return false;
  }
  function updateProps(vnode, oldProps, newProps) {
    const instance = vnode.component;
    const props = vnode.props;
    if (propsHasChanged(oldProps, newProps)) {
      for (let key in newProps) {
        instance.props[key] = newProps[key];
      }
      for (let key in oldProps) {
        if (!hasOwn(newProps, key)) {
          delete instance.props[key];
        }
      }
    }
  }
  function updateComponent(oldVnode, vnode, container, anchor) {
    const { props: oldProps } = oldVnode.component;
    const { props: newProps } = vnode;
    vnode.component = oldVnode.component;
    updateProps(vnode, oldProps, newProps);
  }
  function getPropsAndAttrs(props, all, instance) {
    let attrs = {};
    let newProps = {};
    for (let key in all) {
      if (!hasOwn(props, key)) {
        attrs[key] = all[key];
      } else {
        newProps[key] = all[key];
      }
    }
    instance.attrs = attrs;
    instance.props = reactive(newProps);
  }
  function initSlot(instance) {
    if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) instance.slots = instance.vnode.children;
  }
  function mountComponent(vnode, container, anchor) {
    const { render: render3, props = {}, setup } = vnode.type;
    vnode.component = creatInstance(vnode);
    const instance = vnode.component;
    initSlot(instance);
    getPropsAndAttrs(props, vnode.props, vnode.component);
    setProxy(vnode.component);
    if (setup) {
      let setupContext = {
        slots: instance.slots,
        attrs: instance.attrs,
        expose(val) {
          instance.exposed = val;
        },
        emit(name, ...payload) {
          let eventName = "on" + name[0].toUpperCase() + name.slice(1);
          instance.vnode.props[eventName](...payload);
        }
      };
      setCurrentInstance(instance);
      let setupRes = setup(vnode.component.props, setupContext);
      clearCurrentInstance();
      if (isFunction(setupRes)) {
        vnode.component.render = setupRes;
      } else {
        const setupProps = proxyRef(setupRes);
        vnode.component.setupProps = setupProps;
      }
    }
    if (!vnode.component.render) vnode.component.render = render3;
    setComponentEffct(vnode.component, container, anchor, patch);
  }
  function patchProps(oldNode, vNode, el) {
    const oldProps = oldNode.props || {};
    const newProps = vNode.props || {};
    for (let key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        hostPatchProp(el, key, oldProps[key], newProps[key]);
      }
    }
    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  }
  function unmount(vNode) {
    const { shapeFlag, type } = vNode;
    if (type === Fragment) {
      unmountChildren(vNode);
      hostRemove();
    } else if (shapeFlag & 64 /* TELEPORT */) {
      unmountChildren(vNode);
      return;
    } else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      hostRemove(vNode.component.subTree.el);
    }
    hostRemove(vNode.el);
  }
  function unmountChildren(oldVnode) {
    for (let i = 0; i < oldVnode.children.length; i++) {
      unmount(oldVnode.children[i]);
    }
  }
  function patchKeyChildren(oldChildren, newChildren, el) {
    let i = 0;
    let e1 = oldChildren.length - 1;
    let e2 = newChildren.length - 1;
    while (i <= e1 && i <= e2) {
      if (isSameVnodeType(oldChildren[i], newChildren[i])) {
        patch(oldChildren[i], newChildren[i], el);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      if (isSameVnodeType(oldChildren[e1], newChildren[e2])) {
        patch(oldChildren[e1], newChildren[e2], el);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (newChildren[e2 + 1]?.el) {
        for (let j = i; j <= e2; j++) {
          patch(null, newChildren[j], el, newChildren[e2 + 1]?.el);
        }
      } else {
        for (let j = i; j <= e2; j++) {
          patch(null, newChildren[j], el);
        }
      }
    } else if (i > e2) {
      for (let j = i; j <= e1; j++) {
        unmount(oldChildren[j]);
      }
    } else {
      let s1 = i;
      let s2 = i;
      let keytoNewIndex = /* @__PURE__ */ new Map();
      for (let j = s2; j <= e2; j++) {
        if (newChildren[j].key) keytoNewIndex.set(newChildren[j].key, j);
      }
      for (let j = s1; j <= e1; j++) {
        if (!keytoNewIndex.has(oldChildren[j].key)) {
          unmount(oldChildren[j]);
        } else {
          let index = keytoNewIndex.get(oldChildren[j].key);
          patch(oldChildren[j], newChildren[index], el);
        }
      }
      let oldKetToIndex = /* @__PURE__ */ new Map();
      for (let j = s1; j <= e1; j++) {
        oldKetToIndex.set(oldChildren[j].key, j - s1);
      }
      let newIndexinOldIndex = [];
      for (let j = s2; j <= e2; j++) {
        let newKey = newChildren[j].key;
        if (oldKetToIndex.has(newKey)) {
          newIndexinOldIndex.push(oldKetToIndex.get(newKey));
        } else {
          newIndexinOldIndex.push(-1);
        }
      }
      let lis = getLIS(newIndexinOldIndex);
      let l = lis.length - 1;
      for (let j = e2; j >= s2; j--) {
        let anchor = newChildren[j + 1]?.el;
        if (j === lis[l]) {
          l--;
        } else {
          if (!newChildren[j].el) {
            patch(null, newChildren[j], el, anchor);
          } else {
            hostInsert(newChildren[j].el, el, anchor);
          }
        }
      }
    }
  }
  function patchChildren(oldVnode, vNode, el) {
    const oldChildren = oldVnode.children || [];
    const newChildren = vNode.children || [];
    if (vNode.shapeFlag & 8 /* TEXT_CHILDREN */) {
      if (oldVnode.shapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(oldVnode);
      }
      if (oldChildren !== newChildren) {
        hostSetElementText(el, newChildren.children);
      }
    } else if (vNode.shapeFlag & 16 /* ARRAY_CHILDREN */) {
      if (oldVnode.shapeFlag & 8 /* TEXT_CHILDREN */) {
        hostRemove(oldVnode.children.el);
        mountChildren(newChildren, el);
      } else if (oldVnode.shapeFlag & 16 /* ARRAY_CHILDREN */) {
        patchKeyChildren(oldChildren, newChildren, el);
      } else {
        mountChildren(newChildren, el);
      }
    } else {
      hostRemove(oldVnode.children.el);
    }
  }
  function patchElement(oldVnode, vnode) {
    const el = vnode.el = oldVnode.el;
    patchProps(oldVnode, vnode, el);
    patchChildren(oldVnode, vnode, el);
  }
  let render2 = (vnode, container) => {
    if (container._node) {
      patch(container._node, vnode, container);
    } else {
      patch(null, vnode, container);
    }
    container._node = vnode;
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  let l = arguments.length;
  if (l === 2) {
    if (typeof propsOrChildren === "object" && !propsOrChildren.__v_isVnode && !(propsOrChildren instanceof Array)) {
      return createVnode(type, propsOrChildren, null);
    } else {
      if (isString(propsOrChildren)) {
        return createVnode(type, null, propsOrChildren);
      }
      if (propsOrChildren instanceof Array) {
        return createVnode(type, null, propsOrChildren);
      }
      return createVnode(type, null, [propsOrChildren]);
    }
  } else if (l === 3) {
    if (isString(children)) {
      return createVnode(type, propsOrChildren, children);
    }
    if (children && !(children instanceof Array)) {
      children = children;
    }
    return createVnode(type, propsOrChildren, children);
  } else {
    let children2 = [];
    for (let i = 2; i < l; i++) {
      children2.push(arguments[i]);
    }
    return createVnode(type, propsOrChildren, children2);
  }
}
function createTextVNode(text) {
  return {
    type: "text",
    children: text,
    el: null
    // 在挂载时才会设置
  };
}
function createVnode(type, props, children) {
  let shapeFlag = isString(type) ? 1 /* ELEMENT */ : isTeleport(type) ? 64 /* TELEPORT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
  if (children) {
    if (isString(children)) {
      shapeFlag |= 8 /* TEXT_CHILDREN */;
    } else if (children instanceof Array) {
      shapeFlag |= 16 /* ARRAY_CHILDREN */;
    } else if (children instanceof Object) {
      shapeFlag |= 32 /* SLOTS_CHILDREN */;
    }
  }
  if (children && isString(children)) {
    children = createTextVNode(children);
  }
  if (children) {
    for (let i = 0; i < children.length; i++) {
      if (isString(children[i])) {
        children[i] = createTextVNode(children[i]);
      }
    }
  }
  return {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key,
    shapeFlag,
    el: null,
    ref: props?.ref
  };
}

// packages/runtime-dom/index.ts
var renderOption = Object.assign(nodeOps, { patchProp });
var render = (vnode, container) => {
  createRenderer(renderOption).render(vnode, container);
};
console.log(render);
export {
  Fragment,
  Teleport,
  computed,
  createRenderer,
  effect,
  h,
  onBeforeMount,
  onBeforeUpdated,
  onMounted,
  onUpdated,
  proxyRef,
  reactive,
  ref,
  render,
  renderOption,
  toRef,
  toRefs,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.js.map
