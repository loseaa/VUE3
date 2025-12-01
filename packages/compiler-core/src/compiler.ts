import { NodeTypes } from './nodeType.js';

export function compile(template: string) {
	const ast = parse(template);
	return ast;
}

function isEnd(context: any) {
	return context.template === '';
}

function getTEXT(context: any) {
	// 写一个正则表达式，提取文本内容，直到{{}}出现或者<出现
	// 也有可能未出现< {{}}直接保留文本
	const match = context.template.match(/(.*?)(?:{{|<)/s);
	if (match) {
		return match[1];
	}
	return context.template;
}

function parseText(context: any) {
	const content = getTEXT(context);
	// 移除文本内容
	context.template = context.template.slice(content.length);
	return {
		type: NodeTypes.Text,
		content,
	};
}

function advanceBy(context: any, length: number) {
	context.template = context.template.slice(length);
}

function advanceSpace(context: any) {
	const match = context.template.match(/^\s+/);
	if (match) {
		advanceBy(context, match[0].length);
	}
}

function parseAttrs(context: any) {
	const attrs: any = [];
	while (!isEnd(context)) {
		if (context.template.startsWith('/')) {
			break;
		}
		const match = context.template.match(/^(\w+)\s*=\s*"([^"]*)"/);
		if (match) {
			attrs.push({
				name: match[1],
				value: match[2],
			});
			advanceBy(context, match[0].length);
      advanceSpace(context);
		} else {
			break;
		}
	}
	return attrs;
}

function parseElement(context: any) {
  // 解析标签名
	// 如果是结束标签 直接返回null,用正则表达式来匹配结束标签
  let match
  if(match=context.template.match(/^<\/\w+>/)) {
    advanceBy(context, match[0].length);
    return null;
  }
  
  debugger

  match = context.template.match(/^<(\w+)/);
  advanceBy(context, 1);
  if (!match) {
    return null;
  }
  
  const tag = match[1];
  advanceBy(context, tag.length);
  advanceSpace(context);
  let isSelfClosing = context.template.startsWith('/');
  if (isSelfClosing) {
    advanceBy(context, 1);
  }
  advanceSpace(context);

  const attrs = parseAttrs(context);
  advanceSpace(context);
  advanceBy(context,1);
  let children=parseChildren(context);
  
	return {
		type: NodeTypes.Element,
		tag,
    children,
    isSelfClosing,
    attrs
  };
}

function parseChildren(context: any) {
	let children: any = [];
	while (!isEnd(context)) {
		if (context.template.startsWith('{{')) {
			// children.push(parseText(context))
		} else if (context.template.startsWith('<')) {
      let child =parseElement(context)
      if(child) {
        children.push(child)
      }else{
        break
      }
		} else {
			children.push(parseText(context));
		}
	}
	return children;
}

function parse(template: string) {
	const context = {
		source: template,
		template,
	};
	let children = parseChildren(context);
	const ast = {
		type: NodeTypes.Root,
		tag: 'Root',
		children,
	};
	return ast;
}
