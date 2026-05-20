import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type UdiscImportResult = {
  courseName?: string;
  locationName?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  layoutName?: string;
  sourceUrl: string;
  holes: {
    number: number;
    par?: number;
    distanceFeet?: number;
    description?: string;
  }[];
  layouts: ImportedLayout[];
  warnings: string[];
};

type ImportedHole = UdiscImportResult["holes"][number];

export type ImportedLayout = {
  name?: string;
  sourceLayoutId?: string;
  expectedHoles?: number;
  holes: ImportedHole[];
};

type UdiscParsePartial = {
  courseName?: string;
  locationName?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  layoutName?: string;
  expectedHoles?: number;
  holes: ImportedHole[];
  layouts: ImportedLayout[];
};

type SelectorMatchDiagnostic = {
  selector: string;
  matches: number;
  parsed: number;
};

type UdiscParserDiagnostics = {
  pageTitle?: string;
  embeddedJsonFound: boolean;
  candidateHoleObjectsFound: number;
  selectorMatchesTried: SelectorMatchDiagnostic[];
  expectedHoles?: number;
  finalHolesParsed: number;
};

const ALLOWED_HOSTS = new Set(["udisc.com", "www.udisc.com"]);
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 3_000_000;
const MAX_HOLES = 72;
const EXPECTED_HOLE_COUNTS = new Set([3, 6, 9, 12, 18, 21, 24, 27, 36]);

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
      layouts: [],
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

export function parseUdiscHtml(html: string, sourceUrl: string): UdiscImportResult {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  const diagnostics: UdiscParserDiagnostics = {
    pageTitle: cleanTitle($("title").first().text()),
    embeddedJsonFound: false,
    candidateHoleObjectsFound: 0,
    selectorMatchesTried: [],
    finalHolesParsed: 0
  };
  const jsonResult = parseEmbeddedData($, diagnostics);
  const htmlResult = parseVisibleHtml($, diagnostics);
  const courseName = jsonResult.courseName ?? htmlResult.courseName;
  const locationName = jsonResult.locationName ?? htmlResult.locationName;
  const locationAddress =
    jsonResult.locationAddress ?? htmlResult.locationAddress;
  const latitude = jsonResult.latitude ?? htmlResult.latitude;
  const longitude = jsonResult.longitude ?? htmlResult.longitude;
  let layouts = normalizeLayouts([
    ...jsonResult.layouts,
    ...htmlResult.layouts
  ]);
  const fallbackHoles = mergeHoles([
    ...jsonResult.holes,
    ...htmlResult.holes
  ]).slice(0, MAX_HOLES);
  const fallbackLayoutName = jsonResult.layoutName ?? htmlResult.layoutName;
  const bestLayout = pickBestImportedLayout(layouts);
  const layoutName = bestLayout?.name ?? fallbackLayoutName;
  let holes = bestLayout?.holes ?? fallbackHoles;
  const expectedHoles = pickExpectedHoleCount(
    bestLayout
      ? [bestLayout.expectedHoles, bestLayout.holes.length]
      : [htmlResult.expectedHoles, jsonResult.expectedHoles]
  );
  const validation = validateParsedHoles(holes, expectedHoles);
  holes = validation.holes;
  warnings.push(...validation.warnings);

  if (layouts.length) {
    layouts = layouts
      .map((layout) => ({
        ...layout,
        holes: validateParsedHoles(layout.holes, layout.expectedHoles).holes
      }))
      .filter((layout) => layout.holes.length > 0);
  } else if (holes.length) {
    layouts = [
      {
        ...(layoutName ? { name: layoutName } : {}),
        ...(expectedHoles ? { expectedHoles } : {}),
        holes
      }
    ];
  }

  diagnostics.expectedHoles = expectedHoles;
  diagnostics.finalHolesParsed = holes.length;

  if (!courseName) {
    warnings.push("Course name was not available from the public UDisc page.");
  }

  if (!holes.length) {
    warnings.push(
      "Hole, par, and distance data was not publicly available from that UDisc page. You can fill it in manually before submitting."
    );
  }

  logDevelopmentDiagnostics(diagnostics);

  return {
    courseName,
    locationName,
    locationAddress,
    latitude,
    longitude,
    layoutName,
    sourceUrl,
    holes,
    layouts,
    warnings
  };
}

