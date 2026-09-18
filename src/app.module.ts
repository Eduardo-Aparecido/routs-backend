import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { NewsModule } from './news/news.module';

import { CinemaModule } from './cinema/cinema.module';

import { RestaurantModule } from './restaurant/restaurant.module';

import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    NewsModule,

    CinemaModule,

    RestaurantModule,

    WeatherModule,
  ],
})
export class AppModule {}

