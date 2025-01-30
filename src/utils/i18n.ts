import { I18n } from 'i18n-js';
import { Language } from 'node-insim/packets';

export const i18n = new I18n();

i18n.locale = 'en-US';
i18n.defaultLocale = 'en-US';
i18n.enableFallback = true;

export function convertLanguage(language: Language): string {
  switch (language) {
    case Language.LFS_ENGLISH:
      return 'en-US';

    case Language.LFS_DEUTSCH:
      return 'de-DE';

    case Language.LFS_PORTUGUESE:
      return 'pt-PT';

    case Language.LFS_FRENCH:
      return 'fr-FR';

    case Language.LFS_SUOMI:
      return 'fi-FI';

    case Language.LFS_NORSK:
      return 'no-NO';

    case Language.LFS_NEDERLANDS:
      return 'nl-NL';

    case Language.LFS_CATALAN:
      return 'ca-ES';

    case Language.LFS_TURKISH:
      return 'tr-TR';

    case Language.LFS_CASTELLANO:
      return 'es-ES';

    case Language.LFS_ITALIANO:
      return 'it-IT';

    case Language.LFS_DANSK:
      return 'da-DK';

    case Language.LFS_CZECH:
      return 'cs-CZ';

    case Language.LFS_RUSSIAN:
      return 'ru-RU';

    case Language.LFS_ESTONIAN:
      return 'et-EE';

    case Language.LFS_SERBIAN:
      return 'sr-RS';

    case Language.LFS_GREEK:
      return 'el-GR';

    case Language.LFS_POLSKI:
      return 'pl-PL';

    case Language.LFS_CROATIAN:
      return 'hr-HR';

    case Language.LFS_HUNGARIAN:
      return 'hu-HU';

    case Language.LFS_BRAZILIAN:
      return 'pt-BR';

    case Language.LFS_SWEDISH:
      return 'sv-SE';

    case Language.LFS_SLOVAK:
      return 'sk-SK';

    case Language.LFS_GALEGO:
      return 'gl-ES';

    case Language.LFS_SLOVENSKI:
      return 'sl-SI';

    case Language.LFS_BELARUSSIAN:
      return 'be-BY';

    case Language.LFS_LATVIAN:
      return 'lv-LV';

    case Language.LFS_LITHUANIAN:
      return 'lt-LT';

    case Language.LFS_TRADITIONAL_CHINESE:
      return 'zh-TW';

    case Language.LFS_SIMPLIFIED_CHINESE:
      return 'zh-CN';

    case Language.LFS_JAPANESE:
      return 'ja-JP';

    case Language.LFS_KOREAN:
      return 'ko-KR';

    case Language.LFS_BULGARIAN:
      return 'bg-BG';

    case Language.LFS_LATINO:
      return 'es-LA';

    case Language.LFS_UKRAINIAN:
      return 'uk-UA';

    case Language.LFS_INDONESIAN:
      return 'id-ID';

    case Language.LFS_ROMANIAN:
      return 'ro-RO';

    default:
      return 'en-US';
  }
}
