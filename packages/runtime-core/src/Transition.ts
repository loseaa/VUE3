import { h } from './h.js';

export function Transition(props: any, { slots }: any) {
	return h(TransitionImpl, resolveProps(props), slots);
}

function nextFrame(callback: any) {
	requestAnimationFrame(callback);
}

function resolveProps(props: any) {
	const {
		name,
		enterFromClass = `${name}-enter-from`,
		enterActiveClass = `${name}-enter-active`,
		leaveToClass = `${name}-leave-to`,
		leaveFromClass = `${name}-leave-from`,
		leaveActiveClass = `${name}-leave-active`,
		enterToClass = `${name}-enter-to`,
		onBeforeEnter = () => {},
		onEnter = () => {},
		onBeforeLeave = () => {},
		onLeave = () => {},
	} = props;
	return {
		onBeforeEnter(el: any) {
			onBeforeEnter && onBeforeEnter(el);
			el.classList.add(enterFromClass);
			el.classList.add(enterActiveClass);
		},
		onEnter(el: any,done:any) {
			const resolve = () => {
				el.classList.remove(enterFromClass);
				el.classList.remove(enterToClass);
				done&&done();
			};
			onEnter && onEnter(el,resolve);
			el.classList.remove(enterFromClass);

			nextFrame(() => {
				el.classList.remove(enterActiveClass);
				el.classList.add(enterToClass);
				if(!onEnter||onEnter.length<=1) {
					el.addEventListener('transitionend',resolve);
				}
			});
		},
		onBeforeLeave(el: any,done:any) {
			
			const resolve=()=>{
				el.classList.remove(leaveFromClass);
                el.classList.remove(leaveToClass);
				done();
			}
			el.classList.add(leaveFromClass);
			document.body.offsetHeight;
			el.classList.add(leaveActiveClass);
			onBeforeLeave && onBeforeLeave(el,resolve);
			
			nextFrame(() => {
				el.classList.remove(leaveFromClass);
				
				el.classList.add(leaveToClass);
			});
			if(!onBeforeLeave||onBeforeLeave.length<=1) {
				el.addEventListener('transitionend',resolve);
			}
		},

	};
}

const TransitionImpl = {
	name: 'Transition',
	props: {
		onBeforeEnter:Function,
		onEnter:Function,
		onBeforeLeave:Function,
		onLeave:Function,
	},
	setup(props: any, { slots }: any) {
		return () => {
			let vnode=slots.default();
			if(!vnode) {
				return 
			}
			vnode.transition={
				beforeEnter:props.onBeforeEnter,
				enter:props.onEnter,
				beforeLeave:props.onBeforeLeave,
				leave:props.onLeave,
			}
			return vnode
		};
	},
};
