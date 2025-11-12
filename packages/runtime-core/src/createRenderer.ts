import { ShapeFlags } from './shapeFlags.js';

export function createRenderer(options: any) {
	const {
		createElement: hostCreateElement,
		setElementText: hostSetElementText,
		insert: hostInsert,
		remove: hostRemove,
		createText: hostCreateText,
		setText: hostSetText,
		parentNode: hostParentNode,
		nextSibling: hostNextSibling,
		patchProp: hostPatchProp,
	} = options;

	function mountChildren(child: any, container: any) {
		if (child.shapeFlags & ShapeFlags.ELEMENT) {
			patch(null, child, container);
		}
	}

	function mountElement(vnode: any, container: any) {
		const {type, children, props, shapeFlag } = vnode;
		const el = hostCreateElement(type);
		if (props) {
			for (let key in props) {
                console.log(key,props[key])
				hostPatchProp(el, key,null, props[key]);
			}
		}
		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			hostSetElementText(el, children);
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			children.forEach((child: any) => {
				mountChildren(child, el);
			});
		}

		hostInsert(el, container);
	}

	function patch(oldVnode: any, vnode: any, container: any) {
		if (!oldVnode) {
			mountElement(vnode, container);
		} else {
		}
	}

	let render = (vnode: any, container: any) => {
        debugger
		if (container._node) {
			patch(container._node, vnode, container);
		} else {
			
			patch(null, vnode, container);
		}
		container._node = vnode;
	};
	return {
		render,
	};
}
