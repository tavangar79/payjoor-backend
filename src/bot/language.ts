// Reply language (PRD §5.4, builder's call): English when the message's own words are mostly Latin script
// (at least 3 Latin letters and more Latin than Arabic-script letters, ignoring URLs and @handles); else Persian.
import { proseOf } from './parse.js';

export type Lang = 'fa' | 'en';

export function detectLang(text: string | undefined): Lang {
  if (!text) return 'fa';
  const prose = proseOf(text);
  const latin = prose.match(/\p{Script=Latin}/gu)?.length ?? 0;
  const arabic = prose.match(/\p{Script=Arabic}/gu)?.length ?? 0;
  return latin >= 3 && latin > arabic ? 'en' : 'fa';
}
