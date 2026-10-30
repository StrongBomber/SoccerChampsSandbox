/**
 * Frida çalışma zamanı taklidi (Node testleri için).
 *
 * modmenu/game-mod.js dosyasını gerçek bir Frida ortamı olmadan yükleyip
 * tarama/yazma/dondurma mantığını sınamaya yarar. Sahte bellek gerçek bir
 * Uint8Array'dir; NativePointer metotları bu belleğe okur/yazar.
 */

export const BASE = 0x10000000;
export const SIZE = 256 * 1024;

export function createRuntime({ libName = "libWorldSoccerChamps.so" } = {}) {
  const mem = new Uint8Array(SIZE);
  const view = new DataView(mem.buffer);

  const calls = { intervals: 0, cleared: 0, detach: 0 };

  class NativePointer {
    constructor(offset) { this.offset = offset; }
    add(n) { return new NativePointer(this.offset + n); }
    sub(n) { return new NativePointer(this.offset - n); }
    toString() { return "0x" + (BASE + this.offset).toString(16); }
    _dv() { return view; }
    readS32() { return view.getInt32(this.offset, true); }
    writeS32(v) { view.setInt32(this.offset, v, true); return this; }
    readU32() { return view.getUint32(this.offset, true); }
    readS64() { return view.getBigInt64(this.offset, true); }
    writeS64(v) { view.setBigInt64(this.offset, BigInt(v), true); return this; }
    readFloat() { return view.getFloat32(this.offset, true); }
    writeFloat(v) { view.setFloat32(this.offset, v, true); return this; }
    readDouble() { return view.getFloat64(this.offset, true); }
    writeDouble(v) { view.setFloat64(this.offset, v, true); return this; }
    readByteArray(n) {
      const end = Math.min(this.offset + n, SIZE);
      return mem.slice(this.offset, end).buffer;
    }
    readUtf8String() { return ""; }
  }

  const module = { name: libName, base: new NativePointer(0), size: SIZE };

  const Process = {
    findModuleByName: (name) => (name === libName ? module : null),
    enumerateRanges: () => [{ base: new NativePointer(0), size: SIZE, protection: "rw-", file: { path: "/data/app/" + libName } }],
  };

  const Module = {
    findExportByName: () => null, // izleyici testte kapalı
    findBaseAddress: () => new NativePointer(0),
  };

  const Interceptor = {
    attach: () => { calls.detach += 0; return { detach: () => { calls.detach++; } }; },
  };

  const Int64 = (n) => BigInt(n);

  const setIntervalMock = () => { calls.intervals++; return calls.intervals; };
  const clearIntervalMock = () => { calls.cleared++; };

  /** Belleğe değer yerleştir (test kurulumu). */
  const plant = {
    int32(offset, value) { view.setInt32(offset, value, true); },
    int64(offset, value) { view.setBigInt64(offset, BigInt(value), true); },
    float(offset, value) { view.setFloat32(offset, value, true); },
    double(offset, value) { view.setFloat64(offset, value, true); },
    readInt32: (offset) => view.getInt32(offset, true),
    readFloat: (offset) => view.getFloat32(offset, true),
    readDouble: (offset) => view.getFloat64(offset, true),
    readInt64: (offset) => Number(view.getBigInt64(offset, true)),
  };

  return { mem, view, Process, Module, Interceptor, Int64, NativePointer, calls, plant, setIntervalMock, clearIntervalMock };
}
