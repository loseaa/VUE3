import { currentInstance } from "../../reactive/src/components.js";

export function inject(key: string, defaultValue?: any) {
    if(!currentInstance){
        return ;
    }
    if(currentInstance.parentComponent&&key in currentInstance.provide){
        return currentInstance.provide[key];
    }else{
        return defaultValue;
    }
}


export function provide(key: string, value: any) {
  // 实现 provide 功能
  
  if (!currentInstance) {
    return;
  }
  let provide = currentInstance.provide;
  let parentProvide = currentInstance.parentComponent?.provide;
  if(provide===parentProvide){
    provide=Object.create(parentProvide);
  }
  provide[key] = value;
}