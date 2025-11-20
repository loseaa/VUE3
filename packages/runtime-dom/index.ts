import { nodeOps } from "./src/nodeOps.js";
import { patchProp } from "./src/patchProps.js";
import { createRenderer } from "@vue3/runtime-core";
// export { h ,Fragment,Teleport} from "@vue3/runtime-core";
export * from "@vue3/reactive"
export * from "@vue3/runtime-core"



export let renderOption=Object.assign(nodeOps,{patchProp})

export const render=(vnode:any,container:Element)=>{
    createRenderer(renderOption).render(vnode,container)
}

console.log(render)
