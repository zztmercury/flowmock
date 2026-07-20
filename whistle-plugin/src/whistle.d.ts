/**
 * Whistle plugin API type definitions (minimal, practical).
 * Based on https://github.com/avwo/lack/blob/master/assets/ts/src/types/global.d.ts
 */

declare namespace Whistle {
  interface PluginOptions {
    readonly name: string;
    storage: {
      getProperty(key: string): any;
      setProperty(key: string, value: any): void;
    };
    sharedStorage: {
      setItem(key: string, value: any): void;
      getItem(key: string): any;
    };
    require(id: string): any;
    getRules(cb: (rules: any) => void): void;
    getValues(cb: (vals: any) => void): void;
  }

  interface PluginRequest extends NodeJS.ReadableStream {
    originalReq: {
      fullUrl: string;
      method: string;
      ruleValue: string;
      pipeValue: string;
      headers: Record<string, string>;
      [key: string]: any;
    };
    originalRes: {
      statusCode: number;
      headers: Record<string, string>;
      serverIp: string;
      [key: string]: any;
    };
    passThrough(): void;
    [key: string]: any;
  }

  interface PluginResponse extends NodeJS.WritableStream {
    end(data?: any): void;
    setHeader(name: string, value: string | string[]): void;
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    [key: string]: any;
  }

  interface PluginServer extends NodeJS.EventEmitter {
    on(event: 'request', listener: (req: PluginRequest, res: PluginResponse) => void): this;
    on(event: 'upgrade', listener: (req: PluginRequest, socket: any) => void): this;
    on(event: 'connect', listener: (req: PluginRequest, socket: any) => void): this;
  }
}

// Type definitions are ambient — no export needed, just `declare namespace Whistle`

