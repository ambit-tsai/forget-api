import path from 'node:path';

export function generateRoute(filePath: string, type = 'dist') {
    const pathProps = path.parse(filePath);
    const config = getRootConfig();
    const ctorName = pathProps.name.replace(config.suffix, '');
    const targetPath = pathProps.dir.endsWith(path.sep + ctorName)
        ? pathProps.dir
        : pathProps.dir + path.sep + ctorName;
    const routeRoot = path.resolve(
        getProjectRoot(),
        config[type === 'dist' ? 'routeDistRoot' : 'routeSrcRoot']
    );
    return '/' + path.relative(routeRoot, targetPath).replace(/\\/g, '/');
}

interface Config {
    root?: string;
    routeDistRoot: string;
    routeSrcRoot: string;
    alias: string;
    base: string;
    suffix: string;
}

const CONFIG_FILE_NAME = 'full-stack.json';

export function getRootConfig(): Config {
    const configPath = path.resolve(getProjectRoot(), CONFIG_FILE_NAME);
    return require(configPath);
}

export function getProjectRoot() {
    const config = getCurrentConfig();
    return config.root
        ? path.resolve(process.cwd(), config.root)
        : process.cwd();
}

function getCurrentConfig(): Config {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE_NAME);
    return require(configPath);
}
