import assert from "node:assert/strict";
import {
  courseEditValidationError,
  normalizeCourseEditInput,
  normalizeCourseEditProposalNotes
} from "./course-edit-data";

function test(name: string, run: () => void) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("course edit proposals normalize public correction fields", () => {
  const edit = normalizeCourseEditInput({
    name: "Meadowbrook Community DGC",
    locationName: "Lancaster, PA",
    locationAddress: "100 Park Lane",
    description: "Nine-hole community course with beginner-friendly fairways.",
    difficulty: "beginner",
    hasParking: "true",
    hasBathrooms: true,
    dogFriendly: "on",
    holes: [
      {
        holeNumber: "1",
        par: "3",
        distanceFeet: "214",
        description: "Open starter"
      }
    ]
  });

  assert.equal(edit.name, "Meadowbrook Community DGC");
  assert.equal(edit.locationName, "Lancaster, PA");
  assert.equal(edit.locationAddress, "100 Park Lane");
  assert.equal(
    edit.description,
    "Nine-hole community course with beginner-friendly fairways."
  );
  assert.equal(edit.difficulty, "beginner");
  assert.equal(edit.hasParking, true);
  assert.equal(edit.hasBathrooms, true);
  assert.equal(edit.dogFriendly, true);
  assert.equal(edit.holes[0].distanceFeet, 214);
  assert.equal(courseEditValidationError(edit, { requireHoles: true }), null);
});

test("course edit proposals keep reviewer notes separate from course data", () => {
  assert.equal(
    normalizeCourseEditProposalNotes("  Basket moved behind the oak this spring.  "),
    "Basket moved behind the oak this spring."
  );
  assert.equal(normalizeCourseEditProposalNotes("   "), null);
});

test("course edit proposal validation explains missing required fields", () => {
  const edit = normalizeCourseEditInput({
    name: "",
    locationName: "",
    holes: []
  });

  assert.equal(
    courseEditValidationError(edit, { requireHoles: true }),
    "Course name and location are required"
  );
});
