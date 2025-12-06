/**
 * ISO-8601 timestamp branding ensures we treat dates as validated strings.
 */
declare const isoDateTimeBrand: unique symbol;

export type IsoDateTime = string & { readonly [isoDateTimeBrand]: true };

/**
 * Normalises a string value into an ISO-8601 timestamp (UTC) or throws.
 * @param value - Candidate date string.
 * @returns Branded ISO datetime string.
 */
export function ensureIsoDateTime(value: string): IsoDateTime {
  try {
    const isoValue = new Date(value).toISOString();
    return isoValue as IsoDateTime;
  } catch (error) {
    throw new TypeError(`Value "${value}" is not a valid ISO-8601 timestamp.`, {
      cause: error,
    });
  }
}
