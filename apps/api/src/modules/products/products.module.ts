import { Module, forwardRef } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { StoresModule } from '../stores/stores.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [CloudinaryModule, forwardRef(() => StoresModule)],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, AdminProductsService],
  exports: [ProductsService, AdminProductsService],
})
export class ProductsModule {}
