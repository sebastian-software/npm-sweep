const BLOCK_SIZE = 512;

function createHeader(name: string, size: number): Buffer {
  const header = Buffer.alloc(BLOCK_SIZE);

  writeString(header, name, 0, 100);
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, Math.floor(Date.now() / 1000), 136, 12);

  header.fill(' ', 148, 156);

  header[156] = '0'.charCodeAt(0);

  writeString(header, 'ustar', 257, 6);
  writeString(header, '00', 263, 2);

  const checksum = calculateChecksum(header);
  writeOctal(header, checksum, 148, 8);

  return header;
}

function writeString(buffer: Buffer, str: string, offset: number, length: number): void {
  const bytes = Buffer.from(str, 'utf-8');
  bytes.copy(buffer, offset, 0, Math.min(bytes.length, length - 1));
}

function writeOctal(buffer: Buffer, value: number, offset: number, length: number): void {
  const str = value.toString(8).padStart(length - 1, '0');
  writeString(buffer, str, offset, length);
}

function calculateChecksum(header: Buffer): number {
  let sum = 0;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    sum += header[i] ?? 0;
  }
  return sum;
}

function padToBlock(data: Buffer): Buffer {
  const remainder = data.length % BLOCK_SIZE;
  if (remainder === 0) return data;

  const padding = Buffer.alloc(BLOCK_SIZE - remainder);
  return Buffer.concat([data, padding]);
}

export function create(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [];

  for (const [name, content] of Object.entries(files)) {
    const contentBuffer = Buffer.from(content, 'utf-8');
    const header = createHeader(name, contentBuffer.length);

    parts.push(header);
    parts.push(padToBlock(contentBuffer));
  }

  parts.push(Buffer.alloc(BLOCK_SIZE * 2));

  return Buffer.concat(parts);
}
