# Request
对`fetch`简单封装，轻量快速

## Declare
```ts
 function createApis<K extends string>(
    prefix: string,
    config: Record<K, [Method, string]>
): Record<
    K,
    <T>(
        data?: Record<string, unknown> | unknown[] | BodyInit,
        options?: RequestInit
    ) => Promise<T>
>;

 function onBeforeRequest(callback: (options: RequestInit) => void): void;

 function onResponded(callback: (response: Response) => unknown): void;

 function onErrorCaptured(callback: (error: any) => unknown): void;
```

## Usage
```ts
import { createApis } from 'forget-api/request';

const apis = createApis('http://xxx.com/apis', {
    getUserInfo: ['GET', '/user/:id'],
    addUser: ['POST', '/user'],
});
await apis.getUserInfo({ id: '123' });
```


```ts
import { onBeforeRequest } from 'forget-api/request';

onBeforeRequest((options) => {
    options.headers = {
        Authorization: localStorage.getItem('token'),
    };
});
```
