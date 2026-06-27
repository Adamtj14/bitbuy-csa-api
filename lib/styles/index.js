// Registry of all dashboard style concepts. Both the HTML writer and the
// Chromium renderer import from here so the set stays in one place.

import { html as riso } from "./riso.js";
import { html as familyTimes } from "./family-times.js";
import { html as photoCover } from "./photo-cover.js";
import { html as departure } from "./departure.js";
import { html as bauhaus } from "./bauhaus.js";
import { html as terminal } from "./terminal.js";
import { html as blueprint } from "./blueprint.js";

export const STYLES = {
  riso,
  "family-times": familyTimes,
  "photo-cover": photoCover,
  departure,
  bauhaus,
  terminal,
  blueprint,
};
