/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kijs } from "kijs";

// eslint-disable-next-line functional/prefer-readonly-type
const dataPriv = new WeakMap<any, Map<string, any>>();

class Callbacks<T = void> extends Promise<T> {
  // eslint-disable-next-line functional/prefer-readonly-type
  resolve?: (value: T | PromiseLike<T>) => void;
  // eslint-disable-next-line functional/prefer-readonly-type
  reject?: (value: T | PromiseLike<T>) => void;
  static get [Symbol.species]() {
    return Promise;
  }
  get [Symbol.toStringTag]() {
    return "Callbacks";
  }

  constructor(
    cb: ((value: void) => void | PromiseLike<void>) | null | undefined
  ) {
    super((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    (this as unknown as Promise<void>).catch(cb);
  }
}

function queue(elem: any, type: string, data?: any): any {
  type = (type || "fx") + "queue";

  if (dataPriv.has(elem) === false) {
    dataPriv.set(elem, new Map());
  }
  // eslint-disable-next-line functional/no-let
  let queue = dataPriv.get(elem)!.get(type);

  // Speed up dequeue by getting out quickly if this is just a lookup
  if (data) {
    if (!queue || Array.isArray(data)) {
      dataPriv.get(elem)!.set(type, (queue = Array.from(data)));
    } else {
      queue.push(data);
    }
  }

  return queue || [];
}

function dequeue(elem: any, type = "fx"): void {
  const queues = queue(elem, type);
  // eslint-disable-next-line functional/no-let
  let startLength = queues.length,
    fn = queues.shift();
  const hooks = _queueHooks(elem, type),
    next = () => {
      dequeue(elem, type);
    };

  // If the fx queue is dequeued, always remove the progress sentinel
  if (fn === "inprogress") {
    fn = queues.shift();
    startLength--;
  }

  if (fn) {
    if (type === "fx") {
      queues.unshift("inprogress");
    }

    // eslint-disable-next-line functional/immutable-data
    delete hooks.stop;
    fn.call(elem, next, hooks);
  }

  if (!startLength && hooks) {
    hooks.empty.resolve();
  }
}
// Not public - generate a queueHooks object, or return the current one
function _queueHooks(elem: any, type: string) {
  const key = type + "queueHooks";

  if (dataPriv.get(elem)!.has(key) === false) {
    dataPriv.get(elem)!.set(key, {
      empty: new Callbacks(() => {
        dataPriv.get(elem)?.delete(type + "queue");
        dataPriv.get(elem)?.delete(key);
      }),
    });
  }

  return dataPriv.get(elem)!.get(key)!;
}

function installer(Ki: typeof Kijs) {
  function queue2(this: Kijs, data: any): Kijs;
  function queue2(this: Kijs, type: string, data: any): Kijs;
  function queue2(this: Kijs, type: any, data?: any): Kijs {
    // eslint-disable-next-line functional/no-let
    let setter = 2;

    if (typeof type !== "string") {
      data = type;
      type = "fx";
      setter--;
    }

    // eslint-disable-next-line functional/functional-parameters
    if (arguments.length < setter) {
      return queue(this[0], type);
    }

    if (data !== void 0) {
      this.each(function () {
        const queues = queue(this, type, data);

        _queueHooks(this, type);

        if (type === "fx" && queues[0] !== "inprogress") {
          dequeue(this, type);
        }
      });
    }

    return this;
  }

  // eslint-disable-next-line functional/immutable-data
  Ki.prototype.queue = queue2;
  // eslint-disable-next-line functional/immutable-data
  Ki.prototype.dequeue = function (type) {
    return this.each(() => {
      dequeue(this, type);
    });
  };
  // eslint-disable-next-line functional/immutable-data
  Ki.prototype.clearQueue = function (type = "fx") {
    return this.queue(type, []);
  };
}

declare module "kijs" {
  class Kijs {
    queue(this: Kijs, data: any): this;
    queue(this: Kijs, type: string, data: any): this;
    dequeue(type: string): this;
    clearQueue(type: string): this;
  }
}

export { installer as default, queue, dequeue, _queueHooks, Callbacks };
