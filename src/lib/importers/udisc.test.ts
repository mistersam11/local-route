import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseUdiscHtml } from "./udisc";

const sourceUrl = "https://udisc.com/courses/squamanagonic-QFxM";

function parse(html: string) {
  return parseUdiscHtml(html, sourceUrl);
}

function fixture(name: string) {
  return readFileSync(
    join(process.cwd(), "src", "lib", "importers", "__fixtures__", name),
    "utf8"
  );
}

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

test("extracts all holes from the captured Squamanagonic UDisc fixture", () => {
  const result = parse(fixture("squamanagonic.html"));

  assert.equal(result.courseName, "Squamanagonic");
  assert.equal(result.locationName, "Rochester, New Hampshire");
  assert.equal(result.holes.length, 18);
  assert.deepEqual(result.holes.slice(0, 3), [
    { number: 1, par: 3, distanceFeet: 193 },
    { number: 2, par: 3, distanceFeet: 233 },
    { number: 3, par: 3, distanceFeet: 325 }
  ]);
  assert.deepEqual(result.holes.at(-1), {
    number: 18,
    par: 4,
    distanceFeet: 430
  });
  assert.equal(
    result.warnings.some((warning) => warning.startsWith("Only found")),
    false
  );
});

test("extracts all holes from the captured Maple Hill UDisc fixture", () => {
  const result = parseUdiscHtml(
    fixture("maple-hill.html"),
    "https://udisc.com/courses/maple-hill-lCej"
  );

  assert.equal(result.courseName, "Maple Hill");
  assert.equal(result.locationName, "Leicester, Massachusetts");
  assert.equal(Number(result.latitude?.toFixed(3)), 42.276);
  assert.equal(Number(result.longitude?.toFixed(3)), -71.896);
  assert.equal(result.layoutName, "Maple Hill Reds");
  assert.equal(result.holes.length, 18);
  assert.deepEqual(
    {
      number: result.holes[0].number,
      par: result.holes[0].par,
      distanceFeet: result.holes[0].distanceFeet
    },
    { number: 1, par: 3, distanceFeet: 265 }
  );
  assert.deepEqual(result.holes.at(-1), {
    number: 18,
    par: 4,
    distanceFeet: 304
  });
  assert.equal(result.layouts.length >= 6, true);
  assert.equal(
    result.layouts.some(
      (layout) => layout.name === "Maple Hill Blues" && layout.holes.length === 18
    ),
    true
  );
  assert.deepEqual(result.warnings, []);
});

test("uses the displayed layout hole count for North Cove Boulders", () => {
  const result = parseUdiscHtml(
    fixture("north-cove-boulders.html"),
    "https://udisc.com/courses/north-cove-disc-golf-boulders-osby"
  );

  assert.equal(result.courseName, "North Cove Disc Golf: Boulders");
  assert.equal(result.locationName, "Marion, North Carolina");
  assert.equal(result.layoutName, "Boulders River");
  assert.equal(result.holes.length, 20);
  assert.equal(result.layouts.length, 1);
  assert.deepEqual(
    {
      number: result.holes[0].number,
      par: result.holes[0].par,
      distanceFeet: result.holes[0].distanceFeet
    },
    { number: 1, par: 3, distanceFeet: 309 }
  );
  assert.deepEqual(
    {
      number: result.holes.at(-1)?.number,
      par: result.holes.at(-1)?.par,
      distanceFeet: result.holes.at(-1)?.distanceFeet
    },
    { number: 20, par: 4, distanceFeet: 609 }
  );
  assert.deepEqual(result.warnings, []);
});

test("extracts recursive embedded JSON hole arrays before HTML fallback", () => {
  const holes = Array.from({ length: 9 }, (_item, index) => ({
    holeNumber: index + 1,
    par: index === 8 ? 4 : 3,
    distanceFeet: 210 + index * 12,
    description: `Line ${index + 1}`
  }));
  const html = `
    <title>Embedded Pines | UDisc</title>
    <script id="__NEXT_DATA__" type="application/json">
      ${JSON.stringify({
        props: {
          pageProps: {
            course: {
              courseName: "Embedded Pines",
              layouts: [{ layoutName: "Main", holes }]
            }
          }
        }
      })}
    </script>
  `;
  const result = parse(html);

  assert.equal(result.courseName, "Embedded Pines");
  assert.equal(result.layoutName, "Main");
  assert.equal(result.layouts.length, 1);
  assert.equal(result.holes.length, 9);
  assert.deepEqual(result.holes[8], {
    number: 9,
    par: 4,
    distanceFeet: 306,
    description: "Line 9"
  });
});

