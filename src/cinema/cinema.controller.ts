import { Controller, Get } from '@nestjs/common';
import { CinemaService } from './cinema.service';

@Controller('api/cinema')
export class CinemaController {
  constructor(private readonly cinemaService: CinemaService) {}

  @Get()
  findAll() {
    return this.cinemaService.findAll();
  }
}