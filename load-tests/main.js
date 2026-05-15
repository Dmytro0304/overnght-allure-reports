/**
 * Default k6 entry — anonymous viewers with production-like ramp.
 *
 * Examples:
 *   k6 run main.js
 *   k6 run -e TARGET_PEAK_VUS=500 -e SMOKE=1 main.js
 *   k6 run -e TARGET_PEAK_VUS=100000 -e EVENT_ID=<uuid> main.js
 */
import anonymousFlow, {
  options as anonymousOptions,
  setup as anonymousSetup,
  handleSummary as anonymousHandleSummary,
} from './scenarios/anonymous-viewer.js';

export const options = anonymousOptions;
export const setup = anonymousSetup;
export const handleSummary = anonymousHandleSummary;
export default anonymousFlow;
