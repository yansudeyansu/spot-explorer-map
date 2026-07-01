import { Controller, Get, Query } from '@nestjs/common';
import { SpotsService } from './spots.service';
import { SearchSpotsDto } from './dto/search-spots.dto';

@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Get()
  findAll(@Query() query: SearchSpotsDto) {
    return this.spotsService.findAll(query);
  }
}
