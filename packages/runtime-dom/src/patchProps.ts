function patchStyle(el: HTMLElement, prevValue: any, nextValue: any) {
	for (let key in nextValue) {
		(el.style as any)[key] = nextValue[key];
	}
	for (let key in prevValue) {
		if (!nextValue[key]) {
			(el.style as any)[key] = null;
		}
	}
}

function patchClass(el: HTMLElement, prevValue: any, nextValue: any) {
	if (prevValue !== nextValue) {
		el.className = nextValue;
	}
}

function createInvoker(fn: any) {
	const invoker = (e: any) => {
		invoker.value(e);
	};
	invoker.value = fn;
	return invoker;
}

function patchEvent(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
	let invokers = (el as any)._ve_invoke || ((el as any)._ve_invoke = {});
	let eventName = key.slice(2).toLowerCase();
	if (nextValue) {
		if (!invokers[eventName]) {
			invokers[eventName] = createInvoker(nextValue);
		} else {
			invokers[eventName].value = nextValue;
		}
		el.addEventListener(eventName, invokers[eventName]);
	} else {
		el.removeEventListener(eventName, invokers[eventName]);
		invokers[eventName] = null;
	}
}

export function patchProp(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
	if (key === 'style') {
		patchStyle(el, prevValue, nextValue);
	} else if (key === 'class') {
		patchClass(el, prevValue, nextValue);
	} else if (/^on/.test(key)) {
		patchEvent(el, key, prevValue, nextValue);
	} else {
		if (nextValue === null || nextValue === undefined) {
			el.removeAttribute(key);
		} else {
			el.setAttribute(key, nextValue);
		}
	}
}
