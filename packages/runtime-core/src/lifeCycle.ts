import { currentInstance } from "../../reactive/src/components.js";

export enum LIFECYCLE{
    MOUNTED="m",
    UPDATED="u",
    BEFOREMOUNTED="bm",
    BEFOREUPDTATED="bu"
}
function createHook(type:LIFECYCLE){
    return function(fn:any,target:any=currentInstance){
        if(target){
            (target.hooks[type] || (target.hooks[type] = [])).push((t:any=target)=>{
                fn(t)
            });
        } 
        
    }
}


export const onMounted = createHook(LIFECYCLE.MOUNTED)

export const onBeforeMount = createHook(LIFECYCLE.BEFOREMOUNTED)

export const onUpdated = createHook(LIFECYCLE.UPDATED)

export const onBeforeUpdated = createHook(LIFECYCLE.BEFOREUPDTATED)
