import { hasOwn } from '@VUE3/shared/src/utils.js';
import { ReactiveEffect } from './effect.js';
import { queueJob } from '../../runtime-core/src/schedule.js';
import { reactive } from './reactive.js';

export function creatInstance(vnode: any) {
    const {data=()=>({})} =vnode.type
    
	return {
		data: reactive(data()),
		vnode,
		isMounted: false,
		update: null,
		subTree: null,
		props: null,
		attrs: null,
		proxy: {},
        render:null,
		slots:{},
		exposed:{}
	};
}

const publicProperty: any = {
	$attrs: (instance: any) => instance.attrs,
	$slots:(instance :any)=>instance.slots
};

export function setProxy(instance: any) {
	instance.proxy = new Proxy(instance, {
		get(target, key) {
			const { data, props,setupProps } = target;
			if(setupProps&&hasOwn(setupProps,key)){
				return setupProps[key]
			}
            
			if (hasOwn(publicProperty, key)) {
				return publicProperty[key](target);
			}
			if (data && hasOwn(data, key)) {
				return data[key];
			}
			if (props && hasOwn(props, key)) {
				return props[key];
			}
		},
		set(target, key, newValue) {
			const { data, props } = target;
			if (data && hasOwn(data, key)) {
				data[key] = newValue;
				return true;
			}
			if (props && hasOwn(props, key)) {
				console.warn('props are readOnly');
				return true;
			}
			return true;
		},
	});
}

export function setComponentEffct(instance: any,container:any,anchor:any,patch:any) {
	const componentUpdateFn = () => {

        const {render} = instance
		if (!instance.isMounted) {
			const subTree = render.call(instance.proxy, instance.proxy);
			instance.subTree = subTree;
			patch(null, subTree, container, anchor);
			instance.isMounted = true;
		} else {
			const subTree = render.call(instance.proxy, instance.proxy);
			patch(instance.subTree, subTree, container, anchor);
            instance.subTree=subTree
		}
	};

	const effect = new ReactiveEffect(componentUpdateFn, () => {
		queueJob(update);
	});
	const update = () => {
		effect.run();
	};
	(instance.update as any) = update;
	update();
}
