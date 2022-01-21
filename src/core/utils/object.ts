export function isObject(obj: unknown): boolean {
  return typeof obj === "object" &&
    !Array.isArray(obj) &&
    obj !== null;
}

// export function isClass(func: unknown): boolean {
//   // Class constructor is also a function
//   if (
//     !(func && (func as Record<string, unknown>).constructor === Function) ||
//     (func as Record<string, unknown>).prototype === undefined
//   ) {
//     console.log("xxx");

//     return false;
//   }

//   // This is a class that extends other class
//   if (Function.prototype !== Object.getPrototypeOf(func)) {
//     return true;
//   }
//   console.log("xx2x");

//   // Usually a function will only have 'constructor' in the prototype
//   return Object.getOwnPropertyNames((func as Record<string, unknown>).prototype)
//     .length > 1;
// }
export function isClass(v: unknown): boolean {
  return typeof v === "function" && /^\s*class\s+/.test(v.toString());
}
