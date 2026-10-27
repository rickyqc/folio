// Writes folio.schema.json from the Zod schema so editors can autocomplete folio.config.yaml.
import { writeFileSync } from 'node:fs';
import { toJsonSchema } from '../src/config/schema.ts';

writeFileSync(
  new URL('../folio.schema.json', import.meta.url),
  JSON.stringify(toJsonSchema(), null, 2) + '\n',
);
console.log('✓ Wrote folio.schema.json');
