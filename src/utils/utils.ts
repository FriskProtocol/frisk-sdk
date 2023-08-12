export function createWallet() {
  // ...
}

export function createQR(data: any) {
  // ...
}

export function scanQR() {
  // ...
}

export function floatTo16Bit(inputArray: Float32Array, startIndex: number) {
  var output = new Int16Array(inputArray.length - startIndex);
  for (var i = 0; i < inputArray.length; i++) {
    var s = Math.max(-1, Math.min(1, inputArray[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

// This is passed in an unsigned 16-bit integer array. It is converted to a 32-bit float array.
// The first startIndex items are skipped, and only 'length' number of items is converted.
export function int16ToFloat32(
  inputArray: Int16Array,
  startIndex: number,
  length: number
) {
  var output = new Float32Array(inputArray.length - startIndex);
  for (var i = startIndex; i < length; i++) {
    var int = inputArray[i];
    // If the high bit is on, then it is a negative number, and actually counts backwards.
    var float = int >= 0x8000 ? -(0x10000 - int) / 0x8000 : int / 0x7fff;
    output[i] = float;
  }
  return output;
}

export function floatTo16BitPCM(
  output: Buffer,
  offset: number,
  input: Float32Array
) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    const pcmValue = s < 0 ? s * 0x8000 : s * 0x7fff;
    output.writeInt16LE(pcmValue, offset);
  }
}
