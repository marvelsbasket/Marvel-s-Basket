import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { environmentValidationSchema } from './config/validation.schema';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './cache/redis.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './modules/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StoresModule } from './modules/stores/stores.module';
import { LocationsModule } from './modules/locations/locations.module';
import { CartModule } from './modules/cart/cart.module';
import { JwtAuthGuard, RolesGuard, PermissionsGuard } from './modules/auth/guards';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    RedisModule,
    EmailModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    CloudinaryModule,
    SellersModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    InventoryModule,
    StoresModule,
    LocationsModule,
    CartModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
