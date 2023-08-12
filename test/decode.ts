import concat from "concat-stream";
import test from "tape";
import { Decoder, Encoder } from "../src/nodeRelayer/index.js";

test("basic", function (t) {
  var opts = {
    sampleRate: 8000,
    samplesPerFrame: 100,
    space: 324,
    mark: 884,
    baud: 1,
  };

  var encoder = new Encoder(opts);
  var decoder = new Decoder(opts);

  encoder.pipe(decoder);

  encoder.end("woah, pretty neat!");

  decoder.pipe(
    concat(function (data) {
      t.equal(data.toString(), "woah, pretty neat!");
      t.end();
    })
  );
});

test("high baud", function (t) {
  var opts = {
    space: 324,
    mark: 884,
    baud: 100,
    sampleRate: 8000,
  };

  var e = new Encoder(opts);
  var d = new Decoder(opts);

  e.pipe(d).pipe(
    concat(function (data) {
      t.equal(data.toString(), "woah, pretty neat!");
      t.end();
    })
  );
  e.end("woah, pretty neat!");
});
