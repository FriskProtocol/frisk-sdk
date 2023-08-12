TAP version 13
# Math test
ok 1 should be strictly equal
not ok 2 should be truthy
  ---
    operator: ok
    expected: true
    actual:   false
    stack: |-
      Error: should be truthy
          at Test.assert [as _assert] (/Users/kelvx/Dev/Frisk/frisk-sdk/node_modules/tape/lib/test.js:309:48)
          at Test.assert (/Users/kelvx/Dev/Frisk/frisk-sdk/node_modules/tape/lib/test.js:428:7)
          at Test.<anonymous> (file:///Users/kelvx/Dev/Frisk/frisk-sdk/test/decode.ts:6:11)
          at Test.run (/Users/kelvx/Dev/Frisk/frisk-sdk/node_modules/tape/lib/test.js:112:28)
          at Immediate.next [as _onImmediate] (/Users/kelvx/Dev/Frisk/frisk-sdk/node_modules/tape/lib/results.js:157:7)
          at processImmediate (node:internal/timers:466:21)
  ...

1..2
# tests 2
# pass  1
# fail  1

