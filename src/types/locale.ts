import type { Language } from 'node-insim/packets';

export interface Locale<T> {
  language: Language;
  content: T;
}
