interface Opts {
  baud?: any;
  space?: any;
  mark?: any;
  sampleRate?: any;
  samplesPerFrame?: any;
}

type EncoderFunction = (text: string) => Float32Array[];

const createEncoder = (opts: Opts): EncoderFunction => {
  opts = opts || {};

  if (!opts.baud) throw new Error("must specify opts.baud");
  if (!opts.space) throw new Error("must specify opts.space");
  if (!opts.mark) throw new Error("must specify opts.mark");

  const data: number[] = [];
  let firstWrite = true;

  const getMinSamplesPerFrame = (sampleRate: number, baud: number) => {
    return Math.floor(sampleRate / baud / 5);
  };

  opts.sampleRate = opts.sampleRate || 8000;
  opts.samplesPerFrame =
    opts.samplesPerFrame || getMinSamplesPerFrame(opts.sampleRate, opts.baud);

  const sin = (hz: number, t: number) => Math.sin(Math.PI * 2 * t * hz);

  const sinSamples = (hz: number, samples: number, data: number[]) => {
    for (let i = 0; i < samples; i++) {
      const v = sin(hz, i / opts.sampleRate);
      data.push(v);
    }
  };

  const writeByte = (b: number, data: number[]) => {
    for (let i = 0; i < 8; i++) {
      const bit = b & 0x1;
      b >>= 1;
      sinSamples(
        bit === 0 ? opts.space : opts.mark,
        opts.sampleRate / opts.baud,
        data
      );
    }
  };

  const writePreamble = (data: number[]) => {
    sinSamples(opts.space, opts.sampleRate / opts.baud, data);
    sinSamples(opts.mark, opts.sampleRate / opts.baud, data);
  };

  return (text: string): Float32Array[] => {
    const chunk = Buffer.from(text);
    const encoded: Float32Array[] = [];

    if (firstWrite) {
      writePreamble(data);
      firstWrite = false;
    }

    for (let i = 0; i < chunk.length; i++) {
      writeByte(chunk.readUInt8(i), data);
    }

    const frames = Math.floor(data.length / opts.samplesPerFrame);
    for (let i = 0; i < frames; i++) {
      const idx = i * opts.samplesPerFrame;
      const frame = data.slice(idx, idx + opts.samplesPerFrame);

      encoded.push(new Float32Array(frame));
    }

    return encoded;
  };
};

export default createEncoder;
