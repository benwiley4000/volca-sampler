// https://stackoverflow.com/a/51086893
export class Mutex {
  /** @private */
  unlockPromise = Promise.resolve();

  lock() {
    let unlock = () => {};
    // nextUnlockPromise resolves when the unlock function is called
    // by the client who was passed the function.
    const nextUnlockPromise = /** @type {Promise<void>} */ (
      new Promise((resolve) => (unlock = resolve))
    );
    // lockPromise resolves once the previous unlockPromise is resolved,
    // and returns the new unlock function, which the client needs to
    // call when work is finished.
    const lockPromise = this.unlockPromise.then(() => unlock);
    this.unlockPromise = nextUnlockPromise;
    return lockPromise;
  }
}
