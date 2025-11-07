export function effect(fn: Function, options: any = {}) {
	let _effect = new ReactiveEffect(
		fn,
		options.scheduler ||
			(() => {
				_effect.run();
			})
	);
	_effect.run();
	let runner = _effect.run.bind(_effect);
	(runner as any).effect = _effect;
	return runner;
}
export let activeEffect: ReactiveEffect | undefined;

function preEffectClean(effect: ReactiveEffect) {
	effect.trackId++;
	effect.depsLength = 0;
}

function postCleanEffect(effect: ReactiveEffect) {
	const len = effect.deps.length;
	if (effect.depsLength < len) {
		for (let i = effect.depsLength; i < len; i++) {
			cleanEffectDeps(effect, effect.deps[i]);
		}
		effect.deps.length = effect.depsLength;
	}
}

export class ReactiveEffect {
	active = true;
	trackId = 0;
	deps = new Array();
	_isRunning = false;
	depsLength = 0;
	constructor(
		public fn: Function,
		public scheduler: any
	) {}

	run() {
		// 如果不是active状态，直接执行函数 不执行收集
		if (!this.active) {
			return this.fn();
		}
		let lastEffect = activeEffect;
		activeEffect = this;
		preEffectClean(this);
		this._isRunning = true;
		const result = this.fn();
		this._isRunning = false;
		postCleanEffect(this);
		activeEffect = lastEffect;
		return result;
	}
}

function cleanEffectDeps(effect: ReactiveEffect, dep: Map<ReactiveEffect, number>) {
	dep.delete(effect);
	if (dep.size === 0) {
		(dep as any).cleanup();
	}
}

export function trackEffect(activeEffect: ReactiveEffect, dep: Map<ReactiveEffect, number>) {
	//trackID 用于标记该effect是否已经被收集过了 保证一轮执行过程中只会
	// 收集一次相同的依赖
	if (dep.get(activeEffect) === activeEffect.trackId) {
		return;
	}
	
	activeEffect.deps[activeEffect.depsLength++] = dep;
	if (activeEffect.deps[activeEffect.depsLength] === dep) {
		// 本次依赖与上次依赖相同 直接复用
		activeEffect.depsLength++;
	} else {
		// 不相同则需要清理上次依赖
		let oldDep = activeEffect.deps[activeEffect.depsLength];
		if (oldDep) {
			cleanEffectDeps(activeEffect, oldDep);
		}
		
		
	}
	dep.set(activeEffect, activeEffect.trackId);
}

export function triggerEffects(dep: Map<ReactiveEffect, number>) {
	dep.forEach((_, effect) => {
		if (effect._isRunning) {
			return;
		}
		if (effect.scheduler) {
			effect.scheduler();
		}
	});
}
