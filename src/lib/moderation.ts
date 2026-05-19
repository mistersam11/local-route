const moderationEndpoint = "https://api.openai.com/v1/moderations";
const defaultModerationModel = "omni-moderation-latest";

type ModerationResult = {
  flagged?: boolean;
  categories?: Record<string, boolean>;
};

type ModerationResponse = {
  results?: ModerationResult[];
};

export class ModerationFlaggedError extends Error {
  categories: string[];

  constructor(categories: string[]) {
    super("Content was flagged by moderation");
    this.name = "ModerationFlaggedError";
    this.categories = categories;
  }
}

export class ModerationUnavailableError extends Error {
  constructor(message = "Moderation is unavailable") {
    super(message);
    this.name = "ModerationUnavailableError";
  }
}

export function moderationFailure(error: unknown) {
  if (error instanceof ModerationFlaggedError) {
    return {
      status: 400,
      message: "That text needs a quick edit before it can be posted."
    };
  }

  if (error instanceof ModerationUnavailableError) {
    return {
      status: 503,
      message: "Moderation is unavailable right now. Try again in a minute."
    };
  }

  return null;
}

function cleanTextFields(fields: Array<string | null | undefined>) {
  return fields
    .map((field) => field?.trim() ?? "")
    .filter((field) => field.length > 0);
}

export async function moderateTextFields(fields: Array<string | null | undefined>) {
  const input = cleanTextFields(fields);

  if (!input.length) {
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new ModerationUnavailableError("OpenAI moderation is not configured");
    }

    console.warn("Skipping moderation because OPENAI_API_KEY is not set.");
    return;
  }

  const response = await fetch(moderationEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODERATION_MODEL?.trim() || defaultModerationModel,
      input
    })
  });

  if (!response.ok) {
    console.error("OpenAI moderation request failed", {
      status: response.status,
      statusText: response.statusText
    });
    throw new ModerationUnavailableError("OpenAI moderation request failed");
  }

  const moderation = (await response.json()) as ModerationResponse;
  const flagged = moderation.results?.find((result) => result.flagged);

  if (flagged) {
    const categories = Object.entries(flagged.categories ?? {})
      .filter(([, isFlagged]) => isFlagged)
      .map(([category]) => category);

    throw new ModerationFlaggedError(categories);
  }
}
