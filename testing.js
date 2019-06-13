const $merge=require('deepmerge')

function isMergeableObject(o){

    if (Array.isArray(o))return true;

    const isObject=(val)=> {
        return val != null && typeof val === 'object' && Array.isArray(val) === false;
    };

    const isObjectObject=(o)=> {
        return isObject(o) === true
            && Object.prototype.toString.call(o) === '[object Object]';
    };


    let ctor,prot;

    if (isObjectObject(o) === false) return false;

    // If has modified constructor
    ctor = o.constructor;
    if (typeof ctor !== 'function') return false;

    // If has modified prototype
    prot = ctor.prototype;
    if (isObjectObject(prot) === false) return false;

    // If constructor does not have an Object-specific method
    if (prot.hasOwnProperty('isPrototypeOf') === false) {
        return false;
    }

    // Most likely a plain Object
    return true;
}

const emptyTarget = value => Array.isArray(value) ? [] : {};
const clone = (value, options) => $merge(emptyTarget(value), value, options);
function combineMerge(target, source, options) {
    const destination = target.slice();

    source.forEach(function(e, i) {
        if (typeof destination[i] === 'undefined') {
            const cloneRequested = options.clone !== false
            const shouldClone = cloneRequested && options.isMergeableObject(e)
            destination[i] = shouldClone ? clone(e, options) : e
        } else if (options.isMergeableObject(e)) {
            destination[i] = $merge(target[i], e, options)
        } else if (target.indexOf(e) === -1) {
            destination.push(e)
        }
    });
    return destination
}



console.log($merge({a:["1"]},{a:["2"]},{isMergeableObject:isMergeableObject,arrayMerge: combineMerge }))