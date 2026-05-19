import * as cheerio from "cheerio";

export type UdiscImportResult = {
  courseName?: string;
  layoutName?: string;
  sourceUrl: string;
  holes: {
    number: number;
    par?: number;
    distanceFeet?: number;
    description?: string;
  }[];
  warnings: string[];
};

type ImportedHole = UdiscImportResult["holes"][number];

const ALLOWED_HOSTS = new Set(["udisc.com", "www.udisc.com"]);
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 800_000;
const MAX_HOLES = 72;

export class UdiscImportValidationError extends Error {}

class UdiscImportFetchError extends Error {}

export function normalizeUdiscUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new UdiscImportValidationError("Paste a valid UDisc URL.");
  }

  validateUdiscUrl(url);
  url.hash = "";

  return url.toString();
}

export async function importUdiscCourse(
  rawUrl: string
): Promise<UdiscImportResult> {
  const sourceUrl = normalizeUdiscUrl(rawUrl);

  try {
    const html = await fetchPublicUdiscPage(sourceUrl);
    return parseUdiscHtml(html, sourceUrl);
  } catch (error) {
    return {
      sourceUrl,
      holes: [],
      warnings: [
        error instanceof UdiscImportFetchError
          ? error.message
          : "LocalRoute could not read that public UDisc page. A blank draft was created so you can enter it manually."
      ]
    };
  }
}

function validateUdiscUrl(url: URL) {
  if (url.protocol !== "https:") {
    throw new UdiscImportValidationError("UDisc imports must use an HTTPS link.");
  }

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new UdiscImportValidationError(
      "Only public udisc.com links can be imported."
    );
  }
}

async function fetchPublicUdiscPage(sourceUrl: string) {
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const url = new URL(currentUrl);
    validateUdiscUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent": "LocalRoute public course importer"
        },
        redirect: "manual",
        signal: controller.signal
      });
    } catch {
      clearTimeout(timeout);
      throw new UdiscImportFetchError(
        "UDisc did not respond in time. A blank draft was created so you can enter it manually."
      );
    }

    if (response.status >= 300 && response.status < 400) {
      clearTimeout(timeout);
      const location = response.headers.get("location");

      if (!location) {
        throw new UdiscImportFetchError(
          "UDisc redirected that link without a public destination. A blank draft was created."
        );
      }

      const nextUrl = new URL(location, url);
      validateUdiscUrl(nextUrl);
      currentUrl = nextUrl.toString();
      continue;
    }

    if (!response.ok) {
      clearTimeout(timeout);
      throw new UdiscImportFetchError(
        response.status === 401 || response.status === 403
          ? "That UDisc page does not appear to be publicly available. A blank draft was created."
          : "UDisc did not return a public course page. A blank draft was created."
      );
    }

    try {
      return await readResponseText(response);
    } catch (error) {
      if (error instanceof UdiscImportFetchError) {
        throw error;
      }

      throw new UdiscImportFetchError(
        "UDisc did not finish sending that public page. A blank draft was created."
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new UdiscImportFetchError(
    "UDisc redirected too many times. A blank draft was created."
  );
}

async function readResponseText(response: Response) {
  if (!response.body) {
    const text = await response.text();

    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new UdiscImportFetchError(
        "That UDisc page was too large to import safely. A blank draft was created."
      );
    }

    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new UdiscImportFetchError(
        "That UDisc page was too large to import safely. A blank draft was created."
      );
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();

  return text;
}

function parseUdiscHtml(html: string, sourceUrl: string): UdiscImportResult {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  const jsonResult = parseEmbeddedData($);
  const htmlResult = parseVisibleHtml($);
  const courseName = jsonResult.courseName ?? htmlResult.courseName;
  const layoutName = jsonResult.layoutName ?? htmlResult.layoutName;
  const holes = mergeHoles([...jsonResult.holes, ...htmlResult.holes]).slice(
    0,
    MAX_HOLES
  );

  if (!courseName) {
    warnings.push("Course name was not available from the public UDisc page.");
  }

  if (!holes.length) {
    warnings.push(
      "Hole, par, and distance data was not publicly available from that UDisc page. You can fill it in manually before submitting."
    );
  }

  return {
    courseName,
    layoutName,
    sourceUrl,
    holes,
    warnings
  };
}

function parseEmbeddedData($: cheerio.CheerioAPI) {
  const result: {
    courseName?: string;
    layoutName?: string;
    holes: ImportedHole[];
  } = { holes: [] };

  $("script").each((_index, element) => {
    const scriptText = $(element).text().trim();

    if (!scriptText) {
      return;
    }

    for (const value of extractJsonValues(scriptText)) {
      collectJsonData(value, "", result, 0, new Set<object>());
    }
  });

  result.holes = mergeHoles(result.holes);

  return result;
}

function extractJsonValues(scriptText: string) {
  const values: unknown[] = [];
  const trimmed = scriptText.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      values.push(JSON.parse(trimmed));
      return values;
    } catch {
      return values;
    }
  }

  const assignmentMatch = trimmed.match(/=\s*({[\s\S]*})\s*;?$/);

  if (
    assignmentMatch &&
    (trimmed.includes("course") ||
      trimmed.includes("Course") ||
      trimmed.includes("hole") ||
      trimmed.includes("Hole"))
  ) {
    try {
      values.push(JSON.parse(assignmentMatch[1]));
    } catch {
      return values;
    }
  }

  return values;
}

