import { AsyncStack } from "./AsyncStack";

type AnyFunction = (...args: any) => any;

export const createAsyncResolver = (
  stack: AsyncStack,
  callback: AnyFunction,
  onlyOnce: boolean = true,
) => {
  let called = false;

  return function (...args: any[]) {
    if (onlyOnce && called) return;
    called = true;

    stack.yield();
    const fork = AsyncStack.fork()

    try {

      console.log('args', callback, args)
      const result = callback.call(this, ...args);
      fork.yield()

      return result;
    } catch (err) {
      fork.yield()
      throw err;
    }


    // Note: Is this fork neecessary? All tests are passing without it.

    // console.log('before callback')
    // console.log('after callback', result)
  };
};

export function callWithContext(originalCallback: AnyFunction, args: any[]) {
  const fork = AsyncStack.fork();

  const patchedArgs = args.map((arg) => {
    if (typeof arg === "function") {
      return createAsyncResolver(fork, arg);
    }

    return arg;
  });

  // console.log('before callWithContext')
  const result = originalCallback.call(this, ...patchedArgs);
  // console.log('after callWithContext', result)
  fork.yield();
  return result;
}

// This function ensure that the context is passed to the callback
// That is called by the higher order function
export const withContext = <Callback extends AnyFunction | undefined>(
  originalCallback: Callback,
  onlyOnce: boolean = true,
): Callback => {
  if (typeof originalCallback === "undefined") return undefined;

  return function (...args: any[]) {
    return callWithContext.call(this, originalCallback, args);
  } as any;
};

export const runInStack = (stackToUse: AsyncStack, callback: Function) => {
  const currentStack = AsyncStack.getCurrent();
  stackToUse.start();

  try {
    const result = callback();
    currentStack.start();
    return result;
  } catch (err) {
    currentStack.start();
    console.log('runInStack error', err)
    throw err;
  }
};
