declare async function CREATE_SYRO_BINDINGS() {
  const Module: {
    cwrap(name: string, returnType: string | null, paramTypes: string[]): any;
    addFunction(fn: Function, typeString: string): number;
    removeFunction(pointer: number): void;
    HEAP8: { buffer: ArrayBuffer };
  };
  return Module;
};
