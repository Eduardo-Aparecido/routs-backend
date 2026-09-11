import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('api/news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll(@Query('q') query?: string) {
    return this.newsService.findAll(query);
  }
}
