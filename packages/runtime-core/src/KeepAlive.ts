import { currentInstance } from '../../reactive/src/components.js';
import { onMounted, onUpdated } from './lifeCycle.js';
import { ShapeFlags } from './shapeFlags.js';

export const keepAlive = {
	__v_iskeepAlive: true,
    props:{
        max:Number
    },
	setup(props: any, { slots }: { slots: any }) {

        const max = props.max || Infinity;
		const cache = new Map();
		const keys = new Set();
		let pendingCacheKey: any = null;
		function cacheVnode(instance: any) {
			cache.set(pendingCacheKey, instance.subTree);
		}
		onMounted((currentInstance: any) => {
			cacheVnode(currentInstance);
		});
		onUpdated((currentInstance: any) => {
			cacheVnode(currentInstance);
		});
		const { move,unmount } = currentInstance.ctx.renderer;
		const cacheContainer = document.createElement('div');
		currentInstance.ctx.deactive = (vnode: any) => {
			move(vnode, cacheContainer, null);
		};
		currentInstance.ctx.active = (vnode: any, container: any, anchor: any) => {
			move(vnode, container, anchor);
		};

        function reset(vnode:any){
                vnode.shapeFlag &= ~ShapeFlags.KETP_ALIVE;
                vnode.shapeFlag &= ~ShapeFlags.SHOULD_KEEP_ALIVE;
        }
        function pruneCache(key:any){
                let vnode=cache.get(key);
                reset(vnode);
                cache.delete(key);
                keys.delete(key);
                unmount(vnode);
        }

		return function(e:any){

			let vnode = slots.default();
			// 如果虚拟节点上有key
			const key = vnode.key == null ? vnode.type : vnode.key;
			// 如果缓存中存在该组件实例
			let cacheNode = cache.get(key);
			if (cacheNode) {
				// 如果缓存中存在该组件实例，将其移动到最新位置
				vnode.component = cacheNode.component;
				// 如果能在缓存中找到，说明该组件实例是之前渲染过的，需要将其标记为 已经kept alive
				vnode.shapeFlag |= ShapeFlags.KETP_ALIVE;
                // 更新一下keys的顺序，最新的移到最后面
                keys.delete(key);
                keys.add(key);
			} else {
				// 如果缓存中不存在该组件实例，将其添加到缓存中
				pendingCacheKey = key;
				keys.add(key);
                if(keys.size > e.max){
                    // 如果缓存超过了最大数量，删除最早的组件实例
                    pruneCache(keys.values().next().value);
                }
			} // 将其添加到缓存中，标记为  应该keep alive
			vnode.shapeFlag |= ShapeFlags.SHOULD_KEEP_ALIVE;
            pendingCacheKey = key;
			return vnode;
		};
	},
};

export function isKeepAlive(component: any) {
	return component.__v_iskeepAlive;
}
