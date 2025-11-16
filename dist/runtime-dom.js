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

// packages/shared/src/utils.ts
function isString(value) {
  return typeof value === "string";
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
  function patch(oldVnode, vnode, container, anchor) {
    if (vnode === oldVnode) {
      return;
    }
    if (!vnode) {
      return hostRemove(oldVnode.el);
    }
    if (!oldVnode) {
      if (vnode.shapeFlag & 1 /* ELEMENT */) {
        return mountElement(vnode, container, anchor);
      }
    }
    if (vnode.type === Fragment) {
      processFragment(oldVnode, vnode, container, anchor);
      return;
    }
    if (!isSameVnodeType(oldVnode, vnode)) {
      if (oldVnode) unmount(oldVnode);
      return mountElement(vnode, container, anchor);
    } else {
      patchElement(oldVnode, vnode);
    }
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
    hostRemove(vNode.el);
  }
  function unmountChildren(oldVnode, container) {
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
        if (newChildren[j].key)
          keytoNewIndex.set(newChildren[j].key, j);
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
        unmountChildren(oldVnode, el);
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
      children = [children];
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
  let shapeFlag = isString(type) ? 1 /* ELEMENT */ : 4 /* STATEFUL_COMPONENT */;
  if (children) {
    if (isString(children)) {
      shapeFlag |= 8 /* TEXT_CHILDREN */;
    } else if (children instanceof Array) {
      shapeFlag |= 16 /* ARRAY_CHILDREN */;
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
    el: null
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
  h,
  render,
  renderOption
};
//# sourceMappingURL=runtime-dom.js.map