function collectJsonData(
  value: unknown,
  keyHint: string,
  result: {
    courseName?: string;
    layoutName?: string;
    holes: ImportedHole[];
  },
  depth: number,
  seen: Set<object>
) {
  if (depth > 12 || value === null || typeof value !== "object") {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    result.holes.push(...parseHoleArray(value, keyHint));
    value.forEach((item) =>
      collectJsonData(item, keyHint, result, depth + 1, seen)
    );
    return;
  }

  const record = value as Record<string, unknown>;
  collectNamesFromRecord(record, keyHint, result);

  Object.entries(record).forEach(([key, child]) => {
    collectJsonData(child, normalizeKey(key), result, depth + 1, seen);
  });
}

function collectNamesFromRecord(
  record: Record<string, unknown>,
  keyHint: string,
  result: {
    courseName?: string;
    layoutName?: string;
  }
) {
  Object.entries(record).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    const text = textFromUnknown(value);

    if (!text) {
      return;
    }

    if (
      !result.courseName &&
      (normalizedKey === "coursename" ||
        normalizedKey === "course" ||
        (keyHint.includes("course") && normalizedKey === "name"))
    ) {
      result.courseName = cleanTitle(text);
    }

    if (
      !result.layoutName &&
      (normalizedKey === "layoutname" ||
        normalizedKey === "layout" ||
        (keyHint.includes("layout") && normalizedKey === "name"))
    ) {
      result.layoutName = cleanTitle(text);
    }
  });
}

function parseHoleArray(value: unknown[], keyHint: string) {
  const holes = value
    .map((item) => tryParseHole(item))
    .filter((hole): hole is ImportedHole => Boolean(hole));

  if (holes.length === 0) {
    return [];
  }

  const confidentHoles = holes.filter(
    (hole) => hole.par || hole.distanceFeet || hole.description
  );

  if (!keyHint.includes("hole") && holes.length < 3 && confidentHoles.length < 2) {
    return [];
  }

  return mergeHoles(holes);
}

function tryParseHole(value: unknown): ImportedHole | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const holeNumber = pickNumber(record, [
    "holenumber",
    "hole_number",
    "number",
    "displaynumber",
    "sortorder",
    "order"
  ]);
  const numberFromText = Object.entries(record)
    .filter(([key, item]) => {
      const normalizedKey = normalizeKey(key);
      return (
        typeof item === "string" &&
        ["name", "title", "label", "hole"].includes(normalizedKey)
      );
    })
    .map(([_key, item]) => parseHoleNumber(String(item)))
    .find((number) => number !== undefined);
  const number = holeNumber ?? numberFromText;

  if (!number || number < 1 || number > MAX_HOLES) {
    return null;
  }

  const par = pickPar(record);
  const distanceFeet = pickDistance(record);
  const description = pickDescription(record);

  if (!par && !distanceFeet && !description) {
    return null;
  }

  return {
    number,
    ...(par ? { par } : {}),
    ...(distanceFeet ? { distanceFeet } : {}),
    ...(description ? { description } : {})
  };
}

