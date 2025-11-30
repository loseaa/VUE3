import { ref } from "../../reactive/index.js";
import { h } from "./h.js";

export function defineAsyncComponent(option: any) {
    const {loader,errorComponent,loadingComponent,delay=800,timeout=3000,onError} = option;
    return {
        setup(){
            let state = ref({
                loading: false,
                error: null,
                component: null,
                loaded: false,
            })

            setTimeout(() => {
                state.value.loading = true;
                loadingComponent&&(state.value.component=loadingComponent());
            }, delay);

            setTimeout(() => {
                state.value.loading = false;
                state.value.error = "TIMEOUT";
                errorComponent&&(state.value.error=errorComponent());
            }, timeout);
            let attempts=0;
            function loadFn(){
                return loader().catch((err: any) => {
                    if(onError){
                        return new Promise((resolve, reject) => {
                            let retry=()=>{
                                resolve(loadFn());
                            }
                            let fail=()=>{
                                reject(err);
                            }
                            onError(err, retry, fail, ++attempts);
                        });

                    }else{
                        throw err;
                    }
                })
            }

            loadFn().then((component: any) => {
                state.value.loading = false;
                state.value.loaded = true;
                state.value.component = component;
            }).catch((err: any) => {
                state.value.loading = false;
                state.value.error = err;
                // errorComponent&&(state.value.error=errorComponent());
            })
            return ()=>{
                if(state.value.loaded) {
                    return state.value.component;
                } else if(state.value.error) {
                    return errorComponent&&errorComponent();
                } else if(state.value.loading) {
                    return loadingComponent&&loadingComponent();
                }else{
                    return h("div")
                }
            }
        }
    }
}
