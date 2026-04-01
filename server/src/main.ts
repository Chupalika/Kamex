import { json, urlencoded } from 'express';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as session from 'express-session';
import * as passport from 'passport';
import * as fs from 'fs';
import { AppModule } from './app.module';

const MongoDBStore = require('connect-mongodb-session')(session);

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('./ssl/private.key.pem'),
    cert: fs.readFileSync('./ssl/domain.cert.pem'),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });
  const configService = app.get(ConfigService);
  const store = new MongoDBStore({
    uri: configService.get<string>('DEV_MONGO_SRV'),
    collection: 'sessions',
  });

  app.enableCors({ origin: ['http://localhost:4200', 'https://kamex.app:4200'], credentials: true });
  app.setGlobalPrefix('api');
  app.use(
    session({
      cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
      secret: configService.get<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: store,
      secure: true,
      sameSite: 'none',
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(json({ limit: "20mb" }));
  app.use(urlencoded({ limit: "20mb" }));

  await app.listen(3001, '0.0.0.0');
}
bootstrap();