function parseVisibleHtml($: cheerio.CheerioAPI) {
  const result: {
    courseName?: string;
    layoutName?: string;
    holes: ImportedHole[];
  } = { holes: [] };

  result.courseName = pickFirstText([
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").first().text()
  ]);
  result.layoutName = findLayoutName($);

  $("tr, li, article, section").each((_index, element) => {
    const hole = parseHoleText($(element).text());

    if (hole) {
      result.holes.push(hole);
    }
  });

  if (!result.holes.length) {
    const segments = cleanText($("body").text())
      .split(/(?=\bHole\s*#?\s*\d{1,2}\b)/i)
      .filter((segment) => segment.length < 600);

    segments.forEach((segment) => {
      const hole = parseHoleText(segment);

      if (hole) {
        result.holes.push(hole);
      }
    });
  }

  result.holes = mergeHoles(result.holes);

  return result;
}

function pickFirstText(values: Array<string | undefined>) {
  for (const value of values) {
    const text = cleanTitle(value ?? "");

    if (text) {
      return text;
    }
  }

  return undefined;
}

function findLayoutName($: cheerio.CheerioAPI) {
  let layoutName: string | undefined;

  $("[data-testid], [class], [id]").each((_index, element) => {
    if (layoutName) {
      return;
    }

    const attrs = [
      $(element).attr("data-testid"),
      $(element).attr("class"),
      $(element).attr("id")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!attrs.includes("layout")) {
      return;
    }

    const text = cleanText($(element).text());

    if (text && text.length <= 80 && !/^layout$/i.test(text)) {
      layoutName = cleanTitle(text.replace(/^layout\s*:?\s*/i, ""));
    }
  });

  return layoutName;
}

function parseHoleText(rawText: string): ImportedHole | null {
  const text = cleanText(rawText);

  if (text.length < 8 || text.length > 500) {
    return null;
  }

  const number = parseHoleNumber(text);
  const par = parsePar(text);
  const distanceFeet = parseDistanceFeet(text);

  if (!number || (!par && !distanceFeet)) {
    return null;
  }

  const description = cleanHoleDescription(text, number, par, distanceFeet);

  return {
    number,
    ...(par ? { par } : {}),
    ...(distanceFeet ? { distanceFeet } : {}),
    ...(description ? { description } : {})
  };
}

function cleanHoleDescription(
  text: string,
  number: number,
  par?: number,
  distanceFeet?: number
) {
  let description = text
    .replace(new RegExp(`\\bHole\\s*#?\\s*${number}\\b`, "i"), "")
    .replace(/\bHole\b/i, "")
    .replace(/\bPar\s*\d\b/i, "")
    .replace(/\b\d{2,5}\s*(?:ft|feet|'|′)\b/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (par) {
    description = description.replace(new RegExp(`\\b${par}\\b`), "").trim();
  }

  if (distanceFeet) {
    description = description
      .replace(new RegExp(`\\b${distanceFeet}\\b`), "")
      .trim();
  }

  return description.length >= 18 && description.length <= 280
    ? description
    : undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (!keys.includes(normalizeKey(key))) {
      continue;
    }

    const number = numberFromUnknown(value);

    if (number && number >= 1 && number <= MAX_HOLES) {
      return Math.round(number);
    }
  }

  return undefined;
}

function pickPar(record: Record<string, unknown>) {
  for (const [key, value] of Object.entries(record)) {
    if (!normalizeKey(key).includes("par")) {
      continue;
    }

    const par = numberFromUnknown(value) ?? parsePar(String(value));

    if (par && par >= 2 && par <= 7) {
      return Math.round(par);
    }
  }

  return undefined;
}

function pickDistance(record: Record<string, unknown>) {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key);

    if (normalizedKey.includes("meter") || normalizedKey.includes("metre")) {
      continue;
    }

    if (
      !normalizedKey.includes("distance") &&
      !normalizedKey.includes("length") &&
      !normalizedKey.includes("feet")
    ) {
      continue;
    }

    const distance = parseDistanceFeet(value);

    if (distance) {
      return distance;
    }
  }

  return undefined;
}

function pickDescription(record: Record<string, unknown>) {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key);

    if (
      ![
        "description",
        "notes",
        "note",
        "summary",
        "body",
        "tip"
      ].includes(normalizedKey)
    ) {
      continue;
    }

    const text = textFromUnknown(value);

    if (text && text.length <= 280) {
      return text;
    }
  }

  return undefined;
}

function parseHoleNumber(text: string) {
  const match =
    text.match(/\bHole\s*#?\s*(\d{1,2})\b/i) ??
    text.match(/^#?\s*(\d{1,2})\b/);
  const number = match ? Number(match[1]) : undefined;

  return number && number >= 1 && number <= MAX_HOLES
    ? Math.round(number)
    : undefined;
}

function parsePar(value: unknown) {
  const text = String(value);
  const match = text.match(/\bPar\s*(\d)\b/i);
  const number = match ? Number(match[1]) : numberFromUnknown(value);

  return number && number >= 2 && number <= 7 ? Math.round(number) : undefined;
}

function parseDistanceFeet(value: unknown) {
  const numeric = numberFromUnknown(value);

  if (numeric && numeric >= 20 && numeric <= 5_000) {
    return Math.round(numeric);
  }

  const text = String(value);
  const feetMatch = text.match(/\b(\d{2,5})\s*(?:ft|feet|'|′)\b/i);

  if (feetMatch) {
    const distance = Number(feetMatch[1]);
    return distance >= 20 && distance <= 5_000 ? Math.round(distance) : undefined;
  }

  return undefined;
}

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/\d+(?:\.\d+)?/);
    const number = match ? Number(match[0]) : NaN;
    return Number.isFinite(number) ? number : undefined;
  }

  return undefined;
}

function textFromUnknown(value: unknown) {
  return typeof value === "string" ? cleanText(value) : undefined;
}

function cleanTitle(value: string) {
  return cleanText(value)
    .replace(/\s*(?:\||-|·)\s*UDisc.*$/i, "")
    .replace(/\s*Disc Golf Course.*$/i, "")
    .trim();
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function mergeHoles(holes: ImportedHole[]) {
  const byNumber = new Map<number, ImportedHole>();

  holes.forEach((hole) => {
    const existing = byNumber.get(hole.number);

    byNumber.set(hole.number, {
      number: hole.number,
      par: existing?.par ?? hole.par,
      distanceFeet: existing?.distanceFeet ?? hole.distanceFeet,
      description: existing?.description ?? hole.description
    });
  });

  return [...byNumber.values()].sort((first, second) => first.number - second.number);
}
