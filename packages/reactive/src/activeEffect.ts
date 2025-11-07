
import { activeEffect, ReactiveEffect, trackEffect, triggerEffects } from "./effect.js";

function creatDepMap(cleanup:()=>void,_name?:string){ 
    let res= new Map<ReactiveEffect,number>();
    (res as any).cleanup = cleanup;
    (res as any)._name = _name;
    return res;
}

const targetMap = new WeakMap<any, Map<string | symbol, Map<ReactiveEffect,number>>>();
export function track(target:any, key:string | symbol) {
    if(activeEffect){
        let depsMap = targetMap.get(target);
        if(!depsMap) {
            targetMap.set(target, (depsMap = new Map<string | symbol, Map<ReactiveEffect,number>>()));
        }

        let dep = depsMap.get(key);
        if(!dep) {
            depsMap.set(key, (dep = creatDepMap(()=>{depsMap.delete(key);},String(key))));
        }
        trackEffect(activeEffect,dep);
    }
}

export function trigger(target:any, key:string | symbol) {
    const depsMap = targetMap.get(target);
    if(!depsMap) return;
    const dep = depsMap.get(key);
    if(!dep) return;
    triggerEffects(dep);
}



