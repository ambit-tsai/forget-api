import { assign, entries, isPlainObject, noop } from 'lodash-es';

type Method = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT';
type RequestData = Record<string, unknown> | unknown[] | BodyInit;
type OnBeforeRequest = (options?: RequestInit) => void;
type OnResponded = (response: Response) => unknown;
type OnErrorCaptured = (error: any) => unknown;
type UrlSegment = string | { key: string };

export function createApis<K extends string>(
    prefix: string,
    config: Record<K, [Method, string]>
): Record<K, <T>(data?: RequestData, options?: RequestInit) => Promise<T>> {
    const apis: Record<string, () => any> = {};
    for (const [key, arr] of entries<string[]>(config)) {
        apis[key] = createRequest(arr[0], prefix + arr[1]);
    }
    return apis;
}

const METHODS_WITHOUT_BODY = ['GET', 'HEAD'];

const hooks: {
    beforeRequest: OnBeforeRequest;
    responded: OnResponded;
    errorCaptured: OnErrorCaptured;
} = {
    beforeRequest: noop,
    responded: (response) => response.json(),
    errorCaptured: (error) => {
        throw error;
    },
};

function createRequest(method: string, url: string) {
    const segments = splitUrl(url);
    return async (data?: RequestData, options: RequestInit = {}) => {
        if (!options.method) {
            options.method = method;
        }
        let body: BodyInit | undefined;
        if (isPlainObject(data)) {
            const obj = assign({}, data);
            url = concatUrlSegments(segments, obj);
            if (
                METHODS_WITHOUT_BODY.indexOf(options.method.toUpperCase()) ===
                -1
            ) {
                body = JSON.stringify(obj);
            } else {
                const query = entries(obj)
                    .map(([key, val]) => `${key}=${val}`)
                    .join('&');
                if (query) url += '?' + query;
            }
        } else {
            url = concatUrlSegments(segments);
            body = Array.isArray(data) ? JSON.stringify(data) : (data as any);
        }
        try {
            await hooks.beforeRequest(options);
            const response = await fetch(url, assign({ body }, options));
            return await hooks.responded(response);
        } catch (error) {
            return hooks.errorCaptured(error);
        }
    };
}

function splitUrl(url: string) {
    const segments: UrlSegment[] = [];
    for (const str of url.split(/(\/:[^/]+)/g)) {
        if (str.indexOf('/:')) {
            segments.push(str);
        } else {
            segments.push('/', { key: str.substring(2) });
        }
    }
    return segments;
}

function concatUrlSegments(
    segments: UrlSegment[],
    data: Record<string, any> = {}
) {
    let url = '';
    for (const segment of segments) {
        if (typeof segment === 'object') {
            url += data[segment.key] || '';
            delete data[segment.key];
        } else {
            url += segment;
        }
    }
    return url;
}

export function onBeforeRequest(callback: OnBeforeRequest) {
    hooks.beforeRequest = callback;
}
export function onResponded(callback: OnResponded) {
    hooks.responded = callback;
}
export function onErrorCaptured(callback: OnErrorCaptured) {
    hooks.errorCaptured = callback;
}
