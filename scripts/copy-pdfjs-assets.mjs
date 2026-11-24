// Copy pdf.js CMaps and standard fonts into public/ so CJK PDFs decode correctly.
// Runs before dev/build; the output folder is gitignored.
import { cpSync, existsSync } from 'node:fs';

const src = 'node_modules/pdfjs-dist';
const dest = 'public/pdfjs';
for (const dir of ['cmaps', 'standard_fonts']) {
  if (existsSync(`${src}/${dir}`)) cpSync(`${src}/${dir}`, `${dest}/${dir}`, { recursive: true });
}
