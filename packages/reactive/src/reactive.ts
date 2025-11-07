import { isObject } from '@VUE3/shared';
import { mutableHandlers } from './basehandler.js';
const reactiveMap = new WeakMap();

export function reactive(target: any) {
	return creatReactiveObject(target);
}

function creatReactiveObject(target: any) {
	if (!isObject(target)) {
		console.warn(`reactive ${target} 必须是一个对象`);
		return target;
	}
	if (reactiveMap.has(target)) {
		return reactiveMap.get(target);
	}
	if ((target as any).__v_isReactive) {
		return target;
	}

	const proxy = new Proxy(target, mutableHandlers);
	reactiveMap.set(target, proxy);
	return proxy;
}
