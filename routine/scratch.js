import { parseDuration } from './src/utils.js';

const tests = {
  '40': 40,
  '1.40': 100,
  '.4': 40,
  '4': 4,
  '1,6': 120,
  '60': 60,
  '2.5': 170,
  '2,3': 150,
  '2.8': 180,
  '': 0,
  '1:20': 80
};

for (const [input, expected] of Object.entries(tests)) {
  const actual = parseDuration(input);
  if (actual !== expected) {
    console.error(`FAIL: ${input} -> expected ${expected}, got ${actual}`);
  } else {
    console.log(`PASS: ${input} -> ${actual}`);
  }
}
