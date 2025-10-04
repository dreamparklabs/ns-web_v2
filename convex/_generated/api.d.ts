/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiParser from "../aiParser.js";
import type * as assignmentMaster from "../assignmentMaster.js";
import type * as assignments from "../assignments.js";
import type * as authDiagnostics from "../authDiagnostics.js";
import type * as autoSync from "../autoSync.js";
import type * as courses from "../courses.js";
import type * as d2l from "../d2l.js";
import type * as d2lAPI from "../d2lAPI.js";
import type * as d2lOAuth from "../d2lOAuth.js";
import type * as d2lScraper from "../d2lScraper.js";
import type * as emailParser from "../emailParser.js";
import type * as ethnicities from "../ethnicities.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as grades from "../grades.js";
import type * as icsParser from "../icsParser.js";
import type * as ltiIntegration from "../ltiIntegration.js";
import type * as majorCategories from "../majorCategories.js";
import type * as onboarding from "../onboarding.js";
import type * as schools from "../schools.js";
import type * as seed from "../seed.js";
import type * as terms from "../terms.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiParser: typeof aiParser;
  assignmentMaster: typeof assignmentMaster;
  assignments: typeof assignments;
  authDiagnostics: typeof authDiagnostics;
  autoSync: typeof autoSync;
  courses: typeof courses;
  d2l: typeof d2l;
  d2lAPI: typeof d2lAPI;
  d2lOAuth: typeof d2lOAuth;
  d2lScraper: typeof d2lScraper;
  emailParser: typeof emailParser;
  ethnicities: typeof ethnicities;
  events: typeof events;
  files: typeof files;
  grades: typeof grades;
  icsParser: typeof icsParser;
  ltiIntegration: typeof ltiIntegration;
  majorCategories: typeof majorCategories;
  onboarding: typeof onboarding;
  schools: typeof schools;
  seed: typeof seed;
  terms: typeof terms;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
