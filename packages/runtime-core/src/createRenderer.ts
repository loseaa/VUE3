import { isString } from '@vue3/shared';
import { ShapeFlags } from './shapeFlags.js';
import { getLIS } from './getLIS.js';


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

	function mountChildren(children: any, container: any) {
		for (let i = 0; i < children.length; i++) {
			patch(null, children[i], container);
		}
	}

	function mountElement(vnode: any, container: any, anchor?: any) {
		const { type, children, props, shapeFlag } = vnode;

		if (type === 'text') {
			const el = hostCreateText(children);
			vnode.el = el;
			hostInsert(el, container, anchor);
			return el;
		}

		const el = hostCreateElement(type);
		vnode.el = el;
		if (props) {
			for (let key in props) {
				hostPatchProp(el, key, null, props[key]);
			}
		}

		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			mountElement(children, el);
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			mountChildren(children, el);
		}
		hostInsert(el, container, anchor);
	}

	function isSameVnodeType(oldVnode: any, vnode: any) {
		return oldVnode && vnode && oldVnode.type === vnode.type && oldVnode.key === vnode.key;
	}

	function patch(oldVnode: any, vnode: any, container: any, anchor?: any) {
		if (vnode === oldVnode) {
			return;
		}
		if (!vnode) {
			return hostRemove(oldVnode.el);
		}
		if (!oldVnode) {
			if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
				return mountElement(vnode, container, anchor);
			}
		}
		if (!isSameVnodeType(oldVnode, vnode)) {
			if (oldVnode) unmount(oldVnode);
			return mountElement(vnode, container, anchor);
		} else {
			patchElement(oldVnode, vnode);
		}
	}

	function patchProps(oldNode: any, vNode: any, el: HTMLElement) {
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

	function unmount(vNode: any) {
		hostRemove(vNode.el);
	}

	function unmountChildren(oldVnode: any, container: any) {
		for (let i = 0; i < oldVnode.children.length; i++) {
			unmount(oldVnode.children[i]);
		}
	}

	function patchKeyChildren(oldChildren: any, newChildren: any, el: HTMLElement) {
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
			debugger;
			for (let j = i; j <= e1; j++) {
				unmount(oldChildren[j]);
			}
		} else {
			let s1 = i;
			let s2 = i;
			let keytoNewIndex = new Map();
			for (let j = s2; j <= e2; j++) {
				keytoNewIndex.set(newChildren[j].key, j);
			}
			// console.log(keytoNewIndex);
			// 删掉在老的中存在但是新的不存在的节点
			for (let j = s1; j <= e1; j++) {
				if (!keytoNewIndex.has(oldChildren[j].key)) {
					// 新的中没有就卸载
					unmount(oldChildren[j]);
				} else {
					// 新的中存在就把二者patch一下，等待后续交换位置即可
					// patch就是更新好所有的属性，包括el
					// 包括patch属性和patchchildren
					let index = keytoNewIndex.get(oldChildren[j].key);
					patch(oldChildren[j], newChildren[index], el);
				}
			}
			// // 倒序插入
			// // insertBefore 是在锚点前插入一个节点，
			// // 但如果文档中已经存在这个节点，则改为移动
			// for(let j=e2;j>=s2;j--){
			// 	let anchor=newChildren[j+1]?.el;
			// 	console.log(anchor);
			// 	// debugger
			// 	if(!newChildren[j]?.el){
			// 		patch(null,newChildren[j],el,anchor)
			// 	}else{
			// 		hostInsert(newChildren[j].el,el,anchor)
			// 	}
			// }

			// 求最长递增子序列的做法
			let oldKetToIndex = new Map();
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

			// 获取最长递增子序列 优化方法
			let lis = getLIS(newIndexinOldIndex);
			let l = lis.length - 1;
			// 倒序更新
			for (let j = e2; j >= s2; j--) {
				let anchor = newChildren[j + 1].el;
				if (j === lis[l]) {
					l--;
				} else {
					if (!newChildren[j].el) {
						patch(null,newChildren[j],el,anchor);
					} else {
						hostInsert(newChildren[j].el, el, anchor);
					}
				}
			}
		}
	}

	function patchChildren(oldVnode: any, vNode: any, el: HTMLElement) {
		const oldChildren = oldVnode.children || [];
		const newChildren = vNode.children || [];

		if (vNode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			if (oldVnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				unmountChildren(oldVnode, el);
			}
			if (oldChildren !== newChildren) {
				hostSetElementText(el, newChildren.children);
			}
		} else if (vNode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			if (oldVnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
				hostRemove(oldVnode.children.el);
				mountChildren(newChildren, el);
			} else if (oldVnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// todo
				patchKeyChildren(oldChildren, newChildren, el);
				// diff算法
			} else {
				mountChildren(newChildren, el);
			}
		} else {
			debugger;
			hostRemove(oldVnode.children.el);
		}
	}

	function patchElement(oldVnode: any, vnode: any) {
		const el = (vnode.el = oldVnode.el);
		patchProps(oldVnode, vnode, el);
		patchChildren(oldVnode, vnode, el);
	}

	let render = (vnode: any, container: any) => {
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
