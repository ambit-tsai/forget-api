import path from 'node:path';
import { generateRoute } from '..';
import {
    Controller as RawController,
    ControllerOptions,
    Delete,
    Get,
    Head,
    Options,
    Patch,
    Post,
    Put,
} from '@nestjs/common';

export type Mark<T> = T & {
    [Symbol.unscopables]: unknown;
};

type InferRequestParams<T> = T extends [infer U, ...infer REST]
    ? U extends Mark<infer V>
        ? V & InferRequestParams<REST>
        : InferRequestParams<REST>
    : {};

type RequestParams<T, Params = InferRequestParams<T>> = [keyof Params] extends [
    never
]
    ? void
    : Params;

export function defineExpose<T>(Ctor: new (...args: any) => T): {
    [key in keyof T]: T[key] extends (...args: infer Args) => infer Result
        ? (
              data: RequestParams<Args> | BodyInit,
              options?: RequestInit
          ) => Result extends Promise<any> ? Result : Promise<Result>
        : never;
} {
    return null as any;
}

const PROCESSED = Symbol('Processed');

let methodDecoratorMap = {
    delete: Delete,
    get: Get,
    head: Head,
    options: Options,
    patch: Patch,
    post: Post,
    put: Put,
};
methodDecoratorMap = Object.assign(Object.create(null), methodDecoratorMap);

/**
 * @example ```@Controller(__filename)```
 */
export function Controller(): ClassDecorator;
export function Controller(prefix: string | string[]): ClassDecorator;
export function Controller(options: ControllerOptions): ClassDecorator;

export function Controller(this: any, filePath?: any) {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
        return Reflect.apply(RawController, this, arguments);
    }
    const prefix = generateRoute(filePath);
    const classDecorator = RawController(prefix);
    return function (this: any, Ctor: any) {
        if (!Ctor[PROCESSED]) {
            for (const [key, desc] of Object.entries(
                Object.getOwnPropertyDescriptors(Ctor.prototype)
            )) {
                const arr = key.replace(/([A-Z])/g, '-$1').split('-');
                const decorator = methodDecoratorMap[arr[0] as any as 'get'];
                if (!decorator) {
                    continue;
                }
                arr.shift(); // 首个元素为 HTTP 方法
                // TODO: 需要取出 metaData，判断 :id 等
                // console.log('[MK]', Reflect.getMetadataKeys(desc.value));
                // console.log('[MD]', Reflect.getMetadata('path', desc.value));
                Reflect.decorate(
                    [
                        decorator(arr.join('-').toLowerCase()),
                        Reflect.metadata('design:type', Function),
                        Reflect.metadata('design:paramtypes', []),
                        Reflect.metadata('design:returntype', void 0),
                    ],
                    Ctor.prototype,
                    key,
                    desc
                );
            }
            Ctor[PROCESSED] = true;
        }
        return Reflect.apply(classDecorator, this, arguments);
    };
}
