export function isObject(value: any): value is Record<any, any> {
    return value !== null && typeof value === 'object'
}

export function isFunction(value: any): value is Function {
    return typeof value === 'function';
}

export function isString(value: any): value is string {
    return typeof value === 'string';
}

let oldHasOwn=Object.prototype.hasOwnProperty
export function hasOwn(target:any,key:any){
    return oldHasOwn.call(target,key)
}