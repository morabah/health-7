declare module 'node-fetch' {
  export default function fetch(url: string | URL, init?: RequestInit): Promise<Response>;
  export class Response {
    status: number;
    ok: boolean;
    json<T = unknown>(): Promise<T>;
    text(): Promise<string>;
    headers: Headers;
  }
  export class Headers {
    forEach(callback: (value: string, name: string) => void): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
  }
  export class Request {
    constructor(input: string | Request, init?: RequestInit);
    url: string;
    method: string;
    headers: Headers;
    body: BodyInit | null;
  }
  export interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit;
    redirect?: RequestRedirect;
    signal?: AbortSignal;
    credentials?: RequestCredentials;
    mode?: RequestMode;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
  }
  export type HeadersInit = Headers | Record<string, string> | [string, string][];
  export type BodyInit =
    | ArrayBuffer
    | ArrayBufferView
    | NodeJS.ReadableStream
    | string
    | URLSearchParams;
  export type RequestRedirect = 'follow' | 'error' | 'manual';
  export type RequestCredentials = 'omit' | 'same-origin' | 'include';
  export type RequestMode = 'cors' | 'no-cors' | 'same-origin' | 'navigate';
  export type ReferrerPolicy =
    | ''
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'same-origin'
    | 'origin'
    | 'strict-origin'
    | 'origin-when-cross-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
}
