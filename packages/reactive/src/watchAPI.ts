import { ReactiveEffect } from './effect.js';

function traverse(value: any, deep: boolean, seen = new Set()) {
	if(value.__v_isRef)
		return traverse(value.value, deep, seen);
	if (typeof value !== 'object' || value === null || seen.has(value)) {
		return value;
	}
	seen.add(value);
	if (!deep) {
		for (const key in value) {
			value[key];
		}
	}
	for (const key in value) {
		traverse(value[key], deep, seen);
	}
	return value;
}

export function watch(state: any, cb: Function, options: { immediate?: boolean; deep: boolean }) {
	let getter: () => any;
	if (typeof state === 'function') {
		getter = state as () => any;
	} else {
		getter = () => traverse(state, options?.deep);
	}

	let effect = new ReactiveEffect(getter, () => {
		const newValue = effect.run();
		cb(newValue, oldValue);
		oldValue = newValue;
	});
	let oldValue: any = effect.run();
	if (options?.immediate) {
		cb(oldValue, undefined);
		oldValue = getter();
	}

	let unwatch = () => {
		effect.stop();
		// 清理依赖
	}
	return unwatch
}

export function watchEffect(cb: Function, options: { immediate?: boolean }) {

	let effect = new ReactiveEffect(cb, () => {
		cb();
	})
	effect.run();

	let unwatch = () => {
		effect.stop();
		// 清理依赖
	}
	return unwatch
}