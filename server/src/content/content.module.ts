import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentController } from 'src/content/content.controller';
import { ContentService } from 'src/content/content.service';
import { Page, PageSchema } from 'src/schemas/page.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Page.name, schema: PageSchema }
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}