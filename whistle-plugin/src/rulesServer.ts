/**
 * rulesServer — dynamically generates whistle native rules for
 * map_remote and map_local(file) from rules.yaml.
 *
 * These rule types use whistle's native URL-rewrite (https://) and
 * file-replace (rawfile://) mechanisms, which are more efficient than
 * handling them in the plugin. The rulesServer translates structured
 * rules from rules.yaml into whistle rule text.
 *
 * Only fires for requests matching the plugin's custom protocol:
 *   pattern whistle.pbmockx://
 *   pattern pbmockx://
 */

import { rules } from './ctx';

export default (server: any, options: any) => {
  server.on('request', (req: any, res: any) => {
    const fullUrl = req.originalReq?.fullUrl || '';

    // Generate whistle native rules from rules.yaml
    const whistleRules = rules.toWhistleRules();

    // Filter rules that match this URL
    const matching: string[] = [];
    for (const rule of whistleRules) {
      // Each rule is "pattern operation"
      // We pass all rules to whistle; it will match patterns itself
      matching.push(rule);
    }

    if (matching.length > 0) {
      res.end(matching.join('\n'));
    } else {
      res.end('');
    }
  });
};
