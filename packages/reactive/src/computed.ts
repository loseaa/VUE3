import { isFunction } from '@VUE3/shared';
import { ReactiveEffect } from './effect.js';
import { trackRefValue, triggerRefValue } from './ref.js';
import { trigger } from './activeEffect.js';

export function computed<T>(getter: () => T | { get: () => T; set: (v: T) => void }): any {
	return creatComputedRef(getter);
}

function creatComputedRef<T>(getter: () => T | { get: () => T; set: (v: T) => void }) {
	if (isFunction(getter)) {
		return new ComputedRefImpl(getter as () => T, undefined);
	} else {
		return new ComputedRefImpl((getter as any).get, (getter as any).set);
	}
}

export class ComputedRefImpl {
	public __v_isRef = true;
	private _value!: any;
	private _dirty: boolean = true;
    public _effect: ReactiveEffect;
    public dep: Map<ReactiveEffect, number> = new Map();
	constructor(
		private _getter: () => any,
		private _setter: ((v: any) => void) | undefined
	) {
		this._effect = new ReactiveEffect(_getter,()=>{
            this._dirty=true;
            triggerRefValue(this);
        });
	}
	set value(newValue: any) {
		if (this._setter) {
			this._setter(newValue);
		} else {
			console.warn('computed is readonly');
		}
	}
	get value() {
        trackRefValue(this);
		if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
		}
        return this._value;
	}
}
