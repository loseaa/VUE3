import {isObject} from '@VUE3/shared';

export function reactive(target:any){
    return creatReactiveObject(target);
}

const reactiveMap = new WeakMap();

const mutableHandlers:ProxyHandler<any>={
    get(target,prop,key){
        if(prop==="__v_isReactive"){
            return true;
        }
        return Reflect.get(target,prop,key);
    },
    set(target,prop,value,receiver){
        const result = Reflect.set(target,prop,value,receiver);
        return result;
    }
}

function creatReactiveObject(target:any){
    if(!isObject(target)){
        console.warn(`reactive ${target} 必须是一个对象`);
        return target;
    }
    if(reactiveMap.has(target)){
        return reactiveMap.get(target);
    }
    if((target as any).__v_isReactive){
        return target;
    }

    const proxy = new Proxy(target,mutableHandlers);
    reactiveMap.set(target,proxy);
    return proxy;
}