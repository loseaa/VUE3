import { isString } from '@vue3/shared';
import { ShapeFlags } from './shapeFlags.js';
import { getLIS } from './getLIS.js';
import { proxyRef, reactive } from '../../reactive/index.js';
import { ReactiveEffect } from '../../reactive/src/effect.js';
import { queueJob } from './schedule.js';
import { hasOwn, isFunction } from '@vue3/shared/src/utils.js';
import { creatInstance, setComponentEffct, setProxy } from '../../reactive/src/components.js';

export const Fragment = Symbol('Fragment');

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
		if(!(children instanceof Array)){
			patch(null,children,container)
		}
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

	function processFragment(oldVnode: any, vnode: any, container: any, anchor?: any) {
		if (!oldVnode) {
			mountChildren(vnode.children, container);
		} else {
			patchChildren(oldVnode, vnode, container);
		}
	}

	function processText(oldVnode:any, vnode:any, container:any, anchor:any){
		if(!oldVnode){
			vnode.el=hostCreateText(vnode.children)
			hostInsert(vnode.el,container,anchor)
		}else{
			vnode.el=oldVnode.el
			hostSetText(vnode.el,vnode.children)
		}
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

		if(vnode.type==="text"){
			processText(oldVnode, vnode, container, anchor)
			return 
		}
		if (vnode.type === Fragment) {
			processFragment(oldVnode, vnode, container, anchor);
			return;
		}

		if (vnode.shapeFlag & ShapeFlags.TELEPORT) {
			vnode.type.process(oldVnode, vnode, container, anchor, {
				mountChildren,
				patchChildren,
				move(vnode: any, container: any, anchor: any) {
					hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor);
				},
			});
			return
		}
		if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			processComponents(oldVnode, vnode, container, anchor);
		} else {
			if (!isSameVnodeType(oldVnode, vnode)) {
				if (oldVnode) unmount(oldVnode);
				return mountElement(vnode, container, anchor);
			} else {
				patchElement(oldVnode, vnode);
			}
		}
	}

	function processComponents(oldVnode: any, vnode: any, container: any, anchor?: any) {
		if (!oldVnode) {
			// 首次挂载
			mountComponent(vnode, container, anchor);
		} else {
			updateComponent(oldVnode, vnode, container, anchor);
		}
	}

	function propsHasChanged(oldProps: any, newProps: any) {
		if (Object.keys(oldProps).length !== Object.keys(newProps).length) return false;
		for (let key in newProps) {
			if (newProps[key] !== oldProps[key]) {
				return true;
			}
		}
		return false;
	}

	function updateProps(vnode: any, oldProps: any, newProps: any) {
		const instance = vnode.component;
		const props = vnode.props;
		if (propsHasChanged(oldProps, newProps)) {
			// 把所有的新的都更新
			for (let key in newProps) {
				instance.props[key] = newProps[key];
			}
			// 把老的上面新的没有的都删除
			for (let key in oldProps) {
				if (!hasOwn(newProps, key)) {
					delete instance.props[key];
				}
			}
		}
	}

	function updateComponent(oldVnode: any, vnode: any, container: any, anchor?: any) {
		const { props: oldProps } = oldVnode.component;
		const { props: newProps } = vnode;
		vnode.component = oldVnode.component;
		updateProps(vnode, oldProps, newProps);
	}

	function getPropsAndAttrs(props: any, all: any, instance: any) {
		let attrs: {
			[key: string]: any;
		} = {};
		let newProps: {
			[key: string]: any;
		} = {};
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

	function initSlot(instance: any) {
		if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) instance.slots = instance.vnode.children;
	}

	function mountComponent(vnode: any, container: any, anchor?: any) {
		const { render, props = {}, setup } = vnode.type;
		// 创建一个组件实例
		vnode.component = creatInstance(vnode);
		const instance = vnode.component;
		initSlot(instance);
		// 把props 和attrs区分开
		getPropsAndAttrs(props, vnode.props, vnode.component);

		// 创建组件实例的响应式
		setProxy(vnode.component);

		if (setup) {
			let setupContext = {
				slots: instance.slots,
				attrs: instance.attrs,
				expose(val: any) {
					instance.exposed = val;
				},
				emit(name: any, ...payload: any[]) {
					let eventName = 'on' + name[0].toUpperCase() + name.slice(1);
					instance.vnode.props[eventName](...payload);
				},
			};
			let setupRes = setup(vnode.component.props, setupContext);
			if (isFunction(setupRes)) {
				vnode.component.render = setupRes;
			} else {
				const setupProps = proxyRef(setupRes);
				vnode.component.setupProps = setupProps;
			}
		}

		if (!vnode.component.render) vnode.component.render = render;
		// 组件的activeeffect,数据变化重新渲染
		setComponentEffct(vnode.component, container, anchor, patch);
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
		const { shapeFlag, type } = vNode;
		if (type === Fragment) {
			unmountChildren(vNode);
			hostRemove();
		}else if(shapeFlag&ShapeFlags.TELEPORT){
			unmountChildren(vNode)
			return
		}
		 else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			hostRemove(vNode.component.subTree.el);
		}
		hostRemove(vNode.el);
	}

	function unmountChildren(oldVnode: any) {
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
			for (let j = i; j <= e1; j++) {
				unmount(oldChildren[j]);
			}
		} else {
			let s1 = i;
			let s2 = i;
			let keytoNewIndex = new Map();
			for (let j = s2; j <= e2; j++) {
				if (newChildren[j].key) keytoNewIndex.set(newChildren[j].key, j);
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

	function patchChildren(oldVnode: any, vNode: any, el: HTMLElement) {
		const oldChildren = oldVnode.children || [];
		const newChildren = vNode.children || [];

		if (vNode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			if (oldVnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				unmountChildren(oldVnode);
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
