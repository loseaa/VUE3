import { isString } from '@vue3/shared';
import { ShapeFlags } from './shapeFlags.js';
import { getLIS } from './getLIS.js';
import { proxyRef, reactive } from '../../reactive/index.js';
import { ReactiveEffect } from '../../reactive/src/effect.js';
import { queueJob } from './schedule.js';
import { hasOwn, isFunction } from '@vue3/shared/src/utils.js';
import {
	clearCurrentInstance,
	creatInstance,
	currentInstance,
	renderComponents,
	setComponentEffct,
	setCurrentInstance,
	setProxy,
} from '../../reactive/src/components.js';
import { isKeepAlive } from './KeepAlive.js';
import { closeBlock, currentBlock } from './h.js';
import { PatchFlags } from './patchFlags.js';

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

	function mountChildren(children: any, container: any, anchor?: any, parentComponent?: any) {
		if (!(children instanceof Array)) {
			patch(null, children, container, anchor, parentComponent);
		}
		for (let i = 0; i < children.length; i++) {
			patch(null, children[i], container, anchor, parentComponent);
		}
	}

	function mountElement(vnode: any, container: any, anchor?: any, parentComponent?: any) {
		
		const { type, children, props, shapeFlag, transition, patchFlag } = vnode;

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
			mountElement(children, el, anchor, parentComponent);
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			mountChildren(children, el, anchor, parentComponent);
		}
		if (transition) {
			transition.beforeEnter(el);
		}
		hostInsert(el, container, anchor);
		if(transition){
			transition.enter(el)
		}
	}

	function isSameVnodeType(oldVnode: any, vnode: any) {
		return oldVnode && vnode && oldVnode.type === vnode.type && oldVnode.key === vnode.key;
	}

	function processFragment(oldVnode: any, vnode: any, container: any, anchor?: any, parentComponent?: any) {
		if (!oldVnode) {
			mountChildren(vnode.children, container, anchor, parentComponent);
		} else {
			patchChildren(oldVnode, vnode, container, anchor, parentComponent);
		}
	}

	function processText(oldVnode: any, vnode: any, container: any, anchor: any) {
		if (!oldVnode) {
			vnode.el = hostCreateText(vnode.children);
			hostInsert(vnode.el, container, anchor);
		} else {
			vnode.el = oldVnode.el;
			hostSetText(vnode.el, vnode.children);
		}
	}

	function setRef(vnode: any) {
		if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			if (vnode.component?.exposed) {
				vnode.ref.value = vnode.component.exposed;
			} else {
				vnode.ref.value = vnode.component.proxy;
			}
		} else {
			vnode.ref.value = vnode.el;
		}
	}

	function patch(oldVnode: any, vnode: any, container: any, anchor?: any, parentComponent?: any) {
		if (vnode === oldVnode) {
			return;
		}
		if (!vnode) {
			return hostRemove(oldVnode.el);
		}

		if (!oldVnode) {
			if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
				mountElement(vnode, container, anchor, parentComponent);
				if (vnode.ref) {
					setRef(vnode);
				}
				return;
			}
		}

		if (vnode.type === 'text') {
			processText(oldVnode, vnode, container, anchor);
			if (vnode.ref) {
				setRef(vnode);
			}
			return;
		}
		if (vnode.type === Fragment) {
			processFragment(oldVnode, vnode, container, anchor, parentComponent);
			if (vnode.ref) {
				setRef(vnode);
			}
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
			if (vnode.ref) {
				setRef(vnode);
			}
			return;
		}
		if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			processComponents(oldVnode, vnode, container, anchor, parentComponent);
			if (vnode.ref) {
				setRef(vnode);
			}
		} else if (vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) {
			processComponents(oldVnode, vnode, container, anchor, parentComponent);
			if (vnode.ref) {
				setRef(vnode);
			}
		} else {
			if (!isSameVnodeType(oldVnode, vnode)) {
				if (oldVnode) unmount(oldVnode, parentComponent);

				mountElement(vnode, container, anchor, parentComponent);
				if (vnode.ref) {
					setRef(vnode);
				}
				return;
			} else {
				patchElement(oldVnode, vnode, container,anchor);
				if (vnode.ref) {
					setRef(vnode);
				}
			}
		}
		
	}

	function processComponents(oldVnode: any, vnode: any, container: any, anchor?: any, parentComponent?: any) {
		if (!oldVnode) {
			// 首次挂载
			mountComponent(vnode, container, anchor, parentComponent);
		} else {
			updateComponent(oldVnode, vnode, container, anchor, parentComponent);
		}
	}

	function propsHasChanged(oldProps: any, newProps: any) {
		if (!newProps) return false;
		if (Object.keys(oldProps).length !== Object.keys(newProps).length) return true;
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

	function updateComponent(oldVnode: any, vnode: any, container: any, anchor?: any, parentComponent?: any) {
		if (isKeepAlive(vnode.type) && isKeepAlive(oldVnode.type)) {
			const { props: oldProps } = oldVnode.component;
			const { props: newProps } = vnode;
			let newChildren = vnode.children;
			// let render = vnode.component.render;
			vnode.component = oldVnode.component;
			// vnode.component.render = render;
			updateSlots(vnode, newChildren);
			updateProps(vnode, oldProps, newProps);
			vnode.component.update();
		} else {
			unmount(oldVnode, parentComponent);
			mountComponent(vnode, container, anchor, parentComponent);
		}
	}
	function updateSlots(vnode: any, newChildren: any) {
		const instance = vnode.component;
		const slots = instance.slots;
		for (let key in slots) {
			slots[key] = newChildren[key];
		}
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

	function mountComponent(vnode: any, container: any, anchor?: any, parentComponent?: any) {
		const { render, props = {}, setup } = vnode.type;
		// 创建一个组件实例
		if (vnode.shapeFlag && vnode.shapeFlag & ShapeFlags.KETP_ALIVE) {
			parentComponent.ctx.active(vnode, container, anchor);
			return;
		}
		vnode.component = creatInstance(vnode, parentComponent);
		const instance = vnode.component;
		if (isKeepAlive(vnode.type)) {
			instance.ctx.renderer = {
				CreateElement: hostCreateElement,
				move(vnode: any, container: any, anchor: any) {
					hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor);
				},
				unmount,
			};
		}
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
			setCurrentInstance(instance);
			let setupRes = setup(vnode.component.props, setupContext);
			clearCurrentInstance();
			if (isFunction(setupRes)) {
				vnode.component.render = setupRes;
			} else {
				const setupProps = proxyRef(setupRes);
				vnode.component.setupProps = setupProps;
			}
		}

		if (!vnode.component.render) vnode.component.render = render;
		// 组件的activeeffect,数据变化重新渲染
		setComponentEffct(vnode.component, container, anchor, patch, parentComponent);
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

	function unmount(vNode: any, parentComponent?: any) {
		const { shapeFlag, type,transition } = vNode;

		if (type === Fragment) {
			unmountChildren(vNode, parentComponent);
			hostRemove();
		} else if (shapeFlag & ShapeFlags.SHOULD_KEEP_ALIVE) {
			parentComponent.ctx.deactive(vNode);
		} else if (shapeFlag & ShapeFlags.TELEPORT) {
			unmountChildren(vNode, parentComponent);
			return;
		} else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			unmount(vNode.component.subTree);
			return;
		} else if(shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT){
			unmount(vNode.component.subTree);
			return 
		}else {
			if(transition){
				
				transition.beforeLeave(vNode.el,()=>{
					hostRemove(vNode.el)
				});
			}else{
				hostRemove(vNode.el);
			}

		}
	}

	function unmountChildren(oldVnode: any, parentComponent?: any) {
		for (let i = 0; i < oldVnode.children.length; i++) {
			unmount(oldVnode.children[i], parentComponent);
		}
	}

	function patchKeyChildren(oldChildren: any, newChildren: any, el: HTMLElement, parentComponent?: any) {
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
				unmount(oldChildren[j], parentComponent);
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
					unmount(oldChildren[j], parentComponent);
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

	function patchChildren(oldVnode: any, vNode: any, el: HTMLElement, anchor?: any, parentComponent?: any) {
		const oldChildren = oldVnode.children || [];
		const newChildren = vNode.children || [];

		if (vNode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			if (oldVnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				unmountChildren(oldVnode, parentComponent);
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
				mountChildren(newChildren, el, anchor, parentComponent);
			}
		} else {
			hostRemove(oldVnode.children.el);
		}
	}

	function patchBlockChildren(oldVnode: any, vnode: any, el: HTMLElement,anchor?:any,parentComponent?:any) {
		for(let i=0;i<vnode.dynamicChildren.length;i++){
			patch(oldVnode.dynamicChildren[i], vnode.dynamicChildren[i], el,anchor,parentComponent);
		}
	}

	function patchElement(oldVnode: any, vnode: any,container:any,anchor?:any,parentComponent?:any) {

		const el = (vnode.el = oldVnode.el);
		if(vnode.patchFlag&&(vnode.patchFlag&PatchFlags.PROPS)){
			patchProps(oldVnode, vnode, el);
		}
		if(vnode.patchFlag&&(vnode.patchFlag&PatchFlags.CLASS)){
			// patchClass(oldVnode, vnode, el);
		}
		if(vnode.patchFlag&&(vnode.patchFlag&PatchFlags.TEXT)){
			// patchStyle(oldVnode, vnode, el);
			// debugger
			if(oldVnode.children.children!==vnode.children.children){
				hostSetElementText(el, vnode.children.children);
			}
		}
		if(vnode.dynamicChildren){
			
			patchBlockChildren(oldVnode, vnode, el,anchor,parentComponent);
		}else{
			patchChildren(oldVnode, vnode, el,anchor,parentComponent);
		}
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
