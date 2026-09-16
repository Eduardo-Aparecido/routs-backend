import { Controller, Get } from '@nestjs/common';

import { RestaurantService } from './restaurant.service';

@Controller('api/restaurants')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
  ) {}

  @Get()
  findAll() {
    return this.restaurantService.findAll();
  }
}