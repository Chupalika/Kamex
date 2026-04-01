import { Body, Controller, Get, Param, Post, Patch, ParseIntPipe, Request, UseGuards, Delete } from '@nestjs/common';

import { ScoresheetService } from './scoresheet.service';

@Controller('scoresheet')
export class ScoresheetController {
  constructor(private readonly scoresheetService: ScoresheetService) {}
}