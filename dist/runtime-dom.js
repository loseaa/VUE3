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

// packages/runtime-core/src/createRenderer.ts
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
  function mountChildren(child, container) {
    if (child.shapeFlags & 1 /* ELEMENT */) {
      patch(null, child, container);
    }
  }
  function mountElement(vnode, container) {
    const { type, children, props, shapeFlag } = vnode;
    const el = hostCreateElement(type);
    if (props) {
      for (let key in props) {
        console.log(key, props[key]);
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      children.forEach((child) => {
        mountChildren(child, el);
      });
    }
    hostInsert(el, container);
  }
  function patch(oldVnode, vnode, container) {
    if (!oldVnode) {
      mountElement(vnode, container);
    } else {
    }
  }
  let render2 = (vnode, container) => {
    debugger;
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

// packages/shared/src/utils.ts
function isString(value) {
  return typeof value === "string";
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
      return createVnode(type, null, [propsOrChildren]);
    }
  } else if (l === 3) {
    if (isString(children)) {
      return createVnode(type, propsOrChildren, children);
    }
    return createVnode(type, propsOrChildren, [children]);
  } else {
    let children2 = [];
    for (let i = 2; i < l; i++) {
      children2.push(arguments[i]);
    }
    return createVnode(type, propsOrChildren, children2);
  }
}
function createVnode(type, props, children) {
  return {
    __v_isVnode: true,
    type,
    props,
    children
  };
}

// packages/runtime-dom/index.ts
var renderOption = Object.assign(nodeOps, { patchProp });
var render = (vnode, container) => {
  createRenderer(renderOption).render(vnode, container);
};
console.log(render);
export {
  h,
  render,
  renderOption
};
//# sourceMappingURL=runtime-dom.js.map
