# Forget API
无需封装 Axios，无需写接口请求函数，无需维护返回值类型，把这些琐碎重复的事情交给工具来处理，让精力聚焦在核心功能的实现上。


## Install
```shell
npm i -S forget-api
```

## Usage
以`NestJS`+`Vite`技术栈为例，假设目录结构如下：
```text
root/
 │
 ├─ backend/
 │   ├─ src/
 │       ├─ user.controller.ts
 │
 ├─ frontend/
     ├─ tsconfig.json
     ├─ vite.config.ts
     ├─ src/
         ├─ main.ts
```

在控制器中，利用`Mark`标记请求参数类型，通过`defineExpose`暴露 API 方法
```ts
// "backend/src/user.controller.ts"
import { defineExpose, Mark } from 'forget-api/nest';

@Controller('user')
export class UserController {
    @Get(':id')
    getUserInfo(@Param() params: Mark<{ id: string }>) {
        return { code: 200, data: { id: params.id } };
    }
}

export default defineExpose(UserController);
```

在`frontend/tsconfig.json`配置别名映射到后端目录
```json
{
    "compilerOptions": {
        "paths": {
            "@@api/*": ["../backend/src/*"]
        }
    },
}
```

在 Vite 中引入定制插件对别名进行解析
```ts
import { vitePluginForNest } from 'forget-api/nest/vite';

export default defineConfig({
    plugins: [
        vitePluginForNest({
            alias: '@@api',
            baseUrl: 'http://localhost:3000',
        })
    ],
});
```

在前端调用接口
```ts
// "frontend/src/main.ts"
import userApis from '@@api/user.controller';

await userApis.getUserInfo({ id: '123' });
// 发起请求：GET http://localhost:3000/user/123
```

> 借助于插件的转换，前端发起请求像是直接调用控制器的方法，使用相同的方法名、参数类型、返回值类型，类似于 RPC。


## Principle
1. 通过插件监听`@@api/`相关的模块导入，根据`tsconfig.json`配置将模块解析成正确的文件路径，并以**文本**的形式载入；
1. 将上述的文本解析成 TypeScript AST，查找导出的控制器类及其方法和装饰器，生成如下代码：
```ts
// "@@api/user.controller"
import { createApis } from 'forget-api/request';

export default createApis('/user', {
    getUserInfo: ['GET', '/:id'],
});
```
[forget-api/request](docs/request.md) 是对 fetch 的简单封装。

前后端示例代码见 <a href="https://github.com/ambit-tsai/forget-api-demo" target="_blank">forget-api-demo</a>。


## TODO
- 适配其它 Node 框架，如：Midway、Malagu、Daruk 等；
- 通过 YApi 生成接口信息；
- 通过 Swagger 生成接口信息；
