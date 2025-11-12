import { isString } from "@vue3/shared";

export function h(type: string, propsOrChildren?: any, children?: any) {
	let l = arguments.length;
	if (l === 2) {
		if (typeof propsOrChildren === 'object' && !propsOrChildren.__v_isVnode && !(propsOrChildren instanceof Array)) {
			return createVnode(type, propsOrChildren, null);
		} else {
            if(isString(propsOrChildren)){
                return createVnode(type, null, propsOrChildren);
            }
			return createVnode(type, null, [propsOrChildren]);
		}
	}else if(l===3){
        if(isString(children)){
            return createVnode(type, propsOrChildren, children);
        }
		return createVnode(type, propsOrChildren, [children]);
	}else {
        let children = [];
        for(let i=2;i<l;i++){
            children.push(arguments[i]);
        }
        return createVnode(type, propsOrChildren, children);
    }
}

function createVnode(type: string, props: any, children: any) {
	return {
		__v_isVnode: true,
		type,
		props,
		children,
	};
}
