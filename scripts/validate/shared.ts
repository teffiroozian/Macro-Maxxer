import { readFile } from "node:fs/promises";

export type JsonObject = Record<string, unknown>;
export type Severity = "error" | "warning" | "info";

export interface Finding<CheckName extends string = string> {
  severity: Severity;
  check: CheckName;
  code: string;
  message: string;
  affectedCount?: number;
  recordIds?: string[];
  path?: string;
}

export interface CheckResult {
  passed: boolean;
  errors: number;
  warnings: number;
  info: number;
  details: Record<string, unknown>;
}

export interface ValidationContext<CheckName extends string> {
  errors: Finding<CheckName>[];
  warnings: Finding<CheckName>[];
  info: Finding<CheckName>[];
  checks: Record<CheckName, CheckResult>;
}

export const CORE_NUTRITION_FIELDS = ["calories", "protein", "carbs", "totalFat"] as const;
export const OPTIONAL_NUTRITION_FIELDS = [
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
] as const;

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function objectArray(value: unknown): JsonObject[] | undefined {
  return Array.isArray(value) && value.every(isObject) ? value : undefined;
}

export function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;
}

export function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

export function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function createValidationContext<CheckName extends string>(
  checkNames: readonly CheckName[],
): ValidationContext<CheckName> {
  return {
    errors: [],
    warnings: [],
    info: [],
    checks: Object.fromEntries(
      checkNames.map((name) => [name, { passed: true, errors: 0, warnings: 0, info: 0, details: {} }]),
    ) as Record<CheckName, CheckResult>,
  };
}

export function addFinding<CheckName extends string>(
  context: ValidationContext<CheckName>,
  severity: Severity,
  check: CheckName,
  code: string,
  message: string,
  options: Pick<Finding<CheckName>, "affectedCount" | "recordIds" | "path"> = {},
): void {
  const finding: Finding<CheckName> = { severity, check, code, message, ...options };
  context[severity === "error" ? "errors" : severity === "warning" ? "warnings" : "info"].push(finding);
  const summary = context.checks[check];
  if (severity === "error") {
    summary.errors += 1;
    summary.passed = false;
  } else if (severity === "warning") {
    summary.warnings += 1;
  } else {
    summary.info += 1;
  }
}

export function setCheckDetails<CheckName extends string>(
  context: ValidationContext<CheckName>,
  check: CheckName,
  details: Record<string, unknown>,
): void {
  Object.assign(context.checks[check].details, details);
}

export async function parseJsonFile<CheckName extends string>(
  path: string,
  label: string,
  context: ValidationContext<CheckName>,
  structureCheck: CheckName,
): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    addFinding(
      context,
      "error",
      structureCheck,
      "json_file_unreadable_or_invalid",
      `${label} could not be read as valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { path },
    );
    return null;
  }
}

export function requireObjectArray<CheckName extends string>(
  value: unknown,
  path: string,
  context: ValidationContext<CheckName>,
  check: CheckName,
): JsonObject[] {
  const result = objectArray(value);
  if (!result) {
    addFinding(context, "error", check, "required_object_array_invalid", `${path} must be an array of objects.`, { path });
    return [];
  }
  return result;
}

export function requireStringArray<CheckName extends string>(
  value: unknown,
  path: string,
  context: ValidationContext<CheckName>,
  check: CheckName,
  allowEmpty = true,
): string[] {
  const result = stringArray(value);
  if (!result || (!allowEmpty && result.length === 0)) {
    addFinding(context, "error", check, "required_string_array_invalid", `${path} must be ${allowEmpty ? "an" : "a non-empty"} array of strings.`, { path });
    return [];
  }
  return result;
}

export function validateNutrition<CheckName extends string>(
  nutrition: unknown,
  path: string,
  recordId: string,
  context: ValidationContext<CheckName>,
  check: CheckName,
): nutrition is JsonObject {
  if (!isObject(nutrition)) {
    addFinding(context, "error", check, "nutrition_object_invalid", `${path} must be an object.`, {
      recordIds: [recordId],
      path,
    });
    return false;
  }
  for (const field of CORE_NUTRITION_FIELDS) {
    const value = nutrition[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      addFinding(context, "error", check, "required_nutrition_value_invalid", `${path}.${field} must be finite.`, {
        recordIds: [recordId],
        path: `${path}.${field}`,
      });
    } else if (value < 0) {
      addFinding(context, "error", check, "negative_nutrition_value", `${path}.${field} must not be negative.`, {
        recordIds: [recordId],
        path: `${path}.${field}`,
      });
    }
  }
  for (const field of OPTIONAL_NUTRITION_FIELDS) {
    if (!(field in nutrition)) continue;
    const value = nutrition[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      addFinding(context, "error", check, "optional_nutrition_value_invalid", `${path}.${field} must be finite when present.`, {
        recordIds: [recordId],
        path: `${path}.${field}`,
      });
    } else if (value < 0) {
      addFinding(context, "error", check, "negative_nutrition_value", `${path}.${field} must not be negative.`, {
        recordIds: [recordId],
        path: `${path}.${field}`,
      });
    }
  }
  return true;
}

export function findingTypeCounts(findings: Array<Finding<string>>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const finding of findings) counts[finding.code] = (counts[finding.code] ?? 0) + (finding.affectedCount ?? 1);
  return counts;
}
