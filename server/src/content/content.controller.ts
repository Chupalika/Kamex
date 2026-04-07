import { Body, Controller, Get, Param, Post, Patch, ParseIntPipe, Request, UseGuards, Delete } from '@nestjs/common';
import { ContentService } from './content.service';
import { Page } from 'src/schemas/page.schema';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':name')
  async getPage(@Param('name') name: string): Promise<Page> {
    // console.log("getPage");
    return this.contentService.getPage(name);
  }
}