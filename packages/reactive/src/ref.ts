import { isObject } from '@VUE3/shared';
import { reactive } from './reactive.js';
import { activeEffect, trackEffect, triggerEffects, type ReactiveEffect } from './effect.js';
import type { ComputedRefImpl } from './computed.js';

export function ref(value: any) {
	return createRef(value);
}

function createRef(value: any) {
	return new RefImpl(value);
}

function createReactive(value: any) {
	return isObject(value) ? reactive(value) : value;
}

export function trackRefValue(ref: RefImpl|ComputedRefImpl) {
	// TODO 依赖收集
	if (activeEffect) {
		trackEffect(activeEffect, ref.dep);
	}
}

export function triggerRefValue(ref: RefImpl|ComputedRefImpl) {
	// TODO 触发更新
	triggerEffects(ref.dep);
}

class RefImpl {
	public __v_isRef = true;
	private _rawValue: any;
	public dep: Map<ReactiveEffect, number> = new Map();
	constructor(value: any) {
		this._rawValue = value;
	}
	get value() {
		trackRefValue(this);
		return createReactive(this._rawValue);
	}
	set value(newValue: any) {
        // 新旧值对比
		if (newValue === this._rawValue) return;

        // 如果新赋值的值是对象 则需要转换成响应式对象
        if(isObject(newValue)){
            this._rawValue= reactive(newValue);
        }else{
            this._rawValue=newValue;
        }
		// TODO 触发更新
		triggerRefValue(this);
	}
}


class ObjectRefImpl {
    public __v_isRef = true;
    constructor(
        private _object: any,
        private _key: string
    ) {}
    get value() {
        return this._object[this._key];
    }
    set value(newValue: any) {
        this._object[this._key] = newValue;
    }
}


// toRef   toRefs
export function toRef(object: any, key: string) {
    return new ObjectRefImpl(object,key);
}

export function toRefs(object: any) {
    const result: any =  {};
    for (let key in object) {
        result[key] = toRef(object,key);
    }
    return result;
}


export function proxyRef(value:any){
    return new Proxy(value,{
        get(target,key,receiver){
            const r=Reflect.get(target,key,receiver);
            return isRef(r)?r.value:r;
        },
        set(target,key,value,receiver){
            const r=Reflect.get(target,key,receiver);
            if(isRef(r)){
                r.value=value;
                return true;
            }else{
                return Reflect.set(target,key,value,receiver);
            }
        }
    });
}



export function isRef(r: any): r is RefImpl {
    return r ? r.__v_isRef === true : false;
}