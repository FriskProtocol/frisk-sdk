import { Transform } from "stream";
import { floatTo16Bit } from "../utils/utils";

interface Opts {
  baud?: any;
  space?: any;
  mark?: any;
  sampleRate?: any;
  samplesPerFrame?: any;
}

export class Encoder extends Transform {
  symbolDuration: number;
  frameDuration: number;
  state: string;
  clock: number;
  totalTime: number;
  sin: (hz: number, t: number) => number;
  sinSamples: (hz: number, samples: number, data: number[]) => void;
  writeByte: (b: number, data: number[]) => void;
  writePreamble: (data: number[]) => void;
  data: number[];
  frame: Float32Array;
  firstWrite: boolean;
  opts: Opts;

  constructor(opts: Opts) {
    super({ objectMode: true });

    if (!(this instanceof Encoder)) {
      return new Encoder(opts);
    }

    opts = opts || {};

    if (!opts.baud) {
      throw new Error("must specify opts.baud");
    }
    if (!opts.space) {
      throw new Error("must specify opts.space");
    }
    if (!opts.mark) {
      throw new Error("must specify opts.mark");
    }
    opts.sampleRate = opts.sampleRate || 8000;
    opts.samplesPerFrame =
      opts.samplesPerFrame ||
      this.getMinSamplesPerFrame(opts.sampleRate, opts.baud);

    this.symbolDuration = 1 / opts.baud;
    this.frameDuration = opts.samplesPerFrame / opts.sampleRate;
    this.state = "preamble:space";
    this.clock = 0;
    this.totalTime = 0;
    this.opts = opts;

    this.sin = (hz, t) => Math.sin(Math.PI * 2 * t * hz);

    this.sinSamples = (hz, samples, data) => {
      for (let i = 0; i < samples; i++) {
        const v = this.sin(hz, i / opts.sampleRate);
        data.push(v);
      }
    };

    this.writeByte = (b, data) => {
      for (let i = 0; i < 8; i++) {
        const bit = b & 0x1;
        b >>= 1;
        this.sinSamples(
          bit === 0 ? opts.space : opts.mark,
          opts.sampleRate / opts.baud,
          data
        );
      }
    };

    this.writePreamble = (data) => {
      this.sinSamples(
        this.opts.space,
        this.opts.sampleRate / this.opts.baud,
        data
      );
      this.sinSamples(
        this.opts.mark,
        this.opts.sampleRate / this.opts.baud,
        data
      );
    };

    this.data = [];
    this.frame = new Float32Array(opts.samplesPerFrame);
    this.firstWrite = true;
  }

  getMinSamplesPerFrame(sampleRate: number, baud: number) {
    return Math.floor(sampleRate / baud / 5);
  }

  _transform(chunk: any, enc: any, next: () => void) {
    if (typeof chunk === "string") {
      chunk = Buffer.from(chunk);
    }

    if (this.firstWrite) {
      this.writePreamble(this.data);
      this.firstWrite = false;
    }

    for (let i = 0; i < chunk.length; i++) {
      this.writeByte(chunk.readUInt8(i), this.data);
    }

    const frames = Math.floor(this.data.length / this.opts.samplesPerFrame);
    for (let i = 0; i < frames; i++) {
      const idx = i * this.opts.samplesPerFrame;
      const frame = this.data.slice(idx, idx + this.opts.samplesPerFrame);

      this.push(floatTo16Bit(new Float32Array(frame), 0));
    }

    next();
  }

  _flush(done: () => void) {
    this.push(this.data);
    done();
  }
}
