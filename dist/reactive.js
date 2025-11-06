// packages/shared/src/utils.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}

// packages/reactive/src/reactive.ts
function reactive(target) {
  return creatReactiveObject(target);
}
var reactiveMap = /* @__PURE__ */ new WeakMap();
var mutableHandlers = {
  get(target, prop, key) {
    if (prop === "__v_isReactive") {
      return true;
    }
    return Reflect.get(target, prop, key);
  },
  set(target, prop, value, receiver) {
    const result = Reflect.set(target, prop, value, receiver);
    return result;
  }
};
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
  reactive
};
//# sourceMappingURL=reactive.js.map
