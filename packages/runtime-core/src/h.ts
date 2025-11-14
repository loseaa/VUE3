import { isString } from "@vue3/shared";
import { ShapeFlags } from "./shapeFlags.js";

export function h(type: string, propsOrChildren?: any, children?: any) {
	let l = arguments.length;
	if (l === 2) {
		if (typeof propsOrChildren === 'object' && !propsOrChildren.__v_isVnode && !(propsOrChildren instanceof Array)) {
			return createVnode(type, propsOrChildren, null);
		} else {
            if(isString(propsOrChildren)){
                return createVnode(type, null, propsOrChildren);
            }
			if(propsOrChildren instanceof Array){
				return createVnode(type, null, propsOrChildren);
			}
			return createVnode(type, null, [propsOrChildren]);
		}
	}else if(l===3){
        if(isString(children)){
            return createVnode(type, propsOrChildren, children);
        }
		if(children&&!(children instanceof Array)){
            children = [children];
        }
		return createVnode(type, propsOrChildren, children);
	}else {
        let children = [];
        for(let i=2;i<l;i++){
            children.push(arguments[i]);
        }
        return createVnode(type, propsOrChildren, children);
    }
}

function createTextVNode(text:string) {
  return {
    type: "text",
    children: text,
    el: null // 在挂载时才会设置
  }
}

function createVnode(type: string, props: any, children: any) {
	 let shapeFlag = isString(type) ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT;

	 if(children){
        if(isString(children)){
            shapeFlag |= ShapeFlags.TEXT_CHILDREN;
        }else if(children instanceof Array){
            shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
        }
    }
	if(children&&isString(children)){
		children = createTextVNode(children);
	}
	if(children){
		for(let i=0;i<children.length;i++){
			if(isString(children[i])){
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
