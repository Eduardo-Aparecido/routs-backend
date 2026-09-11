"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
let cachedApp;
async function createApp() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    app.enableCors({
        origin: config.get('CORS_ORIGIN') || 'http://localhost:5173',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    await app.init();
    return app;
}
async function bootstrap() {
    const app = await createApp();
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT') || 3000;
    await app.listen(port);
    console.log(`ROUTS API running at http://localhost:${port}`);
}
if (process.env.VERCEL) {
    module.exports = async (req, res) => {
        if (!cachedApp) {
            cachedApp = createApp();
        }
        const app = await cachedApp;
        const server = app.getHttpAdapter().getInstance();
        return server(req, res);
    };
}
else {
    bootstrap();
}
//# sourceMappingURL=main.js.map