function validateParsedHoles(holes: ImportedHole[], expectedHoles?: number) {
  const warnings: string[] = [];
  const cleanedHoles = mergeHoles(holes).filter(
    (hole) => hole.par || hole.distanceFeet || hole.description
  );

  if (!expectedHoles || cleanedHoles.length >= expectedHoles) {
    return { holes: cleanedHoles, warnings };
  }

  warnings.push(
    `Only found ${cleanedHoles.length} of ${expectedHoles} holes. UDisc page structure may have changed.`
  );

  if (
    cleanedHoles.length <= 1 ||
    cleanedHoles.length < Math.ceil(expectedHoles * 0.75)
  ) {
    return { holes: [], warnings };
  }

  return { holes: cleanedHoles, warnings };
}

function pickExpectedHoleCount(values: Array<number | undefined>) {
  return values.find((value) => value && value >= 1 && value <= MAX_HOLES);
}

function logDevelopmentDiagnostics(diagnostics: UdiscParserDiagnostics) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[UDisc importer diagnostics]", diagnostics);
}

function parseEmbeddedData(
  $: cheerio.CheerioAPI,
  diagnostics: UdiscParserDiagnostics
): UdiscParsePartial {
  const result: UdiscParsePartial = { holes: [], layouts: [] };

  $("script").each((_index, element) => {
    const scriptText = ($(element).html() ?? $(element).text()).trim();

    if (!scriptText) {
      return;
    }

    for (const value of extractJsonValues(scriptText)) {
      diagnostics.embeddedJsonFound = true;
      collectJsonData(value, "", result, diagnostics, 0, new Set<object>());
    }
  });

  result.holes = mergeHoles(result.holes);
  result.layouts = normalizeLayouts(result.layouts);

  return result;
}

function extractJsonValues(scriptText: string) {
  const values: unknown[] = [];
  const trimmed = scriptText.trim();
  const directValue = parseJsonValue(trimmed);

  if (directValue !== undefined) {
    values.push(...withDecodedReactRouterPayload(directValue));
    return values;
  }

  for (const payload of extractStreamedJsonPayloads(trimmed)) {
    const value = parseJsonValue(payload);

    if (value !== undefined) {
      values.push(...withDecodedReactRouterPayload(value));
    }
  }

  const assignmentMatch = trimmed.match(/=\s*({[\s\S]*}|\[[\s\S]*\])\s*;?$/);

  if (
    assignmentMatch &&
    (trimmed.includes("course") ||
      trimmed.includes("Course") ||
      trimmed.includes("hole") ||
      trimmed.includes("Hole"))
  ) {
    const value = parseJsonValue(assignmentMatch[1]);

    if (value !== undefined) {
      values.push(...withDecodedReactRouterPayload(value));
    }
  }

  return values;
}

function parseJsonValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function withDecodedReactRouterPayload(value: unknown) {
  const decoded = decodeReactRouterPayload(value);

  return decoded ? [value, decoded] : [value];
}

function decodeReactRouterPayload(value: unknown) {
  if (!Array.isArray(value) || value.length < 20 || !isEncodedRecord(value[0])) {
    return null;
  }

  const hasLoaderData = value.some((item) => item === "loaderData");
  const hasUdiscLayoutData = value.some(
    (item) => item === "layouts" || item === "courseDetail" || item === "holes"
  );

  if (!hasLoaderData && !hasUdiscLayoutData) {
    return null;
  }

  const table = value;
  const decodeReference = (
    index: number,
    seen: Set<number>
  ): unknown => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= table.length ||
      seen.has(index)
    ) {
      return undefined;
    }

    seen.add(index);
    const decoded = decodeReactRouterValue(table[index], table, seen);
    seen.delete(index);

    return decoded;
  };

  return decodeReference(0, new Set<number>());
}

