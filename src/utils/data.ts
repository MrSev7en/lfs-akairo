export function objectify(path: string, value: any): any {
  const keys = path.split('.');
  const result: any = {};
  let current = result;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
    } else {
      current[key] = {};
      current = current[key];
    }
  });

  return result;
}

export function merge(target: any, source: any): any {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], merge(target[key], source[key]));
    }
  }

  return Object.assign(target || {}, source);
}

export function retrieve(path: string, obj: any): any {
  return path
    .split('.')
    .reduce(
      (o, key) => (o && o[key] !== 'undefined' ? o[key] : undefined),
      obj,
    );
}

export function remove(obj: any, keys: string[]): any {
  if (keys.length === 0) {
    return obj;
  }

  const [first, ...rest] = keys;

  if (rest.length === 0) {
    delete obj[first];
  } else if (obj[first] !== undefined) {
    obj[first] = remove(obj[first], rest);

    if (Object.keys(obj[first]).length === 0) {
      delete obj[first];
    }
  }

  return obj;
}
