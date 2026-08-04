const fs = require('node:fs');
const path = require('node:path');

const bigFilePath = path.join(__dirname, 'big-file.txt');
const copiedFilePath = path.join(__dirname, 'big-file-copy.txt');

// ---------- STEP 1: create a reasonably large test file ----------
// (In a real project this would be an actual uploaded video/image/CSV —
// we're generating one here just so we have something big to stream.)
function createBigTestFile() {
  const writeStream = fs.createWriteStream(bigFilePath);
  const oneLine = 'This simulates one row of a large CSV export.\n';

  // Write 200,000 lines — big enough to actually demonstrate the difference
  for (let i = 0; i < 200000; i++) {
    writeStream.write(oneLine);
  }
  writeStream.end();

  return new Promise((resolve) => {
    writeStream.on('finish', resolve);
  });
}

// ---------- STEP 2: copy the file using readFile/writeFile (loads it ALL into memory) ----------
function copyWithReadFile() {
  return new Promise((resolve) => {
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    fs.readFile(bigFilePath, (err, data) => {
      if (err) throw err;

      fs.writeFile(copiedFilePath, data, () => {
        const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(
          `readFile/writeFile -> memory used: ~${(memAfter - memBefore).toFixed(2)} MB`
        );
        resolve();
      });
    });
  });
}

// ---------- STEP 3: copy the file using streams (constant, small memory footprint) ----------
function copyWithStreams() {
  return new Promise((resolve) => {
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

    const readStream = fs.createReadStream(bigFilePath);
    const writeStream = fs.createWriteStream(copiedFilePath);

    // pipe: connect readable directly to writable.
    // Handles chunk-by-chunk transfer AND backpressure automatically.
    readStream.pipe(writeStream);

    writeStream.on('finish', () => {
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(
        `stream .pipe() -> memory used: ~${(memAfter - memBefore).toFixed(2)} MB`
      );
      resolve();
    });
  });
}

// ---------- STEP 4: manually watching chunks arrive (like Day 3, but for a file) ----------
function watchChunksManually() {
  return new Promise((resolve) => {
    const readStream = fs.createReadStream(bigFilePath, {
      highWaterMark: 64 * 1024, // read in 64KB chunks
    });

    let chunkCount = 0;

    readStream.on('data', (chunk) => {
      chunkCount++;
      // Only log the first few, otherwise this would flood the console
      if (chunkCount <= 3) {
        console.log(`Chunk #${chunkCount}: ${chunk.length} bytes`);
      }
    });

    readStream.on('end', () => {
      console.log(`Total chunks received: ${chunkCount}`);
      resolve();
    });
  });
}

async function main() {
  console.log('Creating a large test file...');
  await createBigTestFile();

  const stats = fs.statSync(bigFilePath);
  console.log(`File created. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

  console.log('--- Watching chunks arrive manually ---');
  await watchChunksManually();

  console.log('\n--- Copying with readFile/writeFile (loads entire file into memory) ---');
  await copyWithReadFile();

  console.log('\n--- Copying with streams + .pipe() (small, constant memory) ---');
  await copyWithStreams();

  // Cleanup
//   fs.unlinkSync(bigFilePath);
//   fs.unlinkSync(copiedFilePath);
  console.log('\nCleaned up test files.');
}

main();