function decodeReactRouterValue(
  value: unknown,
  table: unknown[],
  seen: Set<number>
): unknown {
  const decodeReference = (index: number) => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= table.length ||
      seen.has(index)
    ) {
      return undefined;
    }

    seen.add(index);
    const decoded = decodeReactRouterValue(table[index], table, seen);
    seen.delete(index);

    return decoded;
  };

  if (Array.isArray(value)) {
    if (value[0] === "D") {
      return value[1];
    }

    if (value[0] === "P" && typeof value[1] === "number") {
      return decodeReference(value[1]);
    }

    return value.map((item) =>
      typeof item === "number" ? decodeReference(item) : decodeReactRouterValue(item, table, seen)
    );
  }

  if (value !== null && typeof value === "object") {
    const decoded: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      let decodedKey = key;
      const keyReference = key.match(/^_(\d+)$/);

      if (keyReference) {
        const referencedKey = decodeReference(Number(keyReference[1]));

        if (typeof referencedKey === "string") {
          decodedKey = referencedKey;
        }
      }

      decoded[decodedKey] =
        typeof child === "number"
          ? decodeReference(child)
          : decodeReactRouterValue(child, table, seen);
    });

    return decoded;
  }

  return value;
}

function isEncodedRecord(value: unknown) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => /^_\d+$/.test(key))
  );
}

function extractStreamedJsonPayloads(scriptText: string) {
  const payloads: string[] = [];
  const marker = "streamController.enqueue(";
  let searchIndex = 0;

  while (searchIndex < scriptText.length) {
    const markerIndex = scriptText.indexOf(marker, searchIndex);

    if (markerIndex === -1) {
      break;
    }

    const stringStart = scriptText.indexOf('"', markerIndex + marker.length);

    if (stringStart === -1) {
      break;
    }

    const decoded = readJsonStringLiteral(scriptText, stringStart);

    if (!decoded) {
      searchIndex = stringStart + 1;
      continue;
    }

    const jsonStart = decoded.value.search(/[\[{]/);

    if (jsonStart !== -1) {
      payloads.push(decoded.value.slice(jsonStart));
    }

    searchIndex = decoded.endIndex + 1;
  }

  return payloads;
}

function readJsonStringLiteral(text: string, startIndex: number) {
  let escaped = false;

  for (let index = startIndex + 1; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char !== '"') {
      continue;
    }

    try {
      return {
        value: JSON.parse(text.slice(startIndex, index + 1)) as string,
        endIndex: index
      };
    } catch {
      return null;
    }
  }

  return null;
}

function collectJsonData(
  value: unknown,
  keyHint: string,
  result: UdiscParsePartial,
  diagnostics: UdiscParserDiagnostics,
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
    result.holes.push(...parseHoleArray(value, keyHint, diagnostics));
    value.forEach((item) =>
      collectJsonData(item, keyHint, result, diagnostics, depth + 1, seen)
    );
    return;
  }

  const record = value as Record<string, unknown>;
  collectMetadataFromRecord(record, keyHint, result);
  const layout = tryParseLayoutRecord(record, diagnostics);

  if (layout) {
    result.layouts.push(layout);
  }

  Object.entries(record).forEach(([key, child]) => {
    collectJsonData(child, normalizeKey(key), result, diagnostics, depth + 1, seen);
  });
}

