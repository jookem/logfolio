import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import pt from "./locales/pt";
import ja from "./locales/ja";

export { LANGUAGES } from "../constants";

const DICTS = { es, fr, de, pt, ja };

// key: a "namespace.name" string unique to the string's call site.
// fallback: the English text — also what renders when `lang` is "en"
// or a key is missing from a locale file, so translations can be filled
// in incrementally without ever breaking the UI.
export function translate(lang, key, fallback, vars) {
  const dict = DICTS[lang];
  let str = (dict && dict[key]) || fallback || key;
  if (vars) {
    for (const k in vars) str = str.split(`{{${k}}}`).join(vars[k]);
  }
  return str;
}
