import goertzel from "goertzel";

interface Opts {
  baud?: any;
  space?: any;
  mark?: any;
  sampleRate?: any;
  samplesPerFrame?: any;
}

type DecoderFunction = (text: Float32Array[]) => Buffer;

const createDecoder = (opts: Opts): DecoderFunction => {
  if (!opts.baud) throw new Error("must specify opts.baud");
  if (!opts.space) throw new Error("must specify opts.space");
  if (!opts.mark) throw new Error("must specify opts.mark");

  opts.sampleRate = opts.sampleRate || 8000;
  opts.samplesPerFrame =
    opts.samplesPerFrame || getMinSamplesPerFrame(opts.sampleRate, opts.baud);

  function getMinSamplesPerFrame(sampleRate: number, baud: number) {
    return Math.floor(sampleRate / baud / 5);
  }

  const hasSpace = goertzel({
    targetFrequency: opts.space,
    sampleRate: opts.sampleRate,
    samplesPerFrame: opts.samplesPerFrame,
    threshold: 0.5,
  });

  const hasMark = goertzel({
    targetFrequency: opts.mark,
    sampleRate: opts.sampleRate,
    samplesPerFrame: opts.samplesPerFrame,
    threshold: 0.5,
  });

  const symbolDuration = 1 / opts.baud;
  let frameDuration = opts.samplesPerFrame / opts.sampleRate;
  let state = "preamble:space";
  let clock = 0;
  let totalTime = 0;
  let marksSeen = 0;
  let spacesSeen = 0;

  let bytePos = 0;
  let byteAccum = 0;

  const decideOnSymbol = (chunk: number[]) => {
    // console.error('saw ', spacesSeen, 'spaces and', marksSeen, 'marks')
    let bit;
    let error;

    if (marksSeen > spacesSeen) {
      error = spacesSeen;
      bit = 1;
    } else {
      error = marksSeen;
      bit = 0;
    }
    spacesSeen = marksSeen = 0;

    // apply bit to the high end of the byte accumulator
    byteAccum >>= 1;
    byteAccum |= bit << 7;
    bytePos++;

    // emit byte if finished
    if (bytePos === 8) {

      chunk.push(byteAccum);

      byteAccum = 0;
      bytePos = 0;
    } else if (bytePos > 8) {
      throw new Error("somehow accumulated more than 8 bits!");
    }

    // push clock ahead a frame, since we've already trodden into the next
    // symbol
    clock = frameDuration * error;
  };

  return (frames: Float32Array[]): any => {
    let chunk: number[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      let s = hasSpace(frame);
      let m = hasMark(frame);

      let bit;
      if (s && !m) bit = 0;
      else if (!s && m) bit = 1;

      if (state === "preamble:space") {
        if (bit === 1) {
          clock = 0;
          state = "preamble:mark";
        }
      } else if (state === "preamble:mark") {
        if (clock >= symbolDuration) {
          clock = 0;
          state = "decode";
        }
      } else if (state === "decode") {
        if (bit === 0) spacesSeen++;
        else marksSeen++;

        if (clock >= symbolDuration) {
          decideOnSymbol(chunk);
        }
      }
      clock += frameDuration;
      totalTime += frameDuration;
    }
    return new Uint8Array(chunk);
  };
};

export default createDecoder;
