import { Kijs } from "kijs";

const dataPriv = new WeakMap<any, Map<string, any[]>>();

class Callbacks extends Promise {
  static get [Symbol.species]() {
    return Promise;
  }
  get [Symbol.toStringTag]() {
    return "Callbacks";
  }

  constructor(cb: Function) {
    super((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.then(cb);
  }
}

function queue(elem: any, type: string, data: any): any[] | void {
  if (elem) {
    type = (type || "fx") + "queue";

    if (dataPriv.has(elem) === false) {
      dataPriv.set(elem, new Map());
    }
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
}

function dequeue(elem: any, type = "fx"): void {
  var queue = queue(elem, type),
    startLength = queue.length,
    fn = queue.shift(),
    hooks = _queueHooks(elem, type),
    next = () => {
      dequeue(elem, type);
    };

  // If the fx queue is dequeued, always remove the progress sentinel
  if (fn === "inprogress") {
    fn = queue.shift();
    startLength--;
  }

  if (fn) {
    if (type === "fx") {
      queue.unshift("inprogress");
    }

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
        dataPriv.remove(elem, [type + "queue", key]);
      }),
    });
  }

  return dataPriv.get(elem)!.get(key)!;
}

function installer(Kijs) {
  function queue(this: Kijs, data: any[] | Function): this;
  function queue(this: Kijs, type: string, data: any[] | Function): this;
  function queue(this: Kijs, type: any, data?: any): this {
    let setter = 2;

    if (typeof type !== "string") {
      data = type;
      type = "fx";
      setter--;
    }

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

  Kijs.prototype.queue = queue;

  Kijs.prototype.extend({
    dequeue(type: string) {
      return this.each(() => {
        dequeue(this, type);
      });
    },
    clearQueue(type = "fx") {
      return this.queue(type, []);
    },
  });
}

declare module "kijs" {
  class Kijs {
    queue(this: Kijs, data: any[] | Function): this;
    queue(this: Kijs, type: string, data: any[] | Function): this;
    dequeue(type: string): this;
    clearQueue(type: string): this;
  }
}

export { installer as default, queue, dequeue, _queueHooks, Callbacks };