test("extracts embedded JSON-LD city state and street address", () => {
  const html = `
    <title>Address Pines - Durham, North Carolina | UDisc</title>
    <script type="application/ld+json">
      ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SportsActivityLocation",
        name: "Address Pines",
        address: {
          "@type": "PostalAddress",
          streetAddress: "123 Basket Lane",
          addressLocality: "Durham",
          addressRegion: "North Carolina",
          postalCode: "27701",
          addressCountry: "US"
        },
        geo: {
          latitude: 35.99,
          longitude: -78.9
        }
      })}
    </script>
    <script type="application/json">
      ${JSON.stringify({
        course: {
          courseName: "Address Pines",
          holes: Array.from({ length: 3 }, (_item, index) => ({
            holeNumber: index + 1,
            par: 3,
            distanceFeet: 200 + index * 10
          }))
        }
      })}
    </script>
  `;
  const result = parse(html);

  assert.equal(result.locationName, "Durham, North Carolina");
  assert.equal(result.locationAddress, "123 Basket Lane, Durham, North Carolina, 27701");
  assert.equal(result.latitude, 35.99);
  assert.equal(result.longitude, -78.9);
});

test("keeps multiple embedded layouts separate", () => {
  const red = Array.from({ length: 3 }, (_item, index) => ({
    holeNumber: index + 1,
    par: 3,
    distanceFeet: 200 + index * 10
  }));
  const blue = Array.from({ length: 3 }, (_item, index) => ({
    holeNumber: index + 1,
    par: index === 0 ? 4 : 3,
    distanceFeet: 320 + index * 20
  }));
  const html = `
    <title>Layout Woods | UDisc</title>
    <script type="application/json">
      ${JSON.stringify({
        course: {
          courseName: "Layout Woods",
          layouts: [
            { layoutId: 10, name: "Reds", holes: red },
            { layoutId: 11, name: "Blues", holes: blue }
          ]
        }
      })}
    </script>
  `;
  const result = parse(html);

  assert.equal(result.layouts.length, 2);
  assert.equal(result.layoutName, "Reds");
  assert.deepEqual(result.layouts[1].holes[0], {
    number: 1,
    par: 4,
    distanceFeet: 320
  });
});

test("extracts repeated visible HTML hole cards", () => {
  const html = `
    <title>Card Course | UDisc</title>
    <main>
      <article class="hole-card"><h3>Hole 1</h3><span>Par 3</span><span>240 ft</span><p>Easy hyzer.</p></article>
      <article class="hole-card"><h3>Hole 2</h3><span>Par 4</span><span>420 ft</span><p>Shape the landing zone.</p></article>
      <article class="hole-card"><h3>Hole 3</h3><span>Par 3</span><span>280 ft</span></article>
    </main>
  `;
  const result = parse(html);

  assert.deepEqual(result.holes, [
    { number: 1, par: 3, distanceFeet: 240 },
    { number: 2, par: 4, distanceFeet: 420, description: "Shape the landing zone." },
    { number: 3, par: 3, distanceFeet: 280 }
  ]);
});

test("deduplicates holes by number and keeps the best fields", () => {
  const html = `
    <title>Duplicate Course | UDisc</title>
    <main>
      <article class="hole-card"><h3>Hole 1</h3><span>Par 3</span></article>
      <article class="hole-card"><h3>Hole 1</h3><span>240 ft</span></article>
      <article class="hole-card"><h3>Hole 2</h3><span>Par 4</span><span>420 ft</span></article>
    </main>
  `;
  const result = parse(html);

  assert.deepEqual(result.holes, [
    { number: 1, par: 3, distanceFeet: 240 },
    { number: 2, par: 4, distanceFeet: 420 }
  ]);
});

test("warns and falls back when only one of eighteen holes is parsed", () => {
  const result = parse(`
    <title>Incomplete Course | UDisc</title>
    <main>
      <p>18 holes</p>
      <article class="hole-card"><h3>Hole 1</h3><span>Par 3</span><span>240 ft</span></article>
    </main>
  `);

  assert.equal(result.holes.length, 0);
  assert.equal(
    result.warnings.includes(
      "Only found 1 of 18 holes. UDisc page structure may have changed."
    ),
    true
  );
});