function collectMetadataFromRecord(
  record: Record<string, unknown>,
  keyHint: string,
  result: UdiscParsePartial
) {
  const recordType = textFromUnknown(record["@type"] ?? record.type);
  const isCourseRecord =
    keyHint.includes("course") ||
    Boolean(recordType && /sportsactivitylocation|course/i.test(recordType));

  collectLocationFromRecord(record, keyHint, isCourseRecord, result);

  Object.entries(record).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    const text = textFromUnknown(value);
    const expectedHoles = expectedHoleCountFromUnknown(value);

    if (
      !result.expectedHoles &&
      expectedHoles &&
      (normalizedKey.includes("holecount") ||
        normalizedKey === "holes" ||
        normalizedKey === "numberofholes")
    ) {
      result.expectedHoles = expectedHoles;
    }

    if (!text) {
      return;
    }

    result.expectedHoles ??= findExpectedHoleCountInText(text);

    if (
      !result.courseName &&
      (normalizedKey === "coursename" ||
        normalizedKey === "course" ||
        (isCourseRecord && normalizedKey === "name") ||
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

function collectLocationFromRecord(
  record: Record<string, unknown>,
  keyHint: string,
  isCourseRecord: boolean,
  result: UdiscParsePartial
) {
  const addressRecord =
    recordValue(record.address) ??
    (looksLikeAddressRecord(record) ? record : undefined);
  const address = addressRecord ? parsePostalAddress(addressRecord) : null;

  if (address) {
    result.locationName ??= address.locationName;
    result.locationAddress ??= address.locationAddress;
  }

  const coordinates = parseCoordinates(record);

  if (
    coordinates &&
    (isCourseRecord ||
      keyHint.includes("location") ||
      Boolean(address) ||
      recordValue(record.location))
  ) {
    result.latitude ??= coordinates.latitude;
    result.longitude ??= coordinates.longitude;
  }
}

function parsePostalAddress(record: Record<string, unknown>) {
  const streetAddress = textFromUnknown(record.streetAddress);
  const locality =
    textFromUnknown(record.addressLocality) ??
    textFromUnknown(record.city) ??
    textFromUnknown(record.town);
  const region =
    textFromUnknown(record.addressRegion) ??
    textFromUnknown(record.state) ??
    textFromUnknown(record.region);
  const postalCode = textFromUnknown(record.postalCode);
  const locationName = [locality, region].filter(Boolean).join(", ");
  const locationAddress = [
    streetAddress,
    locality,
    region,
    postalCode
  ]
    .filter(Boolean)
    .join(", ");

  if (!locationName && !locationAddress) {
    return null;
  }

  return {
    locationName: locationName || locationAddress || undefined,
    locationAddress: streetAddress ? locationAddress : undefined
  };
}

function looksLikeAddressRecord(record: Record<string, unknown>) {
  const keys = Object.keys(record).map(normalizeKey);

  return keys.some((key) =>
    [
      "streetaddress",
      "addresslocality",
      "addressregion",
      "postalcode"
    ].includes(key)
  );
}

function parseCoordinates(
  record: Record<string, unknown>
): { latitude: number; longitude: number } | null {
  const nestedGeo = recordValue(record.geo) ?? recordValue(record.location);

  if (nestedGeo && nestedGeo !== record) {
    const coordinates = parseCoordinates(nestedGeo);

    if (coordinates) {
      return coordinates;
    }
  }

  const latitude =
    numberFromUnknown(record.latitude) ??
    numberFromUnknown(record.lat) ??
    numberFromUnknown(record.y);
  const longitude =
    numberFromUnknown(record.longitude) ??
    numberFromUnknown(record.lng) ??
    numberFromUnknown(record.lon) ??
    numberFromUnknown(record.x);

  if (
    latitude === undefined ||
    longitude === undefined ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function recordValue(value: unknown) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseHoleArray(
  value: unknown[],
  keyHint: string,
  diagnostics: UdiscParserDiagnostics
) {
  const holes = value
    .map((item) => tryParseHole(item, diagnostics))
    .filter((hole): hole is ImportedHole => Boolean(hole));

  if (holes.length === 0) {
    return [];
  }

  const confidentHoles = holes.filter(
    (hole) => hole.par || hole.distanceFeet || hole.description
  );

  const merged = mergeHoles(holes);
  const hasHoleHint =
    keyHint.includes("hole") ||
    keyHint.includes("layout") ||
    keyHint.includes("course");
  const consecutiveHoles = countConsecutiveHoles(merged);

  if (
    !hasHoleHint &&
    !EXPECTED_HOLE_COUNTS.has(merged.length) &&
    (merged.length < 3 || confidentHoles.length < 3 || consecutiveHoles < 3)
  ) {
    return [];
  }

  if (hasHoleHint && merged.length < 2 && confidentHoles.length < 1) {
    return [];
  }

  return merged;
}

function tryParseLayoutRecord(
  record: Record<string, unknown>,
  diagnostics: UdiscParserDiagnostics
): ImportedLayout | null {
  const holesEntry = Object.entries(record).find(
    ([key, value]) => normalizeKey(key) === "holes" && Array.isArray(value)
  );

  if (!holesEntry || !Array.isArray(holesEntry[1])) {
    return null;
  }

  const rawHoles = holesEntry[1];
  const holes = mergeHoles(
    rawHoles
      .map((hole) => tryParseHole(hole, diagnostics))
      .filter((hole): hole is ImportedHole => Boolean(hole))
  );
  const expectedHoles =
    pickExpectedHoleCount([
      expectedHoleCountFromUnknown(record.holeCount),
      expectedHoleCountFromUnknown(record.numberOfHoles),
      expectedHoleCountFromUnknown(record.totalHoles),
      rawHoles.length
    ]) ?? holes.length;

  if (holes.length < 2) {
    return null;
  }

  if (
    expectedHoles &&
    holes.length < Math.min(expectedHoles, Math.ceil(expectedHoles * 0.75))
  ) {
    return null;
  }

  const name = cleanTitle(
    textFromUnknown(record.layoutName) ??
      textFromUnknown(record.name) ??
      textFromUnknown(record.title) ??
      ""
  );
  const sourceLayoutId = layoutIdFromRecord(record);

  return {
    ...(name ? { name } : {}),
    ...(sourceLayoutId ? { sourceLayoutId } : {}),
    ...(expectedHoles ? { expectedHoles } : {}),
    holes
  };
}

function layoutIdFromRecord(record: Record<string, unknown>) {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key);

    if (
      normalizedKey !== "layoutid" &&
      normalizedKey !== "id" &&
      normalizedKey !== "_id"
    ) {
      continue;
    }

    const text = textFromUnknown(value);
    const number = typeof value === "number" ? String(Math.round(value)) : undefined;

    if (text || number) {
      return text ?? number;
    }
  }

  return undefined;
}

function tryParseHole(
  value: unknown,
  diagnostics?: UdiscParserDiagnostics
): ImportedHole | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (looksLikeHoleRecord(record)) {
    diagnostics && (diagnostics.candidateHoleObjectsFound += 1);
  }

  const holeNumber = pickNumber(record, [
    "hole",
    "holenumber",
    "hole_number",
    "number",
    "displaynumber",
    "display_number",
    "sequencenumber",
    "sequence",
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

function parseVisibleHtml(
  $: cheerio.CheerioAPI,
  diagnostics: UdiscParserDiagnostics
): UdiscParsePartial {
  const result: UdiscParsePartial = { holes: [], layouts: [] };
  const layoutCandidates = findLayoutCandidates($);
  const bestLayout = pickBestLayoutCandidate(layoutCandidates);

  result.courseName = pickFirstText([
    $("h1").first().text(),
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("title").first().text()
  ]);
  result.locationName = pickFirstText([
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("title").first().text()
  ])
    ? locationNameFromTitle(
        pickFirstText([
          $("meta[property='og:title']").attr("content"),
          $("meta[name='twitter:title']").attr("content"),
          $("title").first().text()
        ]) ?? ""
      )
    : undefined;

  if (bestLayout) {
    result.layoutName = bestLayout.layoutName;
    result.expectedHoles = bestLayout.expectedHoles;
    result.holes.push(...bestLayout.holes);
    result.layouts.push(...layoutCandidates.map(toImportedLayout));
  } else {
    result.layoutName = findLayoutName($);
    result.expectedHoles = findExpectedHoleCountInText(cleanText($("body").text()));
  }

  diagnostics.selectorMatchesTried.push({
    selector: "#layouts a[href*='caddie-book']",
    matches: layoutCandidates.length,
    parsed: bestLayout?.holes.length ?? 0
  });

  const selectorParsers: Array<{
    selector: string;
    parse: (element: AnyNode) => ImportedHole | null;
  }> = [
    {
      selector: "[data-testid*='hole'], [class*='hole'], [id*='hole']",
      parse: (element) => parseHoleText(getElementText($, element))
    },
    {
      selector: "tr, li, article, section",
      parse: (element) => parseHoleText(getElementText($, element))
    }
  ];

  selectorParsers.forEach(({ selector, parse }) => {
    const elements = $(selector).toArray();
    let parsed = 0;

    elements.forEach((element) => {
      const hole = parse(element);

      if (hole) {
        parsed += 1;
        result.holes.push(hole);
      }
    });

    diagnostics.selectorMatchesTried.push({
      selector,
      matches: elements.length,
      parsed
    });
  });

  if (!mergeHoles(result.holes).length) {
    const segments = cleanText($("body").text())
      .split(/(?=\bHole\s*#?\s*\d{1,2}\b)/i)
      .filter((segment) => segment.length < 600);
    let parsed = 0;

    segments.forEach((segment) => {
      const hole = parseHoleText(segment);

      if (hole) {
        parsed += 1;
        result.holes.push(hole);
      }
    });

    diagnostics.selectorMatchesTried.push({
      selector: "body split on Hole N",
      matches: segments.length,
      parsed
    });
  }

  result.holes = mergeHoles(result.holes);
  result.layouts = normalizeLayouts(result.layouts);

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

function locationNameFromTitle(value: string) {
  const title = cleanTitle(value);
  const match = title.match(/\s+-\s+([^|]+)$/);
  const locationName = match ? cleanTitle(match[1]) : "";

  return locationName && locationName.length <= 120 ? locationName : undefined;
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

type HtmlLayoutCandidate = {
  layoutName?: string;
  sourceLayoutId?: string;
  expectedHoles?: number;
  holes: ImportedHole[];
};

function findLayoutCandidates($: cheerio.CheerioAPI) {
  return $("#layouts a[href*='caddie-book']")
    .toArray()
    .map((element): HtmlLayoutCandidate => {
      const holes = $(element)
        .find("[class*='flex-col'][class*='text-center']")
        .toArray()
        .map((column) => parseHoleStatColumn($, column))
        .filter((hole): hole is ImportedHole => Boolean(hole));
      const text = getElementText($, element);

      return {
        layoutName: findLayoutNameInCard($, element),
        sourceLayoutId: findLayoutIdInHref($(element).attr("href")),
        expectedHoles: findLayoutExpectedHoleCount(text),
        holes: mergeHoles(holes)
      };
    })
    .filter((candidate) => candidate.holes.length > 0);
}

function toImportedLayout(candidate: HtmlLayoutCandidate): ImportedLayout {
  return {
    ...(candidate.layoutName ? { name: candidate.layoutName } : {}),
    ...(candidate.sourceLayoutId
      ? { sourceLayoutId: candidate.sourceLayoutId }
      : {}),
    ...(candidate.expectedHoles ? { expectedHoles: candidate.expectedHoles } : {}),
    holes: candidate.holes
  };
}

function findLayoutIdInHref(href: string | undefined) {
  const match = href?.match(/\/layouts\/([^/]+)\/caddie-book/i);

  return match ? match[1] : undefined;
}

function pickBestLayoutCandidate(candidates: HtmlLayoutCandidate[]) {
  return [...candidates].sort((first, second) => {
    const firstMatchesExpected =
      first.expectedHoles && first.expectedHoles === first.holes.length ? 1 : 0;
    const secondMatchesExpected =
      second.expectedHoles && second.expectedHoles === second.holes.length ? 1 : 0;
    const expectedDifference = secondMatchesExpected - firstMatchesExpected;

    if (expectedDifference !== 0) {
      return expectedDifference;
    }

    return second.holes.length - first.holes.length;
  })[0];
}

function findLayoutNameInCard($: cheerio.CheerioAPI, element: AnyNode) {
  const ignoredLabels = new Set([
    "holes",
    "dist",
    "par",
    "popular",
    "leaderboard",
    "map"
  ]);
  const text = $(element)
    .find("*")
    .toArray()
    .map((node) => cleanText($(node).clone().children().remove().end().text()))
    .find((value) => {
      if (!value || value.length > 80) {
        return false;
      }

      const normalized = value.toLowerCase();

      return (
        !ignoredLabels.has(normalized) &&
        !/^\d/.test(value) &&
        !/\b(?:ft|floors?|holes?|par rating)\b/i.test(value)
      );
    });

  return text ? cleanTitle(text) : undefined;
}

function findLayoutExpectedHoleCount(text: string) {
  const match = text.match(/\bHoles\s*[:#]?\s*(\d{1,2})\b/i);
  const count = match ? Number(match[1]) : undefined;

  return count && count >= 1 && count <= MAX_HOLES
    ? Math.round(count)
    : undefined;
}

function getElementText($: cheerio.CheerioAPI, element: AnyNode) {
  const parts = $(element)
    .find("*")
    .addBack()
    .toArray()
    .map((node) => cleanText($(node).clone().children().remove().end().text()))
    .filter(Boolean);

  return cleanText(parts.join(" "));
}

function parseHoleStatColumn(
  $: cheerio.CheerioAPI,
  element: AnyNode
): ImportedHole | null {
  const childTexts = $(element)
    .children()
    .toArray()
    .map((child) => cleanText($(child).text()))
    .filter(Boolean);

  if (childTexts.length < 3 || childTexts.length > 4) {
    return null;
  }

  const number =
    parseHoleNumber(childTexts[0]) ?? numberFromUnknown(childTexts[0]);
  const distanceFeet = parseDistanceFeet(childTexts[1]);
  const par = parsePar(childTexts[2]);

  if (
    !number ||
    !distanceFeet ||
    !par ||
    number < 1 ||
    number > MAX_HOLES
  ) {
    return null;
  }

  return {
    number: Math.round(number),
    par,
    distanceFeet
  };
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
  const directFeet =
    parseDistanceFeet(record.distanceFeet) ??
    parseDistanceFeet(record.distance_feet) ??
    parseDistanceFeet(record.feet) ??
    parseDistanceFeet(record.foot) ??
    parseDistanceFeet(record.holeDistance);

  if (directFeet) {
    return directFeet;
  }

  const hasHoleDistance = Object.keys(record).some(
    (key) => normalizeKey(key) === "holedistance"
  );

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key);

    if (normalizedKey.includes("meter") || normalizedKey.includes("metre")) {
      continue;
    }

    if (hasHoleDistance && normalizedKey === "distance") {
      continue;
    }

    if (
      !normalizedKey.includes("distance") &&
      !normalizedKey.includes("length") &&
      !normalizedKey.includes("feet") &&
      !normalizedKey.includes("foot")
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

function looksLikeHoleRecord(record: Record<string, unknown>) {
  const keys = Object.keys(record).map(normalizeKey);
  const hasNumber =
    keys.some((key) =>
      [
        "hole",
        "holenumber",
        "number",
        "displaynumber",
        "sequencenumber",
        "sequence",
        "sortorder",
        "order"
      ].includes(key)
    ) ||
    Object.entries(record).some(
      ([key, value]) =>
        typeof value === "string" &&
        ["name", "title", "label", "hole"].includes(normalizeKey(key)) &&
        parseHoleNumber(value)
    );
  const hasPar = keys.some((key) => key.includes("par"));
  const hasDistance = keys.some(
    (key) =>
      key.includes("distance") ||
      key.includes("length") ||
      key.includes("feet") ||
      key.includes("foot")
  );

  return hasNumber && (hasPar || hasDistance);
}

function countConsecutiveHoles(holes: ImportedHole[]) {
  let count = 0;

  for (const hole of holes) {
    if (hole.number !== count + 1) {
      break;
    }

    count += 1;
  }

  return count;
}

function parseHoleNumber(text: string) {
  const match =
    text.match(/\bHole\s*#?\s*(\d{1,2})\b/i) ??
    text.match(/\bNo\.?\s*(\d{1,2})\b/i) ??
    text.match(/^#?\s*(\d{1,2})(?:\b|[A-Za-z])/);
  const number = match ? Number(match[1]) : undefined;

  return number && number >= 1 && number <= MAX_HOLES
    ? Math.round(number)
    : undefined;
}

function parsePar(value: unknown) {
  const text = String(value);
  const match = text.match(/\bPar\s*[:#]?\s*(\d)\b/i);
  const number = match ? Number(match[1]) : numberFromUnknown(value);

  return number && number >= 2 && number <= 7 ? Math.round(number) : undefined;
}

function parseDistanceFeet(value: unknown) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const unit = textFromUnknown(record.unit ?? record.units ?? record.measurementUnit);
    const numericValue =
      numberFromUnknown(record.feet) ??
      numberFromUnknown(record.value) ??
      numberFromUnknown(record.distance) ??
      numberFromUnknown(record.length);

    if (
      numericValue &&
      (!unit || /^(?:ft|feet|foot|imperial)$/i.test(unit)) &&
      numericValue >= 20 &&
      numericValue <= 5_000
    ) {
      return Math.round(numericValue);
    }
  }

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

function expectedHoleCountFromUnknown(value: unknown) {
  const number = numberFromUnknown(value);

  if (number && number >= 1 && number <= MAX_HOLES) {
    return Math.round(number);
  }

  return typeof value === "string" ? findExpectedHoleCountInText(value) : undefined;
}

function findExpectedHoleCountInText(value: string) {
  const text = cleanText(value);
  const counts = new Map<number, number>();
  const matches = text.matchAll(
    /\b(?:holes\s*[:#]?\s*(\d{1,2})|(\d{1,2})\s*holes)\b/gi
  );

  for (const match of matches) {
    const count = Number(match[1] ?? match[2]);

    if (!count || count < 1 || count > MAX_HOLES) {
      continue;
    }

    counts.set(count, (counts.get(count) ?? 0) + 1);
  }

  return [...counts.entries()].sort((first, second) => {
    const frequencyDifference = second[1] - first[1];

    if (frequencyDifference !== 0) {
      return frequencyDifference;
    }

    const firstExpected = EXPECTED_HOLE_COUNTS.has(first[0]) ? 1 : 0;
    const secondExpected = EXPECTED_HOLE_COUNTS.has(second[0]) ? 1 : 0;

    return secondExpected - firstExpected;
  })[0]?.[0];
}

function cleanTitle(value: string) {
  return cleanText(value)
    .replace(/\s*(?:\||-|\u00b7)\s*UDisc.*$/i, "")
    .replace(/\s*Disc Golf Course.*$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function pickBestImportedLayout(layouts: ImportedLayout[]) {
  return [...layouts].sort((first, second) => {
    const firstExpected = first.expectedHoles ?? first.holes.length;
    const secondExpected = second.expectedHoles ?? second.holes.length;
    const firstMatchesExpected = firstExpected === first.holes.length ? 1 : 0;
    const secondMatchesExpected = secondExpected === second.holes.length ? 1 : 0;
    const expectedDifference = secondMatchesExpected - firstMatchesExpected;

    if (expectedDifference !== 0) {
      return expectedDifference;
    }

    return second.holes.length - first.holes.length;
  })[0];
}

function normalizeLayouts(layouts: ImportedLayout[]) {
  const byKey = new Map<string, ImportedLayout>();

  layouts.forEach((layout, index) => {
    const holes = mergeHoles(layout.holes).slice(0, MAX_HOLES);

    if (!holes.length) {
      return;
    }

    const key =
      layout.name ? normalizeKey(layout.name) : layout.sourceLayoutId ?? `layout-${index}`;
    const existing = byKey.get(key);
    const name = existing?.name ?? layout.name;
    const sourceLayoutId = existing?.sourceLayoutId ?? layout.sourceLayoutId;
    const expectedHoles =
      existing?.expectedHoles ?? layout.expectedHoles ?? holes.length;

    byKey.set(key, {
      ...(name ? { name } : {}),
      ...(sourceLayoutId ? { sourceLayoutId } : {}),
      ...(expectedHoles ? { expectedHoles } : {}),
      holes: mergeHoles([...(existing?.holes ?? []), ...holes]).slice(0, MAX_HOLES)
    });
  });

  return [...byKey.values()];
}

function mergeHoles(holes: ImportedHole[]) {
  const byNumber = new Map<number, ImportedHole>();

  holes.forEach((hole) => {
    const existing = byNumber.get(hole.number);
    const par = existing?.par ?? hole.par;
    const distanceFeet = existing?.distanceFeet ?? hole.distanceFeet;
    const description = existing?.description ?? hole.description;

    byNumber.set(hole.number, {
      number: hole.number,
      ...(par ? { par } : {}),
      ...(distanceFeet ? { distanceFeet } : {}),
      ...(description ? { description } : {})
    });
  });

  return [...byNumber.values()].sort((first, second) => first.number - second.number);
}
