import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

@Controller('geocode')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('reverse')
  async reverse(
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
  ) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('lat and lng must be valid numbers');
    }
    const address = await this.geocodingService.reverseGeocode(lat, lng);
    return { address };
  }
}
