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
  
    const sinSamples = (hz: number, samples: number, dataArray: number[]) => {
      for (let i = 0; i < samples; i++) {
        const v = sin(hz, i / opts.sampleRate);
        dataArray.push(v);
      }
    };
  
    const writeByte = (b: number, dataArray: number[]) => {
      for (let i = 0; i < 8; i++) {
        const bit = b & 0x1;
        b >>= 1;
        sinSamples(
          bit === 0 ? opts.space : opts.mark,
          opts.sampleRate / opts.baud,
          dataArray
        );
      }
    };
  
    const writePreamble = (dataArray: number[]) => {
      sinSamples(opts.space, opts.sampleRate / opts.baud, dataArray);
      sinSamples(opts.mark, opts.sampleRate / opts.baud, dataArray);
    };
  
    return (text: string): Float32Array[] => {
      const encoderData: number[] = [];
  
      if (firstWrite) {
        writePreamble(encoderData);
        firstWrite = false;
      }
  
      const textEncoder = new TextEncoder();
      const chunk = textEncoder.encode(text);
  
      for (let i = 0; i < chunk.length; i++) {
        writeByte(chunk[i], encoderData);
      }
  
      const frames = Math.floor(encoderData.length / opts.samplesPerFrame);
      const encoded: Float32Array[] = [];
  
      for (let i = 0; i < frames; i++) {
        const idx = i * opts.samplesPerFrame;
        const frame = encoderData.slice(idx, idx + opts.samplesPerFrame);
  
        encoded.push(new Float32Array(frame));
      }
  
      return encoded;
    };
  };
  
  export default createEncoder;
  