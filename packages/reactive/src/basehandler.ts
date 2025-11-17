
import { isObject } from "@VUE3/shared";
import { track, trigger } from "./activeEffect.js";
import { reactive } from "./reactive.js";

export const mutableHandlers:ProxyHandler<any>={
    get(target,key,receiver){
        if(key==="__v_isReactive"){
            return true;
        }   
        track(target,key);
        
        let res=Reflect.get(target,key,receiver);
        if(isObject(res)){
            return reactive(res);
        }
        return res;
    },
    set(target,key,value,receiver){
        let oldValue=target[key];
        const result = Reflect.set(target,key,value,receiver);
        if(oldValue!==value){
            trigger(target,key);
        }
        return result;
    }
}