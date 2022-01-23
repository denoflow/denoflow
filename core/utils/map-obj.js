const isObject = (value) => typeof value === "object" && value !== null;

// Customized for this use-case
const isObjectCustom = (value) =>
  isObject(value) &&
  !(value instanceof RegExp) &&
  !(value instanceof Error) &&
  !(value instanceof Date);

export const mapObjectSkip = Symbol("mapObjectSkip");

const _mapObject = async (object, mapper, options, isSeen = new WeakMap()) => {
  options = {
    deep: false,
    target: {},
    ...options,
  };

  if (isSeen.has(object)) {
    return isSeen.get(object);
  }

  isSeen.set(object, options.target);

  const { target } = options;
  delete options.target;

  const mapArray =async function (array) {
    const finalArray = [];
    for (let i = 0; i < array.length; i++) {
      const element = array[i];
      const result = isObjectCustom(element)
      ?await _mapObject(element, mapper, options, isSeen)
      : element;
      finalArray.push(result);
    }
    return finalArray;
  }
   
  if (Array.isArray(object)) {
    return await mapArray(object);
  }

  for (const [key, value] of Object.entries(object)) {
    const mapResult =await mapper(key, value, object);

    if (mapResult === mapObjectSkip) {
      continue;
    }

    let [newKey, newValue, { shouldRecurse = true } = {}] = mapResult;

    // Drop `__proto__` keys.
    if (newKey === "__proto__") {
      continue;
    }

    if (options.deep && shouldRecurse && isObjectCustom(newValue)) {
      newValue = Array.isArray(newValue)
        ? await mapArray(newValue)
        : await _mapObject(newValue, mapper, options, isSeen);
    }

    target[newKey] = newValue;
  }

  return target;
};

export default  function mapObject(object, mapper, options) {
  if (!isObject(object)) {
    throw new TypeError(
      `Expected an object, got \`${object}\` (${typeof object})`,
    );
  }

  return _mapObject(object, mapper, options);
}
