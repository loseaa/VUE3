// packages/compiler-core/src/compiler.ts
function compile(template) {
  const ast = parse(template);
  return ast;
}
function isEnd(context) {
  return context.template === "";
}
function getTEXT(context) {
  const match = context.template.match(/(.*?)(?:{{|<)/s);
  if (match) {
    return match[1];
  }
  return context.template;
}
function parseText(context) {
  const content = getTEXT(context);
  context.template = context.template.slice(content.length);
  return {
    type: 2 /* Text */,
    content
  };
}
function advanceBy(context, length) {
  context.template = context.template.slice(length);
}
function advanceSpace(context) {
  const match = context.template.match(/^\s+/);
  if (match) {
    advanceBy(context, match[0].length);
  }
}
function parseAttrs(context) {
  const attrs = [];
  while (!isEnd(context)) {
    if (context.template.startsWith("/")) {
      break;
    }
    const match = context.template.match(/^(\w+)\s*=\s*"([^"]*)"/);
    if (match) {
      attrs.push({
        name: match[1],
        value: match[2]
      });
      advanceBy(context, match[0].length);
      advanceSpace(context);
    } else {
      break;
    }
  }
  return attrs;
}
function parseElement(context) {
  let match;
  if (match = context.template.match(/^<\/\w+>/)) {
    advanceBy(context, match[0].length);
    return null;
  }
  debugger;
  match = context.template.match(/^<(\w+)/);
  advanceBy(context, 1);
  if (!match) {
    return null;
  }
  const tag = match[1];
  advanceBy(context, tag.length);
  advanceSpace(context);
  let isSelfClosing = context.template.startsWith("/");
  if (isSelfClosing) {
    advanceBy(context, 1);
  }
  advanceSpace(context);
  const attrs = parseAttrs(context);
  advanceSpace(context);
  advanceBy(context, 1);
  let children = parseChildren(context);
  return {
    type: 1 /* Element */,
    tag,
    children,
    isSelfClosing,
    attrs
  };
}
function parseChildren(context) {
  let children = [];
  while (!isEnd(context)) {
    if (context.template.startsWith("{{")) {
    } else if (context.template.startsWith("<")) {
      let child = parseElement(context);
      if (child) {
        children.push(child);
      } else {
        break;
      }
    } else {
      children.push(parseText(context));
    }
  }
  return children;
}
function parse(template) {
  const context = {
    source: template,
    template
  };
  let children = parseChildren(context);
  const ast = {
    type: 0 /* Root */,
    tag: "Root",
    children
  };
  return ast;
}
export {
  compile
};
//# sourceMappingURL=compiler-core.js.map
