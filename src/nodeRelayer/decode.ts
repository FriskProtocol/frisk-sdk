import goertzel from "goertzel";
import { Transform } from "stream";
import { int16ToFloat32 } from "../utils/utils";

export class Decoder extends Transform {
  hasSpace: (x: Float32Array) => boolean;
  hasMark: (x: Float32Array) => boolean;
  symbolDuration: number;
  frameDuration: number;
  state: string;
  clock: number;
  totalTime: number;
  marksSeen: number;
  spacesSeen: number;
  bytePos: number;
  byteAccum: number;

  constructor(opts: {
    baud?: number;
    space?: number;
    mark?: number;
    sampleRate?: number;
    samplesPerFrame?: number;
  }) {
    super({ objectMode: true });

    if (!(this instanceof Decoder)) {
      return new Decoder(opts);
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

    this.hasSpace = goertzel({
      targetFrequency: opts.space,
      sampleRate: opts.sampleRate,
      samplesPerFrame: opts.samplesPerFrame,
      threshold: 0.5,
    });

    this.hasMark = goertzel({
      targetFrequency: opts.mark,
      sampleRate: opts.sampleRate,
      samplesPerFrame: opts.samplesPerFrame,
      threshold: 0.5,
    });

    this.symbolDuration = 1 / opts.baud;
    this.frameDuration = opts.samplesPerFrame / opts.sampleRate;
    this.state = "preamble:space";
    this.clock = 0;
    this.totalTime = 0;
    this.marksSeen = 0;
    this.spacesSeen = 0;
    this.bytePos = 0;
    this.byteAccum = 0;

    // Bind class methods to this instance
    this.handleFrame = this.handleFrame.bind(this);
    this.decideOnSymbol = this.decideOnSymbol.bind(this);
  }

  getMinSamplesPerFrame(sampleRate: number, baud: number) {
    return Math.floor(sampleRate / baud / 5);
  }

  _transform(chunk: Int16Array, enc: any, cb: (arg0: null) => void) {
    const data = int16ToFloat32(chunk, 0, chunk.length);
    this.handleFrame(data);
    cb(null);
  }

  _flush(done: () => void) {
    this.decideOnSymbol();
    done();
  }

  handleFrame(frame: Float32Array) {
    const s = this.hasSpace(frame);
    const m = this.hasMark(frame);

    let bit;
    if (s && !m) bit = 0;
    else if (!s && m) bit = 1;

    if (this.state === "preamble:space") {
      if (bit === 1) {
        this.clock = 0;
        this.state = "preamble:mark";
      }
    } else if (this.state === "preamble:mark") {
      if (bit !== 1) {
        throw new Error("got non-mark while in preamble:mark");
      }
      if (this.clock >= this.symbolDuration) {
        this.clock = 0;
        this.state = "decode";
      }
    } else if (this.state === "decode") {
      if (bit === 0) this.spacesSeen++;
      else this.marksSeen++;

      if (this.clock >= this.symbolDuration) {
        this.decideOnSymbol();
      }
    }

    this.clock += this.frameDuration;
    this.totalTime += this.frameDuration;
  }

  decideOnSymbol() {
    // console.error( "saw ", this.spacesSeen, "spaces and", this.marksSeen, "marks" );

    let bit;
    let error;

    if (this.marksSeen > this.spacesSeen) {
      error = this.spacesSeen;
      bit = 1;
    } else {
      error = this.marksSeen;
      bit = 0;
    }
    this.spacesSeen = this.marksSeen = 0;

    // apply bit to the high end of the byte accumulator
    this.byteAccum >>= 1;
    this.byteAccum |= bit << 7;
    this.bytePos++;

    // emit byte if finished
    if (this.bytePos === 8) {
      const buf = Buffer.alloc(1);
      buf[0] = this.byteAccum;

      this.push(buf);

      this.byteAccum = 0;
      this.bytePos = 0;
    } else if (this.bytePos > 8) {
      throw new Error("somehow accumulated more than 8 bits!");
    }

    // push clock ahead a frame, since we've already trodden into the next symbol
    this.clock = this.frameDuration * error;
  }
